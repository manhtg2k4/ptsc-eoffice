"use client";
import React, { useState, useEffect, useMemo, useContext, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Heart,
  Eye,
  Calendar,
  ChevronDown,
  ArrowUpDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  Play,
  Search,
  Mic,
  Folder,
  Pencil,
  Trash2,
  Share2,
  Download,
  Link as LinkIcon,
  X,
  RotateCcw,
  RotateCw,
  Volume2,
  Maximize,
  Minimize,
  Pause,
  ArrowLeft 
  // Mail
} from "lucide-react";
import JSZip from "jszip";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import AuthVideo from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/AuthVideo';


const FacebookIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
// import { useRouter } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav";
import moment from "moment";
import "moment/locale/vi";
import { AuthContext } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/AuthProvider";
// eslint-disable-next-line no-restricted-imports
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { API_DON_VI, APP_BASE, API_FILES_VIEW, API_LIKE_VIDEO, API_LIKE_ALBUM } from "./EnvironmentFile/urlConfig";
// eslint-disable-next-line no-restricted-imports
import { fetchMediaGallery, updateAlbumStats, updateVideoStats, fetchMediaGalleryDetail, fetchAlbumDetail, fetchVideoDetail, updateAlbum, updateVideo, deleteVideos, deleteAlbums, fetchUserRoles } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import CustomDatePicker from "./common/CustomDatePicker";
import { toast } from "react-toastify";
import AuthModal from "./dialog/AuthModal";

import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";

moment.locale("vi");

export default function ResourceGridView() {
  const { user } = useContext(AuthContext);
  const { setActivePage } = useCMS();
  const dispatch = useDispatch();
  const { mediaGalleryList, totalMediaGallery, loading, currentMediaGalleryDetail, userRoleList } = useSelector((state) => state.news);
  const isAdmin = userRoleList?.roles?.some(
    (role) => role === "ADMIN_NEWS" || role === "NGUOI_PHE_DUYET"
  );
  // const router = useRouter();

  const [isGridView, setIsGridView] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [executedSearchQuery, setExecutedSearchQuery] = useState("");

  const parseDurationToSeconds = useCallback((duration) => {
    if (!duration) return 0;
    if (typeof duration === 'number') return Math.floor(duration);
    if (typeof duration === 'string') {
      if (!duration.includes(':')) return parseInt(duration) || 0;
      const parts = duration.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }, []);

  const processResource = useCallback((item) => {
    let thumb = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80";
    if (item.thumbnailFileId) thumb = `${API_FILES_VIEW}/${item.thumbnailFileId}?public=true`;
    else if (item.files?.[0]?.id) thumb = `${API_FILES_VIEW}/${item.files[0].id}?public=true`;
    else if (item.idfile) thumb = `${API_FILES_VIEW}/${item.idfile}?public=true`;
    else if (item.thumbnail_id) thumb = `${API_FILES_VIEW}/${item.thumbnail_id}?public=true`;
    else if (item.nameThumbnail) thumb = item.nameThumbnail.startsWith("http") ? item.nameThumbnail : `${APP_BASE}${item.nameThumbnail}`;
    else if (item.thumbnail) thumb = item.thumbnail.startsWith("http") ? item.thumbnail : `${APP_BASE}${item.thumbnail}`;

    let formattedDuration = "";
    if (item.type === "video") {
      formattedDuration = item.duration || "0:00";
      if (typeof item.duration === "number") {
        const m = Math.floor(item.duration / 60);
        const s = Math.floor(item.duration % 60);
        formattedDuration = `${m}:${s < 10 ? "0" : ""}${s}`;
      } else if (typeof item.duration === "string") {
        formattedDuration = item.duration;
      }
    } else if (item.type === "album" || item.type === "image") {
      const count = item.imageCount || item.images?.length || 0;
      formattedDuration = `${count} ảnh`;
    }

    const durationInSeconds = parseDurationToSeconds(item.duration);

    return {
      ...item,
      thumbnail: thumb,
      formattedDuration,
      durationInSeconds,
    };
  }, [parseDurationToSeconds]);
  
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [pageSize, setPageSize] = useState(9);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [sortOrder, setSortOrder] = useState("DESC");
  const [isListening, setIsListening] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showShareSubmenu, setShowShareSubmenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [unitSearch, setUnitSearch] = useState("");


  const handleSearch = useCallback(() => {
    setExecutedSearchQuery(searchQuery);
    setCurrentPage(1);
  }, [searchQuery]);

  const handleOpenModal = useCallback((item) => {
    setModalItem(item);
    setIsModalOpen(true);
    if (item.type !== "video") setCurrentImageIndex(0);
    dispatch(fetchMediaGalleryDetail({ id: item.id, type: item.type }));
  }, [dispatch]);

  // Handle deep linking from URL (id & type)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (id && type) {
      handleOpenModal({ id, type });
    }
  }, [handleOpenModal]);


  const handleToggleMenu = useCallback((e, itemId) => {
    e.stopPropagation();
    if (activeMenuId === itemId) {
      setActiveMenuId(null);
      setShowShareSubmenu(false);
    } else {
      setActiveMenuId(itemId);
      setShowShareSubmenu(false);
    }
  }, [activeMenuId]);

  const handleMenuView = useCallback(async (e, item) => {
    e.stopPropagation();
    let detailData = null;
    try {
      const result = await dispatch(fetchMediaGalleryDetail({ id: item.id, type: item.type })).unwrap();
      detailData = result?.data || result;
    } catch (error) {
      // ignore
    }
    const data = detailData ? { ...detailData, type: item.type } : item;
    const processed = processResource(data);
    setModalItem(processed);
    setIsModalOpen(true);
    if (item.type !== "video") setCurrentImageIndex(0);
    setActiveMenuId(null);
  }, [dispatch, processResource]);

  const handleDownload = useCallback(async (url, filename) => {
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, "_blank");
    }
  }, []);

  const handleDownloadResource = useCallback(async (item) => {
    let detailData = null;
    const toastId = toast.loading("Đang chuẩn bị tệp tin...");

    try {
      const result = await dispatch(fetchMediaGalleryDetail({ id: item.id, type: item.type })).unwrap();
      detailData = result?.data || result;
      const data = detailData || item;
      const processed = processResource(data);

      if (item.type === "video") {
        let downloadUrl = "";
        if (data.videoFileId) {
          downloadUrl = `${API_FILES_VIEW}/${data.videoFileId}?public=true`;
        } else if (data.videoUrl) {
          downloadUrl = data.videoUrl.startsWith("http") ? data.videoUrl : `${APP_BASE}${data.videoUrl.startsWith("/") ? "" : "/"}${data.videoUrl}`;
        } else if (data.path) {
          downloadUrl = data.path.startsWith("http") ? data.path : `${APP_BASE}${data.path.startsWith("/") ? "" : "/"}${data.path}`;
        } else if (data.idfile) {
          downloadUrl = `${API_FILES_VIEW}/${data.idfile}?public=true`;
        }

        if (downloadUrl) {
          toast.update(toastId, { render: "Đang tải tệp tin...", type: "info", isLoading: true });
          await handleDownload(downloadUrl, `video_${item.id}`);
          toast.update(toastId, { render: "Tải xuống thành công!", type: "success", isLoading: false, autoClose: 2000 });
        } else {
          toast.update(toastId, { render: "Không tìm thấy tệp tin để tải", type: "error", isLoading: false, autoClose: 3000 });
        }
      } else {
        // Xử lý tải Album/Ảnh (Có thể nhiều ảnh)
        const albumImages = data.images || data.files || [];
        
        if (albumImages.length > 1) {
          toast.update(toastId, { render: `Đang nén ${albumImages.length} ảnh...`, type: "info", isLoading: true });
          const zip = new JSZip();
          
          await Promise.all(
            albumImages.map(async (img, index) => {
              let url = "";
              let name = "";
              
              if (img.file_id) {
                url = `${API_FILES_VIEW}/${img.file_id}?public=true`;
                name = img.file_name || `image_${index + 1}`;
              } else if (img.id) {
                url = `${API_FILES_VIEW}/${img.id}?public=true`;
                name = img.name || img.originalName || `image_${index + 1}`;
              } else if (img.url) {
                url = img.url.startsWith('http') ? img.url : `${APP_BASE}${img.url}`;
                name = img.url.split('/').pop() || `image_${index + 1}`;
              } else if (img.filename) {
                url = `${APP_BASE}/upload/TCSG/album_images/${img.filename}`;
                name = img.filename;
              }

              if (url) {
                try {
                  const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
                  const blob = await res.blob();
                  // Đảm bảo có extension
                  if (!name.includes(".")) {
                    const mime = blob.type;
                    if (mime === "image/png") name += ".png";
                    else if (mime === "image/gif") name += ".gif";
                    else if (mime === "image/webp") name += ".webp";
                    else name += ".jpg";
                  }
                  zip.file(name, blob);
                } catch (e) {
                  // ignore
                }
              }
            })
          );
          
          const content = await zip.generateAsync({ type: "blob" });
          const zipName = `${item.title ? item.title.replace(/[/\\?%*:|"<>]/g, '-') : 'album'}.zip`;
          const blobUrl = window.URL.createObjectURL(content);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = zipName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          
          toast.update(toastId, { render: "Tải xuống thành công!", type: "success", isLoading: false, autoClose: 2000 });
        } else {
          // Chỉ có 1 ảnh
          let downloadUrl = processed.thumbnail;
          if (data.files?.[0]?.id) downloadUrl = `${API_FILES_VIEW}/${data.files[0].id}?public=true`;
          else if (albumImages[0]) {
            const img = albumImages[0];
             if (img.file_id) downloadUrl = `${API_FILES_VIEW}/${img.file_id}?public=true`;
             else if (img.id) downloadUrl = `${API_FILES_VIEW}/${img.id}?public=true`;
             else if (img.url) downloadUrl = img.url.startsWith('http') ? img.url : `${APP_BASE}${img.url}`;
          }

          if (downloadUrl) {
            toast.update(toastId, { render: "Đang tải tệp tin...", type: "info", isLoading: true });
            await handleDownload(downloadUrl, `image_${item.id}`);
            toast.update(toastId, { render: "Tải xuống thành công!", type: "success", isLoading: false, autoClose: 2000 });
          } else {
            toast.update(toastId, { render: "Không tìm thấy tệp tin để tải", type: "error", isLoading: false, autoClose: 3000 });
          }
        }
      }
    } catch (error) {
      toast.update(toastId, { render: "Có lỗi xảy ra khi chuẩn bị tệp tin", type: "error", isLoading: false, autoClose: 3000 });
    }
  }, [dispatch, processResource, handleDownload]);


  const handleMenuDownload = useCallback((e, item) => {
    e.stopPropagation();
    handleDownloadResource(item);
    setActiveMenuId(null);
  }, [handleDownloadResource]);

  const handleMenuEdit = useCallback(async (e, item) => {
    e.stopPropagation();
    const toastId = toast.loading("Đang tải dữ liệu...");
    try {
      let result = null;
      if (item.type === "video") {
        result = await dispatch(fetchVideoDetail(item.id)).unwrap();
      } else {
        result = await dispatch(fetchAlbumDetail(item.id)).unwrap();
      }
      const detailData = result?.data || result;
      setEditingItem({ ...(detailData || item), type: item.type });
      setEditTitle(detailData?.title || item.title || "");
      setIsEditModalOpen(true);
      toast.dismiss(toastId);
    } catch (error) {
      toast.update(toastId, { render: "Không thể lấy thông tin chi tiết", type: "error", isLoading: false, autoClose: 2000 });
    }
    setActiveMenuId(null);
  }, [dispatch]);

  const handleMenuDelete = useCallback((e, item) => {
    e.stopPropagation();
    setDeletingItem(item);
    setIsDeleteConfirmOpen(true);
    setActiveMenuId(null);
  }, []);

  const handleCopyLink = useCallback((e, item) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?id=${item.id}&type=${item.type}`;
    navigator.clipboard.writeText(url);
    toast.success("Đã sao chép liên kết!");
    setActiveMenuId(null);
  }, []);

  const handleShareFacebook = useCallback((e, item) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?id=${item.id}&type=${item.type}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    setActiveMenuId(null);
  }, []);

  // const handleShareZalo = useCallback((e, item) => {
  //   e.stopPropagation();
  //   const shareUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}?id=${item.id}`);
  //   window.open(`https://zalo.me/share?url=${shareUrl}`, "_blank");
  //   setActiveMenuId(null);
  // }, []);

  // const handleShareGmail = useCallback((e, item) => {
  //   e.stopPropagation();
  //   const shareUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
  //   const title = item.title || "";
  //   const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${encodeURIComponent(title)}&body=${encodeURIComponent(`Mình chia sẻ cho bạn bài viết này:\n${shareUrl}`)}`;
  //   window.open(gmailUrl, "_blank");
  //   setActiveMenuId(null);
  // }, []);


  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const [units, setUnits] = useState([]);
  const [itemLikes, setItemLikes] = useState({}); // Track likes: { itemId: { isLiked, count } }
  const formats = useMemo(() => [
    { id: "all", name: "Tất cả định dạng" },
    { id: "image", name: "Hình ảnh" },
    { id: "video", name: "Video" },
  ], []);

  useEffect(() => {
    dispatch(fetchUserRoles());
    const fetchUnits = async () => {
      // Only fetch units if user is logged in
      if (!user) return;

      try {
        const response = await axiosClient.get(API_DON_VI, { params: { limit: 100 } });
        if (response?.success) setUnits(response.data || []);
      } catch (err) {
        logger.error("Error fetching units:", err);
      }
    };
    fetchUnits();
  }, [user, dispatch]);

  useEffect(() => {
    const fetchResources = async () => {
      setLocalLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
      };

      const filter = {};

      if (executedSearchQuery.trim()) {
        filter.title = executedSearchQuery.trim();
      }

      if (selectedFormat !== "all") {
        filter.type = selectedFormat;
      }

      if (selectedUnit !== "all") {
        params['filter[department]'] = selectedUnit;
      }

      if (fromDate || toDate) {
        if (fromDate) params['filter[startDate]'] = fromDate;
        if (toDate) params['filter[endDate]'] = toDate;
      }

      params.sortBy = "createdAt";
      params.sortOrder = sortOrder;

      if (Object.keys(filter).length > 0) params.filter = filter;

      try {
        await dispatch(fetchMediaGallery(params)).unwrap();
      } finally {
        setLocalLoading(false);
        setIsInitialLoading(false);
      }
    };

    fetchResources();

    const handleClickOutside = (event) => {
      // 1. Menu hành động trên card
      if (!event.target.closest('.rgv-menu-container')) {
        setActiveMenuId(null);
        setShowShareSubmenu(false);
      }

      // 2. Các bộ lọc phía trên (Định dạng, Đơn vị, Thời gian)
      const filterItem = event.target.closest('.rgv-filter-item');

      if (!filterItem) {
        // Click hoàn toàn ra ngoài vùng lọc
        setShowFormatDropdown(false);
        setShowUnitDropdown(false);
        setShowFromPicker(false);
        setShowToPicker(false);
      } else {
        // Click vào 1 ô lọc -> Đóng các ô lọc KHÁC ô đang mở (ngoại trừ ô vừa nhấn)
        // Lưu ý: Logic toggle (đóng mở chính nó) đã có ở hàm onClick của JSX
        if (filterItem.classList.contains('timer')) {
          setShowFormatDropdown(false);
          setShowUnitDropdown(false);
        } else {
          setShowFromPicker(false);
          setShowToPicker(false);

          // Kiểm tra xem click vào container nào để đóng cái còn lại
          // (Chúng ta có thể check dựa trên con của iten đó)
          if (filterItem.contains(event.target)) {
            // Tìm xem đây là filter Định dạng hay Đơn vị
            // Một cách đơn giản là check nội dung text:
            const text = filterItem.textContent.toLowerCase();
            if (text.includes('đơn vị')) setShowFormatDropdown(false);
            if (text.includes('định dạng')) setShowUnitDropdown(false);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dispatch, executedSearchQuery, sortOrder, selectedFormat, selectedUnit, fromDate, toDate, currentPage, pageSize]);

  // Reset to page 1 when any filter changes to avoid empty results on high page numbers
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [executedSearchQuery, selectedFormat, selectedUnit, fromDate, toDate, sortOrder, pageSize]);

  // Reset to page 1 when any filter changes to avoid empty results on high page numbers
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [executedSearchQuery, selectedFormat, selectedUnit, fromDate, toDate, sortOrder, pageSize]);



  const handleCloseModal = () => {
    setIsModalOpen(false);
  };


  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Đang lắng nghe... Hãy nói từ khóa bạn muốn tìm.");
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast.error("Bạn cần cấp quyền truy cập Mic để sử dụng tính năng này.");
      } else {
        toast.error("Có lỗi xảy ra khi nhận diện giọng nói.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      toast.success(`Đã nhận diện: "${transcript}"`);
    };

    recognition.start();
  };

  const handleLikeMedia = useCallback(async (e, item) => {
    e?.stopPropagation();

    if (!user) {
      // toast.info("Vui lòng đăng nhập để thích nội dung");
      setShowAuthModal(true);
      return;
    }

    if (!item || !item.id) {
      toast.error("Không thể xác định nội dung để thích");
      return;
    }

    // Use original ID for state management (can be string or number)
    const itemId = item.id;

    const currentLikeState = itemLikes[itemId] || { isLiked: item.meLike || false, count: item.likeCount || item.totalLikes || 0 };

    // Calculate new state (toggle)
    const newIsLiked = !currentLikeState.isLiked;
    const newCount = newIsLiked ? currentLikeState.count + 1 : Math.max(0, currentLikeState.count - 1);

    // Optimistic update
    setItemLikes(prev => ({
      ...prev,
      [itemId]: { isLiked: newIsLiked, count: newCount }
    }));

    try {
      // Use correct API based on item type
      const apiUrl = item.type === 'video' ? API_LIKE_VIDEO : API_LIKE_ALBUM;

      // Convert ID to string for API (as required by backend)
      const idAsString = String(itemId);

      const payload = item.type === 'video'
        ? { videoId: idAsString, isLike: newIsLiked }
        : { albumId: idAsString, isLike: newIsLiked };

      await axiosClient.post(apiUrl, payload);

      // Update Redux state if needed (use original ID type)
      if (item.type === "video") {
        dispatch(updateVideoStats({
          videoId: itemId,
          meLike: newIsLiked,
          totalLikes: newCount
        }));
      } else {
        dispatch(updateAlbumStats({
          albumId: itemId,
          meLike: newIsLiked,
          totalLikes: newCount
        }));
      }
    } catch (error) {
      // Revert on error
      setItemLikes(prev => ({
        ...prev,
        [itemId]: currentLikeState
      }));
      toast.error("Không thể thực hiện thao tác. Vui lòng thử lại!");
    }
  }, [user, itemLikes, dispatch]);

  // Action wrappers mapped for grid interactions
  const onOpenModal = useCallback((item) => () => {
    handleOpenModal(item);
  }, [handleOpenModal]);

  const onToggleMenu = useCallback((itemId) => (e) => {
    handleToggleMenu(e, itemId);
  }, [handleToggleMenu]);

  const onStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const onMenuView = useCallback((item) => (e) => {
    handleMenuView(e, item);
  }, [handleMenuView]);

  const onMenuEdit = useCallback((item) => (e) => {
    handleMenuEdit(e, item);
  }, [handleMenuEdit]);

  const onMenuDelete = useCallback((item) => (e) => {
    handleMenuDelete(e, item);
  }, [handleMenuDelete]);

  const onCopyLink = useCallback((item) => (e) => {
    handleCopyLink(e, item);
  }, [handleCopyLink]);

  const onShareFacebook = useCallback((item) => (e) => {
    handleShareFacebook(e, item);
  }, [handleShareFacebook]);

  // const onShareZalo = useCallback((item) => (e) => {
  //   handleShareZalo(e, item);
  // }, [handleShareZalo]);

  // const onShareGmail = useCallback((item) => (e) => {
  //   handleShareGmail(e, item);
  // }, [handleShareGmail]);

  const onMenuDownload = useCallback((item) => (e) => {
    handleMenuDownload(e, item);
  }, [handleMenuDownload]);

  const onLikeMediaClick = useCallback((item) => (e) => {
    handleLikeMedia(e, item);
  }, [handleLikeMedia]);
  
  const onToggleShareSubmenu = useCallback((e) => {
    e.stopPropagation();
    setShowShareSubmenu(prev => !prev);
  }, []);

  const onShareSubmenuEnter = useCallback(() => {
    setShowShareSubmenu(true);
  }, []);

  const onShareSubmenuLeave = useCallback(() => {
    setShowShareSubmenu(false);
  }, []);

  const onPageSizeChange = useCallback((e) => {
    setPageSize(Number(e.target.value));
  }, []);

  const itemsPerPage = pageSize;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (modalItem) {
      const item = processResource(modalItem);
      if (item?.images?.length > 1) {
        if (isLeftSwipe) {
          setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
        } else if (isRightSwipe) {
          setCurrentImageIndex((prev) => (prev - 1 + item.images.length) % item.images.length);
        }
      }
    }
  };

  const handleToggleFormatDropdown = useCallback(() => setShowFormatDropdown(prev => !prev), []);
  const handleToggleUnitDropdown = useCallback(() => setShowUnitDropdown(prev => !prev), []);
  const handleSelectAllUnits = useCallback(() => { setSelectedUnit("all"); setShowUnitDropdown(false); }, []);

  const handleTimerClick = useCallback((e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      setShowFromPicker(prev => !prev);
      setShowToPicker(false);
    } else {
      setShowToPicker(prev => !prev);
      setShowFromPicker(false);
    }
  }, []);

  const handleClearDates = useCallback((e) => {
    e.stopPropagation();
    setFromDate("");
    setToDate("");
    setShowFromPicker(false);
    setShowToPicker(false);
  }, [setFromDate, setToDate]);

  const handleSelectFromDate = useCallback((val) => {
    if (toDate && moment(val, "YYYY-MM-DD").isAfter(moment(toDate, "YYYY-MM-DD"))) {
      toast.warning("Điều kiện lọc không hợp lệ. Vui lòng thử lại");
      return;
    }
    setFromDate(val);
    setShowFromPicker(false);
    setShowToPicker(true);
  }, [toDate]);

  const handleSelectToDate = useCallback((val) => {
    if (fromDate && moment(fromDate, "YYYY-MM-DD").isAfter(moment(val, "YYYY-MM-DD"))) {
      toast.warning("Điều kiện lọc không hợp lệ. Vui lòng thử lại");
      return;
    }
    setToDate(val);
    setShowToPicker(false);
  }, [fromDate]);

  const selectedFormatLabel = useMemo(() => {
    if (selectedFormat === "all") return "Loại định dạng";
    return formats.find(f => f.id === selectedFormat)?.name || "Loại định dạng";
  }, [selectedFormat, formats]);

  const selectedUnitLabel = useMemo(() => {
    if (selectedUnit === "all") return "Đơn vị";
    return units.find(u => u.id === selectedUnit)?.name || "Đơn vị";
  }, [selectedUnit, units]);

  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return units;
    const q = unitSearch.toLowerCase();
    return units.filter(u => (u.name || "").toLowerCase().includes(q));
  }, [units, unitSearch]);

  const resourceData = useMemo(() => {
    const raw = Array.isArray(mediaGalleryList) ? mediaGalleryList : [];
    return raw.map(item => processResource(item));
  }, [mediaGalleryList]);

  const totalItems = totalMediaGallery || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentItems = resourceData;

  const activeMediaData = useMemo(() => {
    if (!modalItem) return null;
    // Lấy dữ liệu chi tiết nếu ID khớp
    const detail = currentMediaGalleryDetail?.id === modalItem.id ? currentMediaGalleryDetail : null;
    const data = detail ? { ...detail, type: modalItem.type } : modalItem;

    // Logic lấy URL Video (Đồng bộ VideoDetailPage)
    let videoUrl = "";
    if (data.videoFileId) videoUrl = `${API_FILES_VIEW}/${data.videoFileId}?public=true`;
    else if (data.videoUrl) videoUrl = data.videoUrl.startsWith('http') ? data.videoUrl : `${APP_BASE}${data.videoUrl.startsWith('/') ? '' : '/'}${data.videoUrl}`;
    else if (data.path) videoUrl = data.path.startsWith('http') ? data.path : `${APP_BASE}${data.path.startsWith('/') ? '' : '/'}${data.path}`;

    // Logic lấy danh sách ảnh Album (Đồng bộ PhotoGalleryPage)
    let images = [];
    const rawImages = detail?.images || modalItem?.images || [];
    images = rawImages.map(img => {
      if (img.file_id) return `${API_FILES_VIEW}/${img.file_id}?public=true`;
      if (img.id) return `${API_FILES_VIEW}/${img.id}?public=true`;
      if (img.url) return img.url.startsWith('http') ? img.url : `${APP_BASE}${img.url}`;
      if (img.filename) return `${APP_BASE}/upload/TCSG/album_images/${img.filename}`;
      return "";
    }).filter(url => url !== "");

    return {
      ...data,
      videoUrl,
      images,
      thumbnail: detail?.thumbnail ? (detail.thumbnail.startsWith('http') ? detail.thumbnail : `${APP_BASE}${detail.thumbnail.startsWith('/') ? '' : '/'}${detail.thumbnail}`) : modalItem.thumbnail
    };
  }, [modalItem, currentMediaGalleryDetail]);


  // Auto-play for Album Gallery
  useEffect(() => {
    let interval;
    if (isModalOpen && modalItem && (modalItem.type === 'album' || modalItem.type === 'image')) {
      const imagesCount = activeMediaData?.images?.length || 0;
      if (imagesCount > 1) {
        interval = setInterval(() => {
          setCurrentImageIndex((prev) => (prev + 1) % imagesCount);
        }, 5000); // 5 seconds interval
      }
    }
    return () => clearInterval(interval);
  }, [isModalOpen, modalItem, activeMediaData]);





  const handlePageChange = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 400, behavior: 'smooth' }); // Scroll to top of list
    }
  }, [totalPages]);

  const onPrevImage = useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setCurrentImageIndex((prev) => {
      if (!activeMediaData?.images?.length) return prev;
      return (prev - 1 + activeMediaData.images.length) % activeMediaData.images.length;
    });
  }, [activeMediaData]);

  const onNextImage = useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setCurrentImageIndex((prev) => {
      if (!activeMediaData?.images?.length) return prev;
      return (prev + 1) % activeMediaData.images.length;
    });
  }, [activeMediaData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isModalOpen || !modalItem || modalItem.type === 'video') return;
      if (e.key === "ArrowLeft") {
        onPrevImage(e);
      } else if (e.key === "ArrowRight") {
        onNextImage(e);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, modalItem, onPrevImage, onNextImage]);

  const onImageDotClick = useCallback((idx) => (e) => {
    e.stopPropagation();
    setCurrentImageIndex(idx);
  }, []);

  const onPageClick = useCallback((page) => () => {
    if (typeof page === 'number') handlePageChange(page);
  }, [handlePageChange]);

  const onEditModalClose = useCallback(() => setIsEditModalOpen(false), []);
  const onDeleteConfirmClose = useCallback(() => setIsDeleteConfirmOpen(false), []);
  const onAuthModalClose = useCallback(() => setShowAuthModal(false), []);

  const onSaveEdit = useCallback(async () => {
    if (!editTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }

    const toastId = toast.loading("Đang cập nhật...");
    try {
      const updateData = { title: editTitle };

      if (editingItem?.type === 'video') {
        await dispatch(updateVideo({ id: editingItem.id, data: updateData })).unwrap();
      } else if (editingItem) {
        await dispatch(updateAlbum({ id: editingItem.id, data: updateData })).unwrap();
      }

      toast.update(toastId, { render: "Đã cập nhật tiêu đề thành công!", type: "success", isLoading: false, autoClose: 2000 });
      setIsEditModalOpen(false);
    } catch (error) {
      toast.update(toastId, { render: "Cập nhật thất bại", type: "error", isLoading: false, autoClose: 2000 });
    }
  }, [editTitle, editingItem, dispatch]);

  const onConfirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    const toastId = toast.loading("Đang xóa bản ghi...");
    try {
      const ids = [deletingItem.id];
      if (deletingItem.type === 'video') {
        await dispatch(deleteVideos(ids)).unwrap();
      } else {
        await dispatch(deleteAlbums(ids)).unwrap();
      }

      toast.update(toastId, { render: "Đã xóa bản ghi thành công!", type: "success", isLoading: false, autoClose: 2000 });
      setIsDeleteConfirmOpen(false);
    } catch (error) { 
      toast.update(toastId, { render: "Xóa thất bại", type: "error", isLoading: false, autoClose: 2000 });
    }
  }, [deletingItem, dispatch]);

  const onModalContentClick = useCallback((e) => {
    if (modalItem?.type === 'video') {
      e.stopPropagation();
    }
  }, [modalItem]);

  const onDownloadActiveMedia = useCallback(() => {
    handleDownloadResource(activeMediaData);
  }, [handleDownloadResource, activeMediaData]);

  const onEditTitleChange = useCallback((e) => {
    setEditTitle(e.target.value);
  }, []);

  const onUnitSearchChange = useCallback((e) => {
    setUnitSearch(e.target.value);
  }, []);

  const onClearUnitSearch = useCallback((e) => {
    e.stopPropagation();
    setUnitSearch("");
  }, []);

  const onFormatClick = useCallback((id) => (e) => {
    e.stopPropagation();
    setSelectedFormat(id);
    setShowFormatDropdown(false);
  }, []);

  const onUnitClick = useCallback((id) => (e) => {
    e.stopPropagation();
    setSelectedUnit(id);
    setShowUnitDropdown(false);
    setUnitSearch("");
  }, []);

  const renderPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const handleGoHome = useCallback(() => {
    setActivePage("/");
    window.history.pushState(null, "", "/");
    window.scrollTo(0, 0);
  }, [setActivePage]);
  const onBackClick = useCallback(() => {
    const state = window.history.state;
    if (state && state.fromUrl) {
      setActivePage(state.fromUrl);
      window.history.pushState(null, "", state.fromUrl);
      window.scrollTo(0, 0);
      return;
    }
    handleGoHome(); // Quay về trang chủ nếu không có lịch sử
  }, [setActivePage, handleGoHome]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter") handleSearch();
  }, [handleSearch]);

  const handleSortToggle = useCallback(() => {
    setSortOrder(prev => (prev === "DESC" ? "ASC" : "DESC"));
  }, []);

  const handleGridViewToggle = useCallback(() => setIsGridView(true), []);
  const handleListViewToggle = useCallback(() => setIsGridView(false), []);

  const micIconClassName = "rgv-mic-icon" + (isListening ? " listening" : "");
  const sortToggleClassName = "rgv-sort-toggle-btn" + (sortOrder === "ASC" ? " asc" : "");
  const gridViewBtnClassName = "rgv-view-btn" + (isGridView ? " active" : "");
  const listViewBtnClassName = "rgv-view-btn" + (!isGridView ? " active" : "");
  const gridContainerClassName = "rgv-grid " + (isGridView ? "grid" : "list");
  
  let modalOverlayClassName = "rgv-modal-overlay js-overlay-target";
  if (modalItem && (modalItem.type === "album" || modalItem.type === "image")) {
     modalOverlayClassName += " gallery-overlay";
  }
  
  let modalContentClassName = "rgv-modal-content";
  if (modalItem) {
     modalContentClassName += (modalItem.type === "album" || modalItem.type === "image") ? " gallery-mode" : " video-mode";
  }

  return (
    <div className="rgv-page">
      {/* 1. Hero Banner */}
      <div className="rgv-hero">
        <button
          className="nd-back-button-fixed"
          onClick={onBackClick}
          type="button"
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="rgv-hero-content">
          <div className="rgv-breadcrumb">
            <span onClick={handleGoHome}>Trang chủ</span>
            <span className="rgv-breadcrumb-arrow">
              <ChevronRight size={12} />
            </span>
            <span className="active">Thư viện truyền thông</span>
          </div>

          <div className="rgv-topic-header">
            <span className="rgv-folder-icon">
              <Folder size={24} />
            </span>
            <h1 className="rgv-topic-title">Thư viện truyền thông</h1>
          </div>

          <div className="rgv-search-bar-wrap">
            <div className="rgv-search-bar">
              <span className="rgv-search-icon" onClick={handleSearch}>
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Nhập sự kiện, tài liệu, từ khóa..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
              />
              <span
                className={micIconClassName}
                onClick={handleVoiceSearch}
              >
                <Mic size={18} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rgv-container">

        {/* Header Controls */}
        <div className="rgv-controls-header">
          {/* Row 1: Title and Filters */}
          <div className="rgv-header-row top">
            <h2 className="rgv-section-title">Tư liệu mới nhất</h2>

            <div className="rgv-filters">
              <div className="rgv-filter-item" onClick={handleToggleFormatDropdown}>
                <span>{selectedFormatLabel}</span>
                <ChevronDown size={14} />
                {showFormatDropdown && (
                  <div className="rgv-dropdown-menu">
                    {formats.map(f => (
                      <div key={f.id} className="rgv-dropdown-item" onClick={onFormatClick(f.id)}>
                        {f.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rgv-filter-item" onClick={handleToggleUnitDropdown}>
                <span>{selectedUnitLabel}</span>
                <ChevronDown size={14} />
                {showUnitDropdown && (
                  <div className="rgv-dropdown-menu">
                    <div className="rgv-dropdown-search" onClick={onStopPropagation}>
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Tìm đơn vị..."
                        value={unitSearch}
                        onChange={onUnitSearchChange}
                        autoFocus
                      />
                      {unitSearch && (
                        <button className="rgv-search-clear" onClick={onClearUnitSearch}>
                          &times;
                        </button>
                      )}
                    </div>
                    <div className="rgv-dropdown-item" onClick={handleSelectAllUnits}>Tất cả đơn vị</div>
                    <div className="rgv-dropdown-scrollable">
                      {filteredUnits.length > 0 ? (
                        filteredUnits.map(u => (
                          <div key={u.id} className="rgv-dropdown-item" title={u.name} onClick={onUnitClick(u.id)}>
                            {u.name}
                          </div>
                        ))
                      ) : (
                        <div className="rgv-dropdown-no-results">Không tìm thấy đơn vị</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rgv-filter-item timer" style={{ position: "relative", minWidth: "180px" }}>
                <div
                  className="rgv-timer-pill"
                  onClick={handleTimerClick}
                  style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center" }}
                >
                  <span style={{ fontSize: "13px" }}>
                    {(fromDate || toDate) ? (
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {fromDate ? moment(fromDate).format("DD/MM/YYYY") : "Từ"}
                        <span style={{ opacity: 0.5, margin: "0 4px" }}>-</span>
                        {toDate ? moment(toDate).format("DD/MM/YYYY") : "Đến"}
                      </span>
                    ) : (
                      "Thời gian"
                    )}
                  </span>

                  {(fromDate || toDate) ? (
                    <span
                      className="rgv-clear-date"
                      onClick={handleClearDates}
                    >
                      &times;
                    </span>
                  ) : (
                    <Calendar size={14} />
                  )}
                </div>

                {showFromPicker && (
                  <div className="rgv-date-dropdown from">
                    <div className="rgv-date-header">Từ ngày</div>
                    <CustomDatePicker
                      value={fromDate}
                      onChange={handleSelectFromDate}
                    />
                  </div>
                )}

                {showToPicker && (
                  <div className="rgv-date-dropdown to">
                    <div className="rgv-date-header">Đến ngày</div>
                    <CustomDatePicker
                      value={toDate}
                      onChange={handleSelectToDate}
                    />
                  </div>
                )}
              </div>

              <button
                className={sortToggleClassName}
                onClick={handleSortToggle}
              >
                <ArrowUpDown size={16} />
              </button>
            </div>
          </div>

          {/* Row 2: Stats and View Toggle */}
          <div className="rgv-header-row bottom">
            <div className="rgv-stats-info">
              Hiển thị:
              <div className="rgv-limit-box">
                <select
                  className="rgv-select-limit"
                  value={pageSize}
                  onChange={onPageSizeChange}
                >
                  <option value={9}>9</option>
                  <option value={18}>18</option>
                </select>
                <span className="rgv-select-chevron">
                  <ChevronDown size={12} />
                </span>
              </div>
              <span className="rgv-total-text">/ {totalItems} tư liệu</span>
            </div>

            <div className="rgv-view-toggles">
              <button
                className={gridViewBtnClassName}
                onClick={handleGridViewToggle}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                className={listViewBtnClassName}
                onClick={handleListViewToggle}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Grid Content */}
        <div className={gridContainerClassName}>
          {loading || localLoading || isInitialLoading ? (
            Array(pageSize)
              .fill(0)
              .map((_, i) => (
                <div key={`skeleton-${i}`} className="rgv-card skeleton-box">
                  <div className="skeleton rgv-skeleton-img"></div>
                  <div className="rgv-card-body">
                    <div className="skeleton rgv-skeleton-line" style={{ width: "40%" }}></div>
                    <div className="skeleton rgv-skeleton-line"></div>
                    <div className="skeleton rgv-skeleton-line" style={{ width: "80%" }}></div>
                  </div>
                </div>
              ))
          ) : currentItems.length > 0 ? (
            currentItems.map((item) => {
              const cardClassName = activeMenuId === item.id ? "rgv-card active-menu" : "rgv-card";
              const moreBtnClassName = activeMenuId === item.id ? "rgv-card-more-btn active" : "rgv-card-more-btn";

              return (
                <div key={item.id} className={cardClassName} onClick={onOpenModal(item)} style={{ cursor: "pointer" }}>
                  <div className="rgv-card-media">
                    {/* More Button (Top Right) - Moved to top for visibility */}
                    <div className="rgv-menu-container">
                      <button className={moreBtnClassName} onClick={onToggleMenu(item.id)}>
                        <span style={{ color: "white", display: "flex", alignItems: "center" }}>
                          <MoreVertical size={18} />
                        </span>
                      </button>

                    {activeMenuId === item.id && (
                      <div className="rgv-action-menu" onClick={onStopPropagation}>
                        <div className="rgv-menu-item" onClick={onMenuView(item)}>
                          <span style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                            <Eye size={16} />
                          </span>
                          <span>Xem</span>
                        </div>
                        {isAdmin && (
                          <>
                            <div className="rgv-menu-item" onClick={onMenuEdit(item)}>
                              <span style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                                <Pencil size={16} />
                              </span>
                              <span>Chỉnh sửa</span>
                            </div>
                            <div className="rgv-menu-item" onClick={onMenuDelete(item)}>
                              <span style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                                <Trash2 size={16} />
                              </span>
                              <span>Xóa</span>
                            </div>
                          </>
                        )}
                        <div className="rgv-menu-divider"></div>
                        <div
                          className="rgv-menu-item has-submenu"
                          onMouseEnter={onShareSubmenuEnter}
                          onMouseLeave={onShareSubmenuLeave}
                          onClick={onToggleShareSubmenu}
                        >
                          <div className="rgv-menu-item-left">
                            <span style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                              <Share2 size={16} />
                            </span>
                            <span>Chia sẻ</span>
                          </div>
                          <span>
                            <ChevronRight size={14} />
                          </span>

                          {showShareSubmenu && (
                            <div className="rgv-share-submenu" onClick={onStopPropagation}>
                              <div className="rgv-menu-item" onClick={onCopyLink(item)}>
                                <span style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                                  <LinkIcon size={16} />
                                </span>
                                <span>Sao chép URL</span>
                              </div>
                              <div className="rgv-menu-item" onClick={onShareFacebook(item)}>
                                <span style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                                  <FacebookIcon size={16} />
                                </span>
                                <span>Facebook</span>
                              </div>
                              {/* <div className="rgv-menu-item" onClick={onShareZalo(item)}>
                                <span style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                                  <AuthImage src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" width="16" alt="Zalo" />
                                </span>
                                <span>Zalo</span>
                              </div> */}
                              {/* <div className="rgv-menu-item" onClick={onShareGmail(item)}>
                                <span style={{ marginRight: "10px", display: "flex", alignItems: "center", color: "#EA4335" }}>
                                  <Mail size={16} />
                                </span>
                                <span>Gmail</span>
                              </div> */}
                            </div>
                          )}
                        </div>
                        <div className="rgv-menu-item" onClick={onMenuDownload(item)}>
                          <span style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                            <Download size={16} />
                          </span>
                          <span>{item.type === "video" ? "Tải video" : ((item.imageCount || item.images?.length || 0) > 1 ? "Tải ảnh" : "Tải ảnh")}</span>

                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rgv-img-wrapper">
                    <AuthImage src={item.thumbnail} alt={item.title} customClassName="rgv-card-img" />
                  </div>

                  {/* Overlay Icon (Bottom Left) */}
                  <div className="rgv-media-type-icon">
                    {item.type === 'video' ? (
                      <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.5411 10.1708L15.8848 9.5042L15.8842 9.50391L15.5411 10.1708ZM9.56231 7.09441L9.21903 7.76124L9.21916 7.76131L9.56231 7.09441ZM7.95819 8.11481H8.70819L8.70819 8.11429L7.95819 8.11481ZM7.95819 13.9256L8.70819 13.9261V13.9256H7.95819ZM9.56231 14.946L9.21916 14.2791L9.21903 14.2791L9.56231 14.946ZM15.5411 11.8696L15.8842 12.5365L15.8848 12.5362L15.5411 11.8696ZM15.5411 10.1708L15.8842 9.50391L9.90547 6.42752L9.56231 7.09441L9.21916 7.76131L15.1979 10.8377L15.5411 10.1708ZM9.56231 7.09441L9.9056 6.42759C9.62068 6.28091 9.30262 6.21102 8.98202 6.22584L9.01665 6.97504L9.05128 7.72424C9.10829 7.7216 9.16591 7.73389 9.21903 7.76124L9.56231 7.09441ZM9.01665 6.97504L8.98202 6.22584C8.66143 6.24066 8.35126 6.33958 8.08105 6.51146L8.48359 7.14428L8.88613 7.7771C8.93742 7.74447 8.99425 7.72687 9.05128 7.72424L9.01665 6.97504ZM8.48359 7.14428L8.08105 6.51146C7.81099 6.68325 7.59053 6.92166 7.43866 7.20221L8.09822 7.55926L8.75777 7.91631C8.78982 7.85711 8.83469 7.80982 8.88613 7.7771L8.48359 7.14428ZM8.09822 7.55926L7.43866 7.20221C7.28685 7.48264 7.20797 7.79689 7.20819 8.11533L7.95819 8.11481L8.70819 8.11429C8.70814 8.04385 8.72567 7.97562 8.75777 7.91631L8.09822 7.55926ZM7.95819 8.11481H7.20819V13.9256H7.95819H8.70819V8.11481H7.95819ZM7.95819 13.9256L7.20819 13.925C7.20797 14.2435 7.28685 14.5577 7.43866 14.8382L8.09822 14.4811L8.75777 14.1241C8.72567 14.0647 8.70814 13.9965 8.70819 13.9261L7.95819 13.9256ZM8.09822 14.4811L7.43866 14.8382C7.59053 15.1187 7.81099 15.3571 8.08105 15.5289L8.48359 14.8961L8.88613 14.2633C8.83469 14.2305 8.78982 14.1833 8.75777 14.1241L8.09822 14.4811ZM8.48359 14.8961L8.08105 15.5289C8.35126 15.7008 8.66143 15.7997 8.98202 15.8145L9.01665 15.0653L9.05128 14.3161C8.99425 14.3135 8.93742 14.2959 8.88613 14.2633L8.48359 14.8961ZM9.01665 15.0653L8.98202 15.8145C9.30263 15.8294 9.62069 15.7594 9.9056 15.6128L9.56231 14.946L9.21903 14.2791C9.1659 14.3065 9.10829 14.3188 9.05128 14.3161L9.01665 15.0653ZM9.56231 14.946L9.90547 15.6128L15.8842 12.5365L15.5411 11.8696L15.1979 11.2027L9.21916 14.2791L9.56231 14.946ZM15.5411 11.8696L15.8848 12.5362C16.1639 12.3923 16.3955 12.1729 16.5562 11.9052L15.9131 11.5193L15.27 11.1334C15.2506 11.1657 15.2247 11.1889 15.1974 11.203L15.5411 11.8696ZM15.9131 11.5193L16.5562 11.9052C16.7167 11.6377 16.8008 11.3313 16.8008 11.0202H16.0508H15.3008C15.3008 11.0616 15.2895 11.1009 15.27 11.1334L15.9131 11.5193ZM16.0508 11.0202H16.8008C16.8008 10.709 16.7167 10.4027 16.5562 10.1352L15.9131 10.5211L15.27 10.907C15.2895 10.9395 15.3008 10.9787 15.3008 11.0202H16.0508ZM15.9131 10.5211L16.5562 10.1352C16.3955 9.86748 16.1639 9.6481 15.8848 9.5042L15.5411 10.1708L15.1974 10.8374C15.2247 10.8515 15.2506 10.8747 15.27 10.907L15.9131 10.5211ZM20.6029 11.0202H19.8529C19.8529 15.6341 16.1126 19.3743 11.4987 19.3743V20.1243V20.8743C16.941 20.8743 21.3529 16.4625 21.3529 11.0202H20.6029ZM11.4987 20.1243V19.3743C6.88482 19.3743 3.14453 15.6341 3.14453 11.0202H2.39453H1.64453C1.64453 16.4625 6.05639 20.8743 11.4987 20.8743V20.1243ZM2.39453 11.0202H3.14453C3.14453 6.4063 6.88482 2.66602 11.4987 2.66602V1.91602V1.16602C6.05639 1.16602 1.64453 5.57788 1.64453 11.0202H2.39453ZM11.4987 1.91602V2.66602C16.1126 2.66602 19.8529 6.4063 19.8529 11.0202H20.6029H21.3529C21.3529 5.57788 16.941 1.16602 11.4987 1.16602V1.91602Z" fill="white" />
                      </svg>
                    ) : (
                      <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.30495 15.1423C4.58226 14.9293 6.61613 14.8756 8.71738 15.3635M8.71738 15.3635C11.11 15.918 13.589 17.1744 15.1404 19.6944M8.71738 15.3635C10.4927 13.3078 13.8275 11.5007 19.6924 11.5007H20.6029M20.6029 11.5007C20.6029 16.5287 16.5268 20.6048 11.4987 20.6048C6.47061 20.6048 2.39453 16.5287 2.39453 11.5007C2.39453 6.47256 6.47061 2.39648 11.4987 2.39648C16.5268 2.39648 20.6029 6.47256 20.6029 11.5007ZM8.31224 6.94857C7.85703 6.94857 6.94661 7.22169 6.94661 8.31419C6.94661 9.40669 7.85703 9.67982 8.31224 9.67982C8.76745 9.67982 9.67787 9.40669 9.67787 8.31419C9.67787 7.22169 8.76745 6.94857 8.31224 6.94857Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Duration Badge (Bottom Right) - Only for Video */}
                  {item.type === 'video' && (
                    <div className="rgv-media-badge">
                      {item.formattedDuration}
                    </div>
                  )}
                  </div>

                  <div className="rgv-card-body">
                    <div className="rgv-card-top">
                      <div className="rgv-dept-logo">
                        <AuthImage src="/logoTCLogin.png" alt="Logo" customClassName="rgv-dept-img" />
                      </div>
                      <h3 className="rgv-card-title">{item.title}</h3>
                    </div>

                    <div className="rgv-card-info">
                      <span className="rgv-dept-name">{item.department || "Phòng Chính trị"}</span>
                      <span className="rgv-type-count">{(item.type === "image" || item.type === "album") ? `${item.imageCount || item.images?.length || 0} ảnh` : ""}</span>
                    </div>

                    <div className="rgv-card-footer">
                      <span className="rgv-date">
                        {(() => {
                          const dateVal = item.createdAt || item.created_at;
                          const m = moment(dateVal, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]);
                          return m.isValid() ? m.format("DD/MM/YYYY") : "29/01/2026";
                        })()}
                      </span>
                      <div className="rgv-stats">
                        <div className="rgv-stat">
                          <Eye size={14} />
                          <span>{item.views || 0}</span>
                        </div>
                        <div
                          className="rgv-stat rgv-stat-clickable"
                          onClick={onLikeMediaClick(item)}
                          style={{ cursor: "pointer", color: (itemLikes[item.id] ? itemLikes[item.id].isLiked : item.meLike) ? "#ef4444" : "currentColor" }}
                        >
                          <Heart
                            size={14}
                            fill={(itemLikes[item.id] ? itemLikes[item.id].isLiked : item.meLike) ? "#ef4444" : "none"}
                          />
                          <span style={{ marginLeft: "4px" }}>{itemLikes[item.id]?.count ?? item.totalLikes ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rgv-empty-state">
              <p>Không tìm thấy tư liệu nào</p>
            </div>
          )}
        </div>

        {/* -------------------- MODALS -------------------- */}
        {isModalOpen && modalItem && (
          <div
            className={modalOverlayClassName}
            onClick={handleCloseModal}
          >
            <div
              className={modalContentClassName}
              onClick={onModalContentClick}
            >
              {modalItem.type !== 'video' && (
                <button className="rgv-modal-close" onClick={handleCloseModal}>
                  <X size={24} />
                </button>
              )}

              {modalItem.type === 'video' ? (
                <InternalResourceVideoPlayer
                  item={activeMediaData}
                  videoUrl={activeMediaData?.videoUrl || ""}
                  isLiked={(itemLikes[modalItem?.id] ? itemLikes[modalItem?.id].isLiked : modalItem?.meLike)}
                  onClose={handleCloseModal}
                  onLike={handleLikeMedia}
                  onDownload={onDownloadActiveMedia}
                />
              ) : (
                <div className="rgv-gallery-modal-wrap">
                  <div
                    className="rgv-gallery-stage"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    {/* Previous Image - Only show if we have more than 1 image */}
                    {
                      activeMediaData?.images?.length > 1 && (
                        <div
                          className="rgv-gallery-card side left"
                          onClick={onPrevImage}
                        >
                          <AuthImage key={`prev-${currentImageIndex}`}
                            src={activeMediaData.images[(currentImageIndex - 1 + activeMediaData.images.length) % activeMediaData.images.length]}
                            alt="prev"
                            customClassName="rgv-gallery-img smooth-transition"
                          />
                          <div className="rgv-gallery-overlay-dim"></div>
                        </div>
                      )
                    }

                    {/* Main Image (Center) */}
                    <div className="rgv-gallery-card main" onClick={onStopPropagation}>
                      <AuthImage key={`main-${currentImageIndex}`}
                        src={activeMediaData?.images?.[currentImageIndex] || activeMediaData?.thumbnail}
                        alt="gallery"
                        customClassName="rgv-gallery-img smooth-transition"
                      />
                      <div className="rgv-gallery-info-gradient">
                        <div className="rgv-gallery-text-content">
                          <div className="rgv-gallery-meta">
                            <span>Tác giả: {activeMediaData?.author || "Tạ Minh Duy"}</span>
                            <span className="dot">•</span>
                            <span>{activeMediaData?.departmentName || activeMediaData?.department || "Phòng Chính trị TCT"}</span>
                          </div>
                          <h2 className="rgv-gallery-title">{activeMediaData?.title}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Next Image - Only show if we have more than 1 image */}
                    {activeMediaData?.images?.length > 1 && (
                      <div
                        className="rgv-gallery-card side right"
                        onClick={onNextImage}
                      >
                        <AuthImage key={`next-${currentImageIndex}`}
                          src={activeMediaData.images[(currentImageIndex + 1) % activeMediaData.images.length]}
                          alt="next"
                          customClassName="rgv-gallery-img smooth-transition"
                        />
                        <div className="rgv-gallery-overlay-dim"></div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    {activeMediaData?.images?.length > 1 && (
                      <>
                        <button
                          className="rgv-nav-btn prev-btn"
                          onClick={onPrevImage}
                        >
                          <ChevronLeft size={36} />
                        </button>
                        <button
                          className="rgv-nav-btn next-btn"
                          onClick={onNextImage}
                        >
                          <ChevronRight size={36} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="rgv-gallery-dots">
                    {activeMediaData?.images?.length > 0 ? (
                      activeMediaData.images.map((_, idx) => {
                        const dotClassName = "rgv-g-dot" + (idx === currentImageIndex ? " active" : "");
                        return (
                          <div
                            key={idx}
                            className={dotClassName}
                            onClick={onImageDotClick(idx)}
                          ></div>
                        );
                      })
                    ) : (
                      <div className="rgv-g-dot active"></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
        }

        {/* Pagination */}
        {
          
            <div className="rgv-pagination">
              <button className="rgv-pg-arrow" onClick={onPageClick(1)} disabled={currentPage === 1}>
                <ChevronsLeft size={16} />
              </button>
              <button className="rgv-pg-arrow" onClick={onPageClick(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft size={16} />
              </button>

              {renderPageNumbers().map((p, i) => {
                let pageClassName = "rgv-pg-num";
                if (p === currentPage) pageClassName += " active";
                if (p === "...") pageClassName += " dots";
                
                return (
                  <button
                    key={i}
                    className={pageClassName}
                    onClick={onPageClick(p)}
                    disabled={p === '...'}
                  >
                    {p}
                  </button>
                );
              })}

              <button className="rgv-pg-arrow" onClick={onPageClick(currentPage + 1)} disabled={currentPage === totalPages}>
                <ChevronRight size={16} />
              </button>
              <button className="rgv-pg-arrow" onClick={onPageClick(totalPages)} disabled={currentPage === totalPages}>
                <ChevronsRight size={16} />
              </button>
            </div>
          
        }

      </div >

      {/* Edit Title Modal */}
      {
        isEditModalOpen && (
          <div className="rgv-modal-overlay active" onClick={onEditModalClose}>
            <div className="rgv-edit-popup" onClick={onStopPropagation}>
              <div className="rgv-edit-header">
                <h3>Chỉnh sửa tiêu đề</h3>
                <button 
                  className="rgv-close-mini" 
                  onClick={onEditModalClose}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="rgv-edit-body">
                <label>Tiêu đề bản ghi</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={onEditTitleChange}
                  placeholder="Nhập tiêu đề mới..."
                  autoFocus
                />
              </div>
              <div className="rgv-edit-footer">
                <button className="rgv-btn-cancel" onClick={onEditModalClose}>Hủy bỏ</button>
                <button className="rgv-btn-save" onClick={onSaveEdit}>Lưu thay đổi</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        isDeleteConfirmOpen && (
          <div className="rgv-modal-overlay active" onClick={onDeleteConfirmClose}>
            <div className="rgv-delete-popup" onClick={onStopPropagation}>
              <div className="rgv-delete-icon">
                <span style={{ color: "#ef4444" }}>
                  <Trash2 size={32} />
                </span>
              </div>
              <h3>Xác nhận xóa bản ghi?</h3>
              <p>Bạn có chắc chắn muốn xóa bản ghi &ldquo;{deletingItem?.title}&rdquo;? Hành động này không thể hoàn tác.</p>
              <div className="rgv-delete-actions">
                <button className="rgv-btn-cancel" onClick={onDeleteConfirmClose}>Quay lại</button>
                <button className="rgv-btn-confirm-delete" onClick={onConfirmDelete}>Xác nhận xóa</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={onAuthModalClose}
      />

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        /* Skeleton Loading Styles */
        .skeleton {
          background: #eee;
          background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
          border-radius: 4px;
          background-size: 200% 100%;
          animation: shimmer 1.5s linear infinite;
        }

        .rgv-skeleton-img {
          aspect-ratio: 16/10;
          border-radius: 28px 28px 0 0;
        }

        .rgv-skeleton-line {
          height: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        @keyframes shimmer {
          to {
            background-position-x: -200%;
          }
        }

        .rgv-page {
          background: transparent;
          width: 100%;
          min-height: 100vh;
          font-family: 'Be Vietnam Pro', sans-serif;
        }

        /* Hero Styles */
        .rgv-hero {
          background: url('/anhtrongdong.png') no-repeat center center;
          background-size: cover;
          padding: 40px 20px 60px 20px;
          text-align: center;
          position: relative;
        }
        .rgv-hero-content {
          max-width: 1200px;
          margin: 0 auto;
        }
        .rgv-breadcrumb {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
          color: #64748b;
          margin-bottom: 16px;
        }
        .rgv-breadcrumb span { cursor: pointer; transition: color 0.2s; }
        .rgv-breadcrumb .active { color: #3b82f6; font-weight: 500; cursor: default; }

        .rgv-topic-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .rgv-folder-icon { 
          color: #3b82f6; 
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rgv-topic-title {
          font-size: 26px;
          font-weight: 400;
          color: #3b82f6;
          margin: 0;
          line-height: 1;
        }

        .rgv-search-bar-wrap {
          display: flex;
          justify-content: center;
        }
        .rgv-search-bar {
          background: white;
          border-radius: 40px;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          width: 500px;
        }
        .rgv-search-bar input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 14px;
          color: #64748b;
        }
        .rgv-search-icon, .rgv-mic-icon { 
          color: #3b82f6; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        }

        .rgv-container {
          max-width: 1550px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .rgv-controls-header {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 40px;
        }
        .rgv-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .rgv-section-title {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .rgv-filters {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .rgv-filter-item {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
          cursor: pointer;
          position: relative;
        }
        .rgv-dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          min-width: 240px;
          max-height: 350px;
          overflow-y: auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          margin-top: 8px;
          z-index: 1000;
          border: 1px solid #f1f5f9;
        }
        .rgv-dropdown-menu::-webkit-scrollbar { width: 4px; }
        .rgv-dropdown-menu::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .rgv-dropdown-item {
          padding: 10px 16px;
          font-size: 13px;
        }
        .rgv-dropdown-item:hover { background: #f8fafc; color: #3b82f6; }

        .rgv-timer-pill {
          display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center;
        }
        .rgv-clear-date {
          font-size: 18px; color: #94a3b8; cursor: pointer; line-height: 1; margin-left: 4px; font-weight: 400;
        }
        .rgv-clear-date:hover { color: #ef4444; }
        .rgv-date-dropdown {
          position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%);
          background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          z-index: 1000; border: 1px solid #f1f5f9; min-width: 280px;
          overflow: hidden;
          animation: rgvFadeIn 0.2s ease-out;
        }
        .rgv-date-header {
          background: #3b82f6; color: white; padding: 8px 16px; font-size: 12px;
          font-weight: 700; text-align: center;
        }
        @keyframes rgvFadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        .rgv-sort-toggle-btn {
          background: white;
          border: 1px solid #e2e8f0;
          color: #64748b;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .rgv-sort-toggle-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .rgv-sort-toggle-btn.asc { 
          background: #3b82f6; 
          color: white; 
          border-color: #3b82f6; 
          transform: rotate(180deg); 
        }

        .rgv-stats-info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #64748b;
        }
        .rgv-limit-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .rgv-select-limit {
          appearance: none;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 4px 28px 4px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
          outline: none;
          cursor: pointer;
        }
        .rgv-select-chevron {
          position: absolute;
          right: 10px;
          pointer-events: none;
          color: #64748b;
        }
        .rgv-total-text { color: #64748b; }

        .rgv-view-toggles {
          display: flex;
          background: #f1f5f9;
          padding: 2px;
          border-radius: 8px;
        }
        .rgv-view-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: #3b82f6;
          border-radius: 6px;
          cursor: pointer;
        }
        .rgv-view-btn.active {
          background: white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        /* Grid Layout */
        .rgv-grid.grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .rgv-grid.list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .rgv-grid.list .rgv-card {
          flex-direction: row;
          align-items: stretch;
          height: 180px;
        }

        .rgv-grid.list .rgv-card-media {
          width: 280px;
          height: 100%;
          border-radius: 20px;
          flex-shrink: 0;
        }

        .rgv-grid.list .rgv-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 20px 32px;
        }

        /* Card Styles */
        .rgv-card {
          background: white;
          border-radius: 28px;
          overflow: hidden; /* Default clipping */
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          transition: transform 0.3s, box-shadow 0.3s;
          border: 1px solid rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .rgv-card.active-menu {
          z-index: 100;
          overflow: visible; /* Allow menu to overflow card */
        }

        .rgv-card-media {
          position: relative;
          aspect-ratio: 16/10;
          overflow: visible; /* Changed from hidden to show menu */
          cursor: pointer;
        }
        .rgv-img-wrapper {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          overflow: hidden; /* This clips the image zoom only */
          border-radius: 28px 28px 0 0;
          z-index: 1;
        }
        .rgv-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .rgv-media-type-icon {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 48px;
          height: 28px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          border-radius: 0 16px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 10;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .rgv-media-type-icon :global(svg) {
          width: 16px;
          height: 16px;
        }

        .rgv-card:hover .rgv-media-type-icon {
          width: 60px;
          background: #3b82f6;
          backdrop-filter: none;
        }
        .rgv-media-badge {
          position: absolute;
          bottom: 15px;
          right: 15px;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          color: white;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          z-index: 10;
        }
        .rgv-card-more-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.4);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
          color: white;
          opacity: 0;
          visibility: hidden;
          transform: scale(0.8);
        }
        .rgv-card:hover .rgv-card-more-btn, .rgv-card-more-btn.active {
          opacity: 1;
          visibility: visible;
          transform: scale(1);
        }
        .rgv-card-more-btn:hover, .rgv-card-more-btn.active {
          background: rgba(0, 0, 0, 0.6);
          transform: scale(1.1) !important;
        }

        .rgv-menu-container { position: relative; }
        .rgv-action-menu {
          position: absolute;
          top: 55px;
          right: 15px;
          width: 180px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          padding: 8px;
          z-index: 1000;
          border: 1px solid #f1f5f9;
        }
        .rgv-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 14px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .rgv-menu-item:hover {
          background: #f8fafc;
          color: #3b82f6;
        }
        .rgv-menu-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 6px 8px;
        }
        .rgv-menu-item.has-submenu {
          justify-content: space-between;
        }
        .rgv-menu-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rgv-share-submenu {
          position: absolute;
          top: 0;
          right: 100%;
          width: 180px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          padding: 8px;
          margin-right: 10px;
          z-index: 1001;
          border: 1px solid #f1f5f9;
        }
        .rgv-share-submenu::after {
          content: "";
          position: absolute;
          top: 0;
          right: -15px;
          width: 15px;
          height: 100%;
          background: transparent;
        }

        .rgv-card-body {
          padding: 24px;
        }
        .rgv-card-top {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .rgv-dept-logo {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rgv-dept-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .rgv-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.3s ease;
        }
        .rgv-card:hover .rgv-card-title {
          color: #3b82f6;
        }

        .rgv-card-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: #94a3b8;
          padding-left: 36px;
        }

        .rgv-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f8fafc;
          padding-top: 16px;
          font-size: 12px;
          color: #94a3b8;
          padding-left: 36px;
        }
        .rgv-stats {
          display: flex;
          gap: 16px;
        }
        .rgv-stat {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rgv-stat-clickable {
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .rgv-stat-clickable:hover {
          transform: scale(1.1);
          opacity: 0.8;
        }


        /* Pagination */
        .rgv-pagination {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-top: 60px;
        }
        .rgv-pg-num {
          min-width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rgv-pg-num.active {
          background: #3b82f6;
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        .rgv-pg-arrow {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
        }
        .rgv-pg-arrow:hover { color: #3b82f6; }

        /* Skeleton Card Styles */
        .skeleton-card {
          pointer-events: none;
          cursor: default;
        }
        .skeleton-card:hover {
          transform: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        /* Empty State Styles */
        .rgv-empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
          font-size: 15px;
        }
        .rgv-empty-state p {
          margin: 0;
        }

        @media (max-width: 1024px) {
          .rgv-grid.grid { grid-template-columns: repeat(2, 1fr); }
          .rgv-search-bar { width: 100%; max-width: 500px; }
        }

       @media (max-width: 768px) {
          .rgv-container { padding: 20px 16px; }
          .rgv-hero { padding: 30px 16px 40px; }
          .rgv-topic-title { font-size: 22px; }
          .rgv-search-bar { width: 100%; }
          
          .rgv-controls-header { gap: 16px; margin-bottom: 24px; }
          .rgv-header-row.top { flex-direction: column; align-items: flex-start; gap: 16px; }
          .rgv-filters { width: 100%; flex-wrap: wrap; gap: 8px; }
          .rgv-filter-item { flex: 1; min-width: 110px; justify-content: center; padding: 6px 12px; height: 38px; font-size: 12px; }
          .rgv-sort-toggle-btn { width: 38px; height: 38px; }

          .rgv-header-row.bottom { flex-wrap: wrap; gap: 12px; }
          
          /* List Mode on Mobile */
          .rgv-grid.list .rgv-card {
            flex-direction: row;
            height: auto;
            min-height: 100px;
            border-radius: 12px;
          }
          .rgv-grid.list .rgv-card-media {
            width: 100px; height: 100px; border-radius: 10px; margin: 8px;
          }
          .rgv-grid.list .rgv-card-body { padding: 8px 12px 8px 0; }
          .rgv-grid.list .rgv-card-title { font-size: 13px; -webkit-line-clamp: 2; }
          .rgv-grid.list .rgv-card-info { display: none; }
          .rgv-grid.list .rgv-date { font-size: 11px; }
          .rgv-grid.list .rgv-stat :global(svg) { width: 12px; height: 12px; }
          .rgv-grid.list .rgv-stat span { font-size: 10px; }

          .rgv-media-type-icon { width: 24px; height: 24px; bottom: 8px; left: 8px; }
          .rgv-media-type-icon :global(svg) { width: 14px; height: 14px; }
          .rgv-media-badge { bottom: 8px; right: 8px; padding: 2px 6px; font-size: 9px; }
        }

        @media (max-width: 480px) {
          .rgv-grid.grid { grid-template-columns: 1fr; }
          .rgv-filters { display: grid; grid-template-columns: 1fr 1fr; }
          .rgv-filter-item.timer { grid-column: span 2; }
          .rgv-sort-toggle-btn { grid-column: span 2; width: 100%; border-radius: 40px; }
          
          /* Dropdown alignment on mobile grid */
          .rgv-filters .rgv-filter-item:nth-child(odd) .rgv-dropdown-menu {
            left: 0;
            right: auto;
          }
          .rgv-filters .rgv-filter-item:nth-child(even) .rgv-dropdown-menu {
            left: auto;
            right: 0;
          }
          /* Ensure date picker also aligns correctly */
          .rgv-datepicker-container {
            right: 0;
            left: auto;
            width: 100vw;
            max-width: 330px;
          }
          
          .rgv-topic-title { font-size: 20px; }
          .rgv-section-title { font-size: 18px; }
          
          /* Pagination on small mobile */
          .rgv-pg-num { min-width: 32px; height: 32px; font-size: 12px; }
          .rgv-pg-arrow { width: 32px; height: 32px; }
        }

        /* Modals */
        .rgv-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          backdrop-filter: blur(8px);
          background: rgba(0, 0, 0, 0.7);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        .rgv-modal-content {
          position: relative;
          width: 95%;
          max-width: 1100px;
          border-radius: 32px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        .rgv-modal-close {
          position: absolute;
          top: 24px;
          right: 24px;
          background: #000000;
          border: none;
          color: white;
          width: 44px; height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 100;
          transition: all 0.2s;
        }
        .rgv-modal-close:hover { background: #000000; transform: rotate(90deg); }

        .rgv-modal-content.video-mode {
          max-width: 1200px;
        }

        /* Video Modal Styles */
        .rgv-video-modal-wrap { position: relative; aspect-ratio: 16/9; background: #000; }
        .rgv-video-header {
          position: absolute;
          top: 0; left: 0; right: 0;
          padding: 30px 40px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
          z-index: 2;
        }
        .rgv-video-title-text {
          color: white;
          font-size: 20px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .rgv-video-player-main {
          width: 100%; height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rgv-video-bg-placeholder {
          width: 100%; height: 100%;
          object-fit: cover;
          opacity: 0.6;
        }
        .rgv-video-tag {
          width: 100%;
          object-fit: contain;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
        }
        .rgv-video-center-btns {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 30px;
          z-index: 3;
        }
        .rgv-v-circle-btn {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border: none;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .rgv-v-circle-btn.large { width: 84px; height: 84px; background: rgba(255,255,255,0.25); }
        .rgv-v-circle-btn.small { width: 56px; height: 56px; color: rgba(255,255,255,0.9); }
        .rgv-v-circle-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); }

        .rgv-video-volume-side {
          position: absolute;
          left: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          z-index: 3;
        }
        .rgv-v-slider-vert {
          width: 20px; /* Increased hit area */
          height: 140px;
          background: transparent;
          position: relative;
          cursor: pointer;
          display: flex;
          justify-content: center;
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
          background: #3b82f6;
          color: white;
          transform: translateX(-5px); /* Hiệu ứng nhích nhẹ sang trái khi hover */
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.25);
        }
        @media (max-width: 1200px) {
          .nd-back-button-fixed {
            left: 20px; /* Thu hẹp khoảng cách khi màn hình nhỏ đi */
          }
        }
        .rgv-v-slider-track {
          width: 6px;
          height: 100%;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }
        .rgv-v-slider-fill {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: white;
          border-radius: 10px;
        }

        .rgv-video-bottom-bar {
          position: absolute;
          bottom: 30px; 
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 800px;
          display: flex;
          align-items: center;
          gap: 20px;
          backdrop-filter: blur(20px);
          background: rgba(255,255,255,0.1);
          padding: 14px 28px;
          border-radius: 50px;
          border: 1px solid rgba(255,255,255,0.15);
          z-index: 3;
        }
        .rgv-v-time { color: white; font-size: 13px; font-weight: 500; min-width: 45px; opacity: 0.9; }
        .rgv-v-progress-wrap { 
          flex: 1; 
          position: relative; 
          height: 24px; /* Increased hit area height */
          display: flex;
          align-items: center;
          cursor: pointer; 
        }
        .rgv-v-progress-rail { width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; position: relative; overflow: hidden; }
        .rgv-v-progress-active { height: 100%; background: #3b82f6; border-radius: 3px; }
        .rgv-v-progress-knob {
          position: absolute;
          top: 50%; width: 16px; height: 16px;
          background: white; border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 10px rgba(0,0,0,0.4);
          pointer-events: none; /* Let events pass to wrapper */
        }
        .rgv-v-actions { display: flex; align-items: center; gap: 20px; color: white; }
        .rgv-v-actions :global(svg) { cursor: pointer; opacity: 0.8; transition: all 0.2s; }
        .rgv-v-actions :global(svg:hover) { opacity: 1; transform: scale(1.1); }

        .rgv-modal-more-wrap { position: relative; display: flex; align-items: center; }
        .rgv-modal-options-menu {
          position: absolute;
          bottom: 100%;
          right: 0;
          background: white;
          border-radius: 12px;
          padding: 8px;
          min-width: 140px;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.2);
          margin-bottom: 15px;
          z-index: 10;
        }
        .rgv-opt-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          color: #475569;
          font-size: 13px;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .rgv-opt-item:hover { background: #f1f5f9; color: #3b82f6; }

        /* Gallery Modal Styles */
        .rgv-gallery-modal-wrap { position: relative}
        .rgv-gallery-main { position: relative; aspect-ratio: 16/10; display: flex; align-items: center; justify-content: center; }
        .rgv-gallery-img { width: 100%; height: 100%; object-fit: contain; }
        .rgv-gallery-info-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 50px 60px;
          background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
          color: white;
          z-index: 2;
        }
        .rgv-gallery-author { font-size: 15px; opacity: 0.7; margin-bottom: 12px; font-weight: 500; }
        .rgv-gallery-title { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
        .rgv-gallery-dots {
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 30px;
        }
        .rgv-g-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .rgv-g-dot.active {
          background: #3b82f6;
          width: 32px;
          border-radius: 10px;
        }

        @media (max-width: 768px) {
          .nd-back-button-fixed {
            top: 15px;
            left: 15px;
            width: 36px;
            height: 36px;
          }
          .rgv-modal-overlay { padding: 0; background: rgba(0,0,0,0.95); }
          .rgv-modal-content { border-radius: 0; height: 100%; display: flex; flex-direction: column; justify-content: center; background: transparent; }
          .rgv-video-modal-wrap { width: 100vw; height: auto; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; }
          .rgv-video-player-main { height: 100%; width: 100%; }
          .rgv-video-tag { height: 100%; width: 100%; object-fit: contain; z-index: 1; }
          .rgv-gallery-modal-wrap { width: 100vw; }
          .rgv-gallery-main { width: 100vw; height: auto; aspect-ratio: 1/1; min-height: 300px; background: #000; }
          .rgv-gallery-img { object-fit: contain; }
          .rgv-video-bottom-bar { left: 50%; padding: 10px 12px; bottom: 10px; gap: 8px; width: 85%; transform: translateX(-50%); z-index: 100; }
          .rgv-v-circle-btn.large { width: 56px; height: 56px; }
          .rgv-v-circle-btn.small { display: none; }
          .rgv-video-volume-side { display: none; }
          .rgv-video-title-text { font-size: 14px; padding-right: 30px; line-height: 1.4; color: #fff; }
          .rgv-video-header { padding: 15px; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); }
          .rgv-gallery-info-overlay { padding: 20px 15px; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); }
          .rgv-gallery-title { font-size: 18px; margin-top: 5px; }
          .rgv-gallery-author { font-size: 13px; margin-bottom: 5px; }
          .rgv-modal-close { top: 10px; right: 10px; width: 32px; height: 32px; background: rgba(0,0,0,0.5); border-radius: 50%; z-index: 100; }
          .rgv-v-time { font-size: 11px; }
          .rgv-gallery-dots { padding: 20px; }
        }

        /* Edit & Delete Popup Styles */
        .rgv-edit-popup, .rgv-delete-popup {
          background: white;
          width: 90%;
          max-width: 450px;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          animation: rgvFadeSlide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes rgvFadeSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        .rgv-edit-header { padding: 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .rgv-edit-header h3 { margin: 0; font-size: 18px; color: #1e293b; font-weight: 600; }
        .rgv-close-mini { background: none; border: none; cursor: pointer; color: #94a3b8; }
        
        .rgv-edit-body { padding: 24px; }
        .rgv-edit-body label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #64748b; }
        .rgv-edit-body input { 
          width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; 
          font-size: 15px; transition: all 0.2s; outline: none;
        }
        .rgv-edit-body input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        
        .rgv-edit-footer, .rgv-delete-actions { padding: 16px 24px; background: #f8fafc; border-radius: 0 0 16px 16px; display: flex; justify-content: flex-end; gap: 12px; }
        
        .rgv-btn-cancel { padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748b; background: white; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
        .rgv-btn-cancel:hover { background: #f1f5f9; }
        
        .rgv-btn-save, .rgv-btn-confirm-delete { 
          padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 500; color: white; border: none; cursor: pointer; transition: all 0.2s; 
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .rgv-btn-save { background: #3b82f6; }
        .rgv-btn-save:hover { background: #2563eb; transform: translateY(-1px); }
        .rgv-btn-confirm-delete { background: #ef4444; }
        .rgv-btn-confirm-delete:hover { background: #dc2626; transform: translateY(-1px); }
        
        .rgv-delete-popup { padding: 32px 24px 0; text-align: center; }
        .rgv-delete-icon { width: 64px; height: 64px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .rgv-delete-popup h3 { margin: 0 0 12px; font-size: 20px; color: #0f172a; }
        .rgv-delete-popup p { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 24px; padding: 0 10px; }
        .rgv-delete-actions { background: none; padding-bottom: 24px; justify-content: center; }
        /* Gallery Mode - Transparent Modal */
        .rgv-modal-content.gallery-mode {
          background: transparent;
          box-shadow: none;
          max-width: 100vw;
          width: 100%;
          height: 100%;
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rgv-gallery-modal-wrap {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .rgv-gallery-stage {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px; /* Responsive gap */
          width: 100%;
          height: 75vh;
          perspective: 1200px;
        }

        .rgv-gallery-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          cursor: pointer;
          background: #252525;
          flex-shrink: 0;
        }

        .rgv-gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rgv-gallery-img.smooth-transition {
          animation: rgvFadeScale 0.4s ease-out;
        }
        @keyframes rgvFadeScale {
          from { opacity: 0; transform: scale(1.03); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Side Cards (Prev/Next) */
        .rgv-gallery-card.side {
          width: 250px;
          height: 200px;
          opacity: 0.8;
          z-index: 10;
          transform: scale(0.9);
          filter: grayscale(100%) brightness(0.6);
        }
        .rgv-gallery-card.side:hover {
           filter: grayscale(50%) brightness(0.8);
           transform: scale(0.95);
        }
        .rgv-gallery-text-content {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .rgv-gallery-overlay-dim {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          transition: background 0.3s;
        }

        /* Main Card */
        .rgv-gallery-card.main {
          width: 70%;
          max-width: 1200px;
          height: 80vh;
          z-index: 20;
          transform: scale(1);
          cursor: default;
          box-shadow: 0 35px 70px -15px rgba(0, 0, 0, 0.7);
        }

        .rgv-gallery-info-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(28, 27, 27, 0.5); /* #1C1B1B 30% */
          // border-top: 1px solid rgba(28, 27, 27, 0.3); /* Border styling */
          backdrop-filter: blur(0px); /* Optional: improved visibility */
          padding: 30px 40px;
          color: white;
          text-align: left;
        }

        .rgv-gallery-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          opacity: 0.9;
          font-weight: 500;
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        .rgv-gallery-meta .dot { font-weight: bold; font-size: 16px; line-height: 0; margin-top: -2px; }

        .rgv-gallery-title {
          font-size: 26px;
          font-weight: 700;
          margin: 0;
          line-height: 1.3;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .rgv-gallery-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          width: fit-content;
          transition: opacity 0.2s;
        }
        .rgv-gallery-actions:hover { opacity: 0.8; }

        .rgv-gallery-dots {
          margin-top: 16px;
          display: flex;
          gap: 8px;
        }
        .rgv-g-dot {
          width: 8px; height: 8px; background: rgba(255,255,255,0.8); border-radius: 50%;
          cursor: pointer; transition: all 0.3s;
        }
        .rgv-g-dot.active {
          width: 32px; background: #3b82f6; border-radius: 4px;
        }
        
        /* Navigation Buttons */
        .rgv-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100;
        }
        .rgv-nav-btn:hover {
          background: #3b82f6;
          border-color: #3b82f6;
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
        }
        .rgv-nav-btn.prev-btn {
          left: 10px;
        }
        .rgv-nav-btn.next-btn {
          right: 10px;
        }

        @media (max-width: 1400px) {
           .rgv-gallery-card.side { width: 200px; height: 160px; }
           .rgv-nav-btn { width: 44px; height: 44px; }
           .rgv-nav-btn.prev-btn { left: 5px; }
           .rgv-nav-btn.next-btn { right: 5px; }
        }

        @media (max-width: 1024px) {
           .rgv-gallery-card.side { display: none; }
           .rgv-gallery-card.main { width: 90%; height: 60vh; }
        }

        /* Gallery Overlay Background - Gray Style */
        .rgv-modal-overlay.gallery-overlay {
          backdrop-filter: none; /* Remove blur if needed for solid look, or keep it */
        }
        .rgv-dropdown-search {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .rgv-dropdown-search svg {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .rgv-dropdown-search input {
          border: none;
          background: transparent;
          width: 100%;
          outline: none;
          font-size: 14px;
          color: #1e293b;
          padding: 4px 0;
          font-family: inherit;
        }

        .rgv-search-clear {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          cursor: pointer;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .rgv-search-clear:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .rgv-dropdown-scrollable {
          max-height: 320px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #e2e8f0 transparent;
        }

        .rgv-dropdown-scrollable::-webkit-scrollbar {
          width: 5px;
        }

        .rgv-dropdown-scrollable::-webkit-scrollbar-track {
          background: transparent;
        }

        .rgv-dropdown-scrollable::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }

        .rgv-dropdown-no-results {
          padding: 24px 16px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
          font-style: italic;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

      `}</style>
    </div >
  );
}
/**
 * @param {{ item: any, videoUrl: string, onClose: Function, isLiked: boolean, onLike: Function, onDownload: Function }} props
 */
const InternalResourceVideoPlayer = ({ item, videoUrl, onClose, isLiked, onLike, onDownload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showModalMoreMenu, setShowModalMoreMenu] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const videoRef = useRef(null);
  const progressWrapRef = useRef(null);
  const volumeWrapRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isDraggingVolumeRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const videoDurationRef = useRef(0);
  const dragTargetTimeRef = useRef(null);
  const hasDragTargetRef = useRef(false);

  const parseDurationToSeconds = useCallback((duration) => {
    if (!duration) return 0;
    if (typeof duration === "number") return Math.floor(duration);
    if (typeof duration === "string") {
      if (!duration.includes(":")) return parseInt(duration, 10) || 0;
      const parts = duration.split(":").map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }, []);

  const formatVideoTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  }, []);

  const toggleFullscreen = useCallback((e) => {
    e?.stopPropagation();
    const elem = document.querySelector(".rgv-video-player-main");
    if (!document.fullscreenElement) {
      if (elem?.requestFullscreen) elem.requestFullscreen();
      else if (elem?.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }, []);

  const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);

  const handleLikeAction = useCallback((e) => {
    if (onLike) onLike(e, item);
  }, [onLike, item]);

  const handleTogglePlay = useCallback((e) => {
    e?.stopPropagation();
    setIsPlaying(prev => !prev);
  }, []);

  const handleBackward = useCallback((e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 15);
      videoRef.current.currentTime = newTime;
      setVideoTime(Math.floor(newTime));
    }
  }, []);

  const handleForward = useCallback((e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const duration = videoRef.current.duration || videoDuration;
      if (duration) {
        const newTime = Math.min(duration, videoRef.current.currentTime + 15);
        videoRef.current.currentTime = newTime;
        setVideoTime(Math.floor(newTime));
      }
    }
  }, [videoDuration]);

  const handleVolumeToggle = useCallback(() => {
    setVideoVolume(prev => (prev === 0 ? 60 : 0));
  }, []);

  const handleVolumeMouseDown = useCallback((e) => {
    e.stopPropagation();
    isDraggingVolumeRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const val = 100 - ((e.clientY - rect.top) / rect.height * 100);
    setVideoVolume(Math.min(100, Math.max(0, val)));
  }, []);

  const handleProgressPointerDown = useCallback((e) => {
    e.stopPropagation();
    // Use standard preventDefault if cancelable
    if (e.cancelable) e.preventDefault();
    isDraggingRef.current = true;

    if (videoRef.current) {
      wasPlayingRef.current = !videoRef.current.paused;
      videoRef.current.pause();
      setIsPlaying(false);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const duration = videoDurationRef.current || videoRef.current?.duration || 0;
    if (duration > 0) {
      const newTime = Math.floor(pct * duration);
      if (videoRef.current) videoRef.current.currentTime = newTime;
      setVideoTime(newTime);
      dragTargetTimeRef.current = newTime;
      hasDragTargetRef.current = true;
    }
  }, []);

  const handleMoreMenuToggle = useCallback((e) => {
    e.stopPropagation();
    setShowModalMoreMenu(prev => !prev);
  }, []);

  const handleDownloadAction = useCallback((e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
    } else if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.target = "_blank";
      a.download = item?.title ? `${item.title}.mp4` : "video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang bắt đầu tải xuống...");
    }
    setShowModalMoreMenu(false);
  }, [onDownload, videoUrl, item]);

  const handleCopyLink = useCallback((e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success("Đã sao chép liên kết chia sẻ"))
      .catch(() => toast.error("Lỗi khi sao chép liên kết"));
    setShowModalMoreMenu(false);
  }, []);

  // const handleShareGmail = useCallback((e) => {
  //   e.stopPropagation();
  //   const title = item?.title || "";
  //   const url = window.location.href;
  //   const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${encodeURIComponent(title)}&body=${encodeURIComponent(`Mình chia sẻ cho bạn bài viết này:\n${url}`)}`;
  //   window.open(gmailUrl, "_blank");
  //   setShowModalMoreMenu(false);
  // }, [item]);

  useEffect(() => {
    const dur = parseDurationToSeconds(item?.duration) || item?.durationInSeconds || 0;
    if (dur > 0) {
      setVideoDuration(dur);
      videoDurationRef.current = dur;
    }
    setIsPlaying(true);
  }, [item, parseDurationToSeconds]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = videoVolume / 100;
  }, [videoVolume]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => setIsPlaying(false));
      else videoRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleMove = (e) => {
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (isDraggingRef.current && progressWrapRef.current && videoRef.current) {
        const rect = progressWrapRef.current.getBoundingClientRect();
        if (rect.width === 0) return;
        const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const duration = videoDurationRef.current || videoRef.current.duration;

        if (duration && !isNaN(duration) && duration > 0 && duration !== Infinity) {
          const newTime = Math.floor(pct * duration);
          dragTargetTimeRef.current = newTime;
          hasDragTargetRef.current = true;
          setVideoTime(newTime);
        }
      } else if (isDraggingVolumeRef.current && volumeWrapRef.current) {
        const rect = volumeWrapRef.current.getBoundingClientRect();
        const val = 100 - ((clientY - rect.top) / rect.height * 100);
        setVideoVolume(Math.min(100, Math.max(0, val)));
      }
    };

    const handleUp = () => {
      if (isDraggingRef.current && videoRef.current) {
        if (hasDragTargetRef.current && dragTargetTimeRef.current !== null) {
          const t = dragTargetTimeRef.current;
          if (Number.isFinite(t) && t >= 0) videoRef.current.currentTime = t;
        }
        setIsPlaying(wasPlayingRef.current);
      }
      isDraggingRef.current = false;
      isDraggingVolumeRef.current = false;
      hasDragTargetRef.current = false;
      dragTargetTimeRef.current = null;
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  const lastTimeUpdateRef = useRef(0);
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !isDraggingRef.current) {
      const now = Date.now();
      if (now - lastTimeUpdateRef.current > 250) {
        lastTimeUpdateRef.current = now;
        setVideoTime(Math.floor(videoRef.current.currentTime));
      }
    }
  }, []);

  const handleLoadedMetadata = useCallback((e) => {
    const dur = Math.floor(e.target.duration);
    if (!isNaN(dur) && dur > 0) {
      setVideoDuration(dur);
      videoDurationRef.current = dur;
    }
  }, []);

  const handleVideoEnded = useCallback(() => setIsPlaying(false), []);

  const handleWaiting = useCallback(() => setIsVideoLoading(true), []);
  const handlePlaying = useCallback(() => {
    setIsVideoLoading(false);
    setIsPlaying(true);
  }, []);
  const handleCanPlay = useCallback(() => setIsVideoLoading(false), []);

  return (
    <div className="rgv-video-modal-wrap">
      <div className="rgv-video-header">
        <span className="rgv-video-title-text">{item?.title}</span>
        <button
          className="rgv-modal-close"
          onClick={onClose}
          style={{ position: "relative", top: "auto", right: "auto", background: "rgba(255,255,255,0.1)" }}
        >
          <X size={24} />
        </button>
      </div>

      <div className="rgv-video-player-main" onClick={handleTogglePlay}>
        <AuthVideo
          src={videoUrl || ""}
          poster={item?.thumbnail || ""}
          ref={videoRef}
          customClassName="rgv-video-tag"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleVideoEnded}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onCanPlay={handleCanPlay}
          playsInline
        />

        {isVideoLoading ? (
          <div className="rgv-video-spinner-container">
            <div className="rgv-video-spinner-circle" />
          </div>
        ) : (
          <div className="rgv-video-center-btns" onClick={handleStopPropagation}>
            <button className="rgv-v-circle-btn small" onClick={handleBackward}>
              <span style={{ pointerEvents: "none" }}>
                <RotateCcw size={20} />
              </span>
            </button>
            <button className="rgv-v-circle-btn large" onClick={handleTogglePlay}>
              <span style={{ pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <span style={{ marginLeft: "4px" }}><Play size={32} fill="currentColor" /></span>}
              </span>
            </button>
            <button className="rgv-v-circle-btn small" onClick={handleForward}>
              <span style={{ pointerEvents: "none" }}>
                <RotateCw size={20} />
              </span>
            </button>
          </div>
        )}

        <div className="rgv-video-volume-side" onClick={handleStopPropagation}>
          <div className="rgv-v-slider-vert" ref={volumeWrapRef} onMouseDown={handleVolumeMouseDown}>
            <div className="rgv-v-slider-track">
              <div className="rgv-v-slider-fill" style={{ height: `${videoVolume}%` }} />
            </div>
          </div>
          <span
            onClick={handleVolumeToggle}
            style={{ color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <Volume2 size={20} />
          </span>
        </div>

        <div className="rgv-video-bottom-bar" onClick={handleStopPropagation}>
          <span className="rgv-v-time">{formatVideoTime(videoTime)}</span>
          <div
            className="rgv-v-progress-wrap"
            ref={progressWrapRef}
            style={{ touchAction: "none" }}
            onPointerDown={handleProgressPointerDown}
          >
            <div className="rgv-v-progress-rail">
              <div
                className="rgv-v-progress-active"
                style={{ width: `${videoDuration > 0 ? (videoTime / videoDuration) * 100 : 0}%` }}
              />
            </div>
            <div
              className="rgv-v-progress-knob"
              style={{ left: `${videoDuration > 0 ? (videoTime / videoDuration) * 100 : 0}%` }}
            />
          </div>
          <span className="rgv-v-time">{formatVideoTime(videoDuration)}</span>

          <div className="rgv-v-actions">
            <span
              onClick={handleLikeAction}
              style={{ color: isLiked ? "#ef4444" : "white", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <Heart size={20} fill={isLiked ? "#ef4444" : "none"} />
            </span>
            <span
              onClick={toggleFullscreen}
              style={{ color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </span>
            <div className="rgv-modal-more-wrap">
              <span
                onClick={handleMoreMenuToggle}
                style={{ color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <MoreVertical size={20} />
              </span>
              {showModalMoreMenu && (
                <div className="rgv-modal-options-menu">
                  <div className="rgv-opt-item" onClick={handleDownloadAction}>
                    <Download size={14} /> <span>Tải xuống</span>
                  </div>
                  <div className="rgv-opt-item" onClick={handleCopyLink}>
                    <LinkIcon size={14} /> <span>Sao chép liên kết</span>
                  </div>
                  {/* <div className="rgv-opt-item" onClick={handleShareGmail}>
                    <span style={{ color: "#EA4335", display: "flex", alignItems: "center" }}>
                      <Mail size={14} />
                    </span>
                    <span>Gmail</span>
                  </div> */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        .rgv-video-modal-wrap { position: relative; aspect-ratio: 16/9; background: #000; }
        .rgv-video-header {
          position: absolute;
          top: 0; left: 0; right: 0;
          padding: 30px 40px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
          z-index: 2;
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        .rgv-video-title-text {
          color: white;
          font-size: 20px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .rgv-video-player-main {
          width: 100%; height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rgv-video-tag {
          width: 100%; height: 100%;
          object-fit: contain;
          position: absolute;
          top: 0; left: 0;
          z-index: 1;
        }
        .rgv-video-center-btns {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 30px;
          z-index: 3;
        }

        .rgv-video-spinner-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rgv-video-spinner-circle {
          width: 56px;
          height: 56px;
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top-color: #ef4444;
          border-radius: 50%;
          animation: rgvSpin 1s linear infinite;
        }

        @keyframes rgvSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .rgv-v-circle-btn {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border: none;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .rgv-v-circle-btn.large { width: 84px; height: 84px; background: rgba(255,255,255,0.25); }
        .rgv-v-circle-btn.small { width: 56px; height: 56px; color: rgba(255,255,255,0.9); }
        .rgv-v-circle-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); }

        .rgv-video-volume-side {
          position: absolute;
          left: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          z-index: 3;
        }
        .rgv-v-slider-vert {
          width: 20px;
          height: 140px;
          background: transparent;
          position: relative;
          cursor: pointer;
          display: flex;
          justify-content: center;
        }
        .rgv-v-slider-track {
          width: 6px;
          height: 100%;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }
        .rgv-v-slider-fill {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: white;
          border-radius: 10px;
        }

        .rgv-video-bottom-bar {
          position: absolute;
          bottom: 30px; 
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 800px;
          display: flex;
          align-items: center;
          gap: 20px;
          backdrop-filter: blur(20px);
          background: rgba(255,255,255,0.1);
          padding: 14px 28px;
          border-radius: 50px;
          border: 1px solid rgba(255,255,255,0.15);
          z-index: 3;
        }
        .rgv-v-time { color: white; font-size: 13px; font-weight: 500; min-width: 45px; opacity: 0.9; }
        .rgv-v-progress-wrap { 
          flex: 1; 
          position: relative; 
          height: 24px;
          display: flex;
          align-items: center;
          cursor: pointer; 
        }
        .rgv-v-progress-rail { width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; position: relative; overflow: hidden; }
        .rgv-v-progress-active { height: 100%; background: #3b82f6; border-radius: 3px; }
        .rgv-v-progress-knob {
          position: absolute;
          top: 50%; width: 16px; height: 16px;
          background: white; border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 10px rgba(0,0,0,0.4);
          pointer-events: none;
        }
        .rgv-v-actions { display: flex; align-items: center; gap: 20px; color: white; }
        .rgv-v-actions :global(svg) { cursor: pointer; opacity: 0.8; transition: all 0.2s; }
        .rgv-v-actions :global(svg:hover) { opacity: 1; transform: scale(1.1); }
        .rgv-modal-more-wrap { position: relative; display: flex; align-items: center; }
        .rgv-modal-options-menu {
          position: absolute;
          bottom: 100%;
          right: 0;
          background: white;
          border-radius: 12px;
          padding: 8px;
          min-width: 140px;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.2);
          margin-bottom: 15px;
          z-index: 10;
        }
        .rgv-opt-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          color: #475569;
          font-size: 13px;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .rgv-opt-item:hover { background: #f1f5f9; color: #3b82f6; }
        
        .rgv-modal-close {
           width: 32px; height: 32px; border-radius: 50%; border: none;
           display: flex; alignItems: center; justifyContent: center; cursor: pointer; color: white;
           transition: all 0.2s;
        }
        .rgv-modal-close:hover { background: rgba(255,255,255,0.2) !important; }

        @media (max-width: 768px) {
          .rgv-video-modal-wrap { width: 100vw; height: auto; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; }
          .rgv-video-bottom-bar { left: 50%; padding: 10px 12px; bottom: 10px; gap: 8px; width: 85%; transform: translateX(-50%); z-index: 100; }
          .rgv-v-circle-btn.large { width: 56px; height: 56px; }
          .rgv-v-circle-btn.small { display: none; }
          .rgv-video-volume-side { display: none; }
          .rgv-video-title-text { font-size: 14px; padding-right: 30px; line-height: 1.4; color: #fff; }
          .rgv-video-header { padding: 15px; }
        }
       `}</style>
    </div>
  );
};
