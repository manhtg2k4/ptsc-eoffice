"use client";

import React, { useState, useEffect, useMemo, useContext, useCallback } from "react";
import { useSearchParams, useRouter } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav";
import { useDispatch, useSelector } from "react-redux";
import { fetchTopics, fetchSearchAll, updateVideoStats, fetchVideoDetail, fetchMediaGalleryDetail, fetchAlbumDetail, updateVideo, updateAlbum, fetchUserRoles } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import { API_DON_VI, API_FILES_VIEW, APP_BASE, API_LIKE_VIDEO, API_LIKE_ALBUM } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import VideoPlayerModal from "./common/VideoPlayerModal";
import ImageGalleryModal from "./common/ImageGalleryModal";
import { AuthContext } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/AuthProvider";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import moment from "moment";
import { getResponsiveImage, DEFAULT_NEWS_THUMBNAIL } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/imageHelper";
import EditNewsModal from "./dialog/EditNewsModal";
import { toast } from "react-toastify";
import {
  ChevronRight,
  Search,
  Mic,
  Calendar,
  ChevronDown,
  ArrowUpDown,
  Eye,
  Heart,
  MoreVertical,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  Pencil,
  Share2,
  FileDown,
  Link as LinkIcon,
  Send,
  Square,
  CheckSquare,
  X,
  Mail,
  ArrowLeft 
} from "lucide-react";
import CustomDatePicker from "./common/CustomDatePicker";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';

export default function SearchResultsPage() {
  const { setActivePage } = useCMS();
  const { user } = useContext(AuthContext);
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { newsList, loading, topicList, totalNews, userRoleList, searchCounts } = useSelector((state) => state.news);
  
  // Check permission logic replaced by fetchUserRoles logic
  const isAdmin = userRoleList?.roles?.some(
    (role) => role === "ADMIN_NEWS" || role === "NGUOI_PHE_DUYET" || role === "NGUOI_TAO_TIN"
  );
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const queryFromUrl = searchParams.get("q") || searchParams.get("tag") || "";
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showShareSubmenu, setShowShareSubmenu] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedLocations, setSelectedLocations] = useState(["tag", "title", "content"]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(["news", "video", "image", "album"]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Edit states for media/video/album
  const [isMediaEditModalOpen, setIsMediaEditModalOpen] = useState(false);
  const [mediaEditTitle, setMediaEditTitle] = useState("");
  const [editingMediaItem, setEditingMediaItem] = useState(null);

  // Video Modal States
  const [modalItem, setModalItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemLikes, setItemLikes] = useState({});
  const { currentMediaGalleryDetail } = useSelector((state) => state.news);

  // Date and Sort states
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState("DESC"); // DESC or ASC
  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");

  // Optimization: Debounced search query to prevent laggy API calls
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms before triggering search

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.sr-menu-container')) {
        setActiveMenuId(null);
        setShowShareSubmenu(false);
      }
      if (!event.target.closest('.sr-filter-container')) {
        setShowLocationDropdown(false);
      }
      if (!event.target.closest('.sr-unit-filter-container')) {
        setShowUnitDropdown(false);
      }
      if (!event.target.closest('.sr-type-filter-container')) {
        setShowTypeDropdown(false);
      }
      if (!event.target.closest('.sr-date-picker-wrap')) {
        setShowFromPicker(false);
        setShowToPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    dispatch(fetchUserRoles());
    dispatch(fetchTopics());

    const fetchUnits = async () => {
      // Only fetch units if user is logged in
      if (!user) return;

      try {
        const { data } = await (await import("../hooks/axiosClient")).default.get(API_DON_VI, { params: { limit: 1000 } });
        setUnits(data || []);
      } catch (error) {
        // console.error("Error fetching units:", error);
      }
    };
    fetchUnits();
  }, [dispatch, user]);

  const selectedTopicId = searchParams.get("topic") || null;

  const topicIdFromUrl = searchParams.get("topic");

  useEffect(() => {
    const q = debouncedSearchQuery || "";

    const params = {};

    // Only apply text filters if there is a debounced query
    if (q.trim()) {
      if (selectedLocations.includes("title")) {
        params['filter[title]'] = q;
      }
      if (selectedLocations.includes("tag")) {
        params['filter[tags]'] = q;
      }
      if (selectedLocations.includes("content")) {
        params['filter[content]'] = q;
      }
      
      // Category filters (Hạng mục) matching "Vị trí từ khóa" logic
      if (selectedTypes.includes("news")) {
        params['filter[news]'] = q;
      }
      if (selectedTypes.includes("video")) {
        params['filter[video]'] = q;
      }
      if (selectedTypes.includes("image")) {
        params['filter[album]'] = q;
      }
    }

    if (fromDate) {
      params['filter[publishedAt][startDate]'] = fromDate;
    }
    if (toDate) {
      params['filter[publishedAt][endDate]'] = toDate;
    }


    if (topicIdFromUrl) {
      params['filter[topic]'] = topicIdFromUrl;
    }

    if (selectedUnits.length > 0) {
      params['filter[authorDepartment]'] = JSON.stringify(selectedUnits);
    }

    params.sortOrder = sortOrder;
    params.sortBy = "publishedAt";
    params.limit = itemsPerPage;
    params.page = currentPage;

    dispatch(fetchSearchAll(params));
  }, [dispatch, debouncedSearchQuery, topicIdFromUrl, selectedLocations, selectedTypes, fromDate, toDate, sortOrder, selectedUnits, currentPage, itemsPerPage]);



  useEffect(() => {
    setSearchQuery(queryFromUrl);
  }, [queryFromUrl, setSearchQuery]);

  useEffect(() => {
    const sharedId = searchParams.get('id');
    if (sharedId && newsList.length > 0) {
      const foundItem = newsList.find(item => String(item.id) === String(sharedId));
      if (foundItem && (foundItem.type === 'video' || foundItem.type === 'image' || foundItem.type === 'album')) {
        setModalItem(foundItem);
        setIsModalOpen(true);
        dispatch(fetchMediaGalleryDetail({ id: foundItem.id, type: foundItem.type }));

        // Remove id from URL without refreshing to clean up
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('id');
        window.history.replaceState(null, '', newUrl.toString());
      }
    }
  }, [searchParams, newsList, dispatch]);

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
      // console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
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

  const handleSearch = useCallback(() => {
    setDebouncedSearchQuery(searchQuery);

    const params = new URLSearchParams(window.location.search);
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      params.set('q', trimmedQuery);
    } else {
      params.delete('q');
    }

    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
    if (setActivePage) {
      setActivePage(newUrl);
    }
    if (router?.replace) {
      router.replace(newUrl);
    } else {
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchQuery, setActivePage, router]);

  const currentItems = useMemo(() => {
    const items = Array.isArray(newsList) ? newsList : (newsList?.items || []);
    return [...items].sort((a, b) => {
      const dateA = moment(a.publishedAt || a.createdAt, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]).valueOf();
      const dateB = moment(b.publishedAt || b.createdAt, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]).valueOf();
      return sortOrder === "DESC" ? dateB - dateA : dateA - dateB;
    });
  }, [newsList, sortOrder]);

  const totalPages = Math.ceil((totalNews || 0) / itemsPerPage);

  const activeTopics = useMemo(() => {
    const raw = Array.isArray(topicList) ? topicList : (topicList?.data || topicList?.items || []);
    return raw.filter(t => !t.status || !t.status.includes("Không hoạt động"));
  }, [topicList]);

  const currentTopicName = useMemo(() => {
    if (!selectedTopicId) return "Tìm kiếm";
    const found = activeTopics.find(t => String(t.id) === String(selectedTopicId));
    return found ? found.name : "Tìm kiếm";
  }, [selectedTopicId, activeTopics]);

  const categorySummary = useMemo(() => {
    const list = [
      {
        id: "news",
        label: "Tin tức",
        count: searchCounts?.news || 0,
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.16667 10.8333V4.16667C4.16667 3.72464 4.34226 3.30072 4.65482 2.98816C4.96738 2.67559 5.39131 2.5 5.83333 2.5H15.8333C16.2754 2.5 16.6993 2.67559 17.0118 2.98816C17.3244 3.30072 17.5 3.72464 17.5 4.16667V15C17.5 15.8333 17 17.5 15 17.5M15 17.5H5C4.16667 17.5 2.5 17 2.5 15V13.3333H12.5V15C12.5 17 14.1667 17.5 15 17.5Z" stroke="url(#paint_search_cat_gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="paint_search_cat_gradient" x1="3.41667" y1="-1.78571" x2="19.9273" y2="-0.286907" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22A6EC"/>
                <stop offset="1" stopColor="#4363EF"/>
              </linearGradient>
            </defs>
          </svg>
        ),
        active: selectedTypes.includes("news")
      },
      {
        id: "video",
        label: "Video",
        count: searchCounts?.video || 0,
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.2181 10.6137L16.5618 9.94709L16.5613 9.9468L16.2181 10.6137ZM9.97943 7.40355L9.63614 8.07037L9.63627 8.07044L9.97943 7.40355ZM8.30556 8.46831H9.05556V8.46779L8.30556 8.46831ZM8.30556 14.5317L9.05556 14.5322V14.5317H8.30556ZM9.97943 15.5965L9.63627 14.9296L9.63614 14.9296L9.97943 15.5965ZM16.2181 12.3863L16.5613 13.0532L16.5618 13.0529L16.2181 12.3863ZM16.2181 10.6137L16.5613 9.9468L10.3226 6.73665L9.97943 7.40355L9.63627 8.07044L15.875 11.2806L16.2181 10.6137ZM9.97943 7.40355L10.3227 6.73672C10.0304 6.58626 9.70422 6.51458 9.3754 6.52978L9.41004 7.27898L9.44467 8.02818C9.50988 8.02516 9.57567 8.03924 9.63614 8.07037L9.97943 7.40355ZM9.41004 7.27898L9.3754 6.52978C9.04661 6.54498 8.72846 6.64643 8.45126 6.82276L8.8538 7.45558L9.25634 8.0884C9.31462 8.05133 9.37943 8.03119 9.44467 8.02818L9.41004 7.27898ZM8.8538 7.45558L8.45126 6.82276C8.17421 6.99899 7.94799 7.24362 7.79212 7.53155L8.45167 7.8886L9.11123 8.24565C9.14727 8.17907 9.19791 8.12557 9.25634 8.0884L8.8538 7.45558ZM8.45167 7.8886L7.79212 7.53155C7.63631 7.81936 7.55533 8.14194 7.55556 8.46883L8.30556 8.46831L9.05556 8.46779C9.0555 8.38889 9.07512 8.31235 9.11123 8.24565L8.45167 7.8886ZM8.30556 8.46831H7.55556V14.5317H8.30556H9.05556V8.46831H8.30556ZM8.30556 14.5317L7.55556 14.5312C7.55533 14.8581 7.63631 15.1806 7.79212 15.4685L8.45167 15.1114L9.11123 14.7543C9.07512 14.6877 9.0555 14.6111 9.05556 14.5322L8.30556 14.5317ZM8.45167 15.1114L7.79212 15.4685C7.94799 15.7564 8.17421 16.001 8.45126 16.1772L8.8538 15.5444L9.25634 14.9116C9.19791 14.8744 9.14727 14.8209 9.11123 14.7543L8.45167 15.1114ZM8.8538 15.5444L8.45126 16.1772C8.72846 16.3536 9.04661 16.455 9.3754 16.4702L9.41004 15.721L9.44467 14.9718C9.37943 14.9688 9.31462 14.9487 9.25634 14.9116L8.8538 15.5444ZM9.41004 15.721L9.3754 16.4702C9.70422 16.4854 10.0305 16.4137 10.3227 16.2633L9.97943 15.5965L9.63614 14.9296C9.57567 14.9608 9.50988 14.9748 9.44467 14.9718L9.41004 15.721ZM9.97943 15.5965L10.3226 16.2633L16.5613 13.0532L16.2181 12.3863L15.875 11.7194L9.63627 14.9296L9.97943 15.5965ZM16.2181 12.3863L16.5618 13.0529C16.8476 12.9056 17.0849 12.6809 17.2494 12.4067L16.6063 12.0208L15.9632 11.6349C15.9399 11.6737 15.9084 11.7022 15.8744 11.7197L16.2181 12.3863ZM16.6063 12.0208L17.2494 12.4067C17.4139 12.1327 17.5 11.8188 17.5 11.5H16.75H16C16 11.5491 15.9866 11.5959 15.9632 11.6349L16.6063 12.0208ZM16.75 11.5H17.5C17.5 11.1812 17.4139 10.8673 17.2494 10.5933L16.6063 10.9792L15.9632 11.3651C15.9866 11.4041 16 11.4509 16 11.5H16.75ZM16.6063 10.9792L17.2494 10.5933C17.0849 10.3191 16.8476 10.0944 16.5618 9.94709L16.2181 10.6137L15.8744 11.2803C15.9084 11.2978 15.9399 11.3263 15.9632 11.3651L16.6063 10.9792ZM21.5 11.5H20.75C20.75 16.3325 16.8325 20.25 12 20.25V21V21.75C17.6609 21.75 22.25 17.1609 22.25 11.5H21.5ZM12 21V20.25C7.16751 20.25 3.25 16.3325 3.25 11.5H2.5H1.75C1.75 17.1609 6.33908 21.75 12 21.75V21ZM2.5 11.5H3.25C3.25 6.66751 7.16751 2.75 12 2.75V2V1.25C6.33908 1.25 1.75 5.83908 1.75 11.5H2.5ZM12 2V2.75C16.8325 2.75 20.75 6.66751 20.75 11.5H21.5H22.25C22.25 5.83908 17.6609 1.25 12 1.25V2Z" fill="url(#paint_search_cat_gradient)"/>
          </svg>
        ),
        active: selectedTypes.includes("video")
      },
      {
        id: "image",
        label: "Ảnh",
        count: (searchCounts?.album || 0) + (searchCounts?.image || 0) || 0,
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.45 15.3C4.78285 15.0777 6.90515 15.0216 9.09775 15.5308M9.09775 15.5308C11.5943 16.1094 14.1812 17.4204 15.8 20.05M9.09775 15.5308C10.9502 13.3857 14.4301 11.5 20.55 11.5H21.5M21.5 11.5C21.5 16.7467 17.2467 21 12 21C6.75329 21 2.5 16.7467 2.5 11.5C2.5 6.25329 6.75329 2 12 2C17.2467 2 21.5 6.25329 21.5 11.5ZM8.675 6.75C8.2 6.75 7.25 7.035 7.25 8.175C7.25 9.315 8.2 9.6 8.675 9.6C9.15 9.6 10.1 9.315 10.1 8.175C10.1 7.035 9.15 6.75 8.675 6.75Z" stroke="url(#paint_search_cat_gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        active: selectedTypes.includes("image") || selectedTypes.includes("album")
      }
    ];

    if (!searchCounts) {
      const items = Array.isArray(newsList) ? newsList : (newsList?.items || []);
      return list.map(cat => {
        let count = 0;
        if (cat.id === "news") {
          count = items.filter(i => !i.type || i.type === "news" || i.type === "tin-tuc").length;
        } else if (cat.id === "video") {
          count = items.filter(i => i.type === "video").length;
        } else if (cat.id === "image") {
          count = items.filter(i => i.type === "album" || i.type === "image").length;
        }

        // Nếu tổng số tin nhỏ (nằm trong 1 trang), đây là số lượng chính xác.
        // Nếu có nhiều trang, đây là số lượng của trang hiện tại (tốt hơn là hiển thị sai tổng số).
        return { ...cat, count };
      });
    }

    return list;
  }, [searchCounts, newsList, selectedTypes]);

  const toggleLocation = useCallback((loc) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(item => item !== loc) : [...prev, loc]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedLocations.length === 3) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(["tag", "title", "content"]);
    }
  }, [selectedLocations.length]);

  const onGoHomeClick = useCallback(() => {
    if (setActivePage) {
      setActivePage("/");
    }
    if (router?.push) {
      router.push("/");
    } else {
      window.history.pushState(null, "", "/");
    }
    window.scrollTo(0, 0);
  }, [setActivePage, router]);
  const onBackClick = useCallback(() => {
    const state = window.history.state;
    if (state && state.fromUrl) {
      if (setActivePage) {
        setActivePage(state.fromUrl);
      }
      window.history.pushState(null, "", state.fromUrl);
      window.scrollTo(0, 0);
      return;
    }
    onGoHomeClick(); // Quay lại trang chủ nếu không có lịch sử trước đó
  }, [setActivePage, onGoHomeClick]);
  const onSearchQueryChange = useCallback((e) => setSearchQuery(e.target.value), []);
  const onSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);
  const onItemsPerPageChange = useCallback((e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  }, []);
  const onLocationFilterClick = useCallback(() => setShowLocationDropdown(prev => !prev), []);
  const onLocationItemClick = useCallback((loc) => () => toggleLocation(loc), [toggleLocation]);
  const onSelectAllLocationsClick = useCallback(() => toggleSelectAll(), [toggleSelectAll]);

  const toggleType = useCallback((type) => {
    setSelectedTypes(prev => {
      if (type === 'image') {
        const hasImage = prev.includes('image');
        return hasImage ? prev.filter(t => t !== 'image' && t !== 'album') : [...prev, 'image', 'album'];
      }
      return prev.includes(type) ? prev.filter(item => item !== type) : [...prev, type];
    });
  }, []);

  const toggleSelectAllTypes = useCallback(() => {
    if (selectedTypes.length >= 3) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(["news", "video", "image", "album"]);
    }
  }, [selectedTypes.length]);

  const onTypeFilterClick = useCallback(() => setShowTypeDropdown(prev => !prev), []);
  const onTypeItemClick = useCallback((type) => () => toggleType(type), [toggleType]);
  const onSelectAllTypesClick = useCallback(() => toggleSelectAllTypes(), [toggleSelectAllTypes]);

  const onDatePickerWrapClick = useCallback((e) => {
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

  const onClearDateClick = useCallback((e) => {
    e.stopPropagation();
    setFromDate("");
    setToDate("");
    setShowFromPicker(false);
    setShowToPicker(false);
  }, []);

  const onFromDateChange = useCallback((val) => {
    setFromDate(val);
    setShowFromPicker(false);
    setShowToPicker(true);
  }, []);

  const onFromDateClose = useCallback(() => setShowFromPicker(false), []);

  const onToDateChange = useCallback((val) => {
    setToDate(val);
    setShowToPicker(false);
  }, []);

  const onToDateClose = useCallback(() => setShowToPicker(false), []);

  const onUnitFilterClick = useCallback(() => {
    setShowUnitDropdown(prev => !prev);
    if (!showUnitDropdown) setUnitSearchQuery("");
  }, [showUnitDropdown]);

  const onSelectAllUnitsClick = useCallback(() => {
    if (selectedUnits.length === units.length) setSelectedUnits([]);
    else setSelectedUnits(units.map(u => u.id));
  }, [selectedUnits.length, units]);

  const onUnitSearchChange = useCallback((e) => {
    setUnitSearchQuery(e.target.value);
  }, []);

  const onClearUnitSearch = useCallback((e) => {
    e.stopPropagation();
    setUnitSearchQuery("");
  }, []);

  const onUnitItemClick = useCallback((unitId) => (e) => {
    e.stopPropagation();
    setSelectedUnits(prev => prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]);
  }, []);

  const filteredUnits = useMemo(() => {
    if (!unitSearchQuery.trim()) return units;
    const q = unitSearchQuery.toLowerCase();
    return units.filter(u => (u.name || "").toLowerCase().includes(q));
  }, [units, unitSearchQuery]);

  const onSortToggleClick = useCallback(() => setSortOrder(prev => prev === "DESC" ? "ASC" : "DESC"), []);

  const onCardClick = useCallback((item) => () => {
    if (item.type === "video" || item.type === "image" || item.type === "album") {
      setModalItem(item);
      setIsModalOpen(true);
      dispatch(fetchMediaGalleryDetail({ id: item.id, type: item.type }));
      return;
    }
    const url = ROUTES.newsDetail(item.id);
    const fromUrl = window.location.pathname + window.location.search;
    setActivePage(url);
    window.history.pushState({ fromSearch: true, fromUrl, searchUrl: fromUrl }, "", url);
    window.scrollTo(0, 0);
  }, [setActivePage, dispatch]);

  const onImageError = useCallback((e) => {
    e.target.onerror = null;
  }, []);

  const onMenuTriggerClick = useCallback((itemId) => (e) => {
    e.stopPropagation();
    setActiveMenuId(prev => (prev === itemId ? null : itemId));
    setShowShareSubmenu(false);
  }, []);

  const onEditClick = useCallback((item) => async () => {
    if (item.type === "video" || item.type === "image" || item.type === "album") {
      const toastId = toast.loading("Đang tải dữ liệu...");
      try {
        let result = null;
        if (item.type === 'video') {
          result = await dispatch(fetchVideoDetail(item.id)).unwrap();
        } else {
          result = await dispatch(fetchAlbumDetail(item.id)).unwrap();
        }
        const detailData = result?.data || result;
        setEditingMediaItem({ ...(detailData || item), type: item.type });
        setMediaEditTitle(detailData?.title || item.title || "");
        setIsMediaEditModalOpen(true);
        toast.dismiss(toastId);
      } catch (error) {
        // console.error("Lỗi khi tải chi tiết để sửa:", error);
        toast.update(toastId, { render: "Không thể lấy thông tin chi tiết", type: "error", isLoading: false, autoClose: 2000 });
      }
      setActiveMenuId(null);
      return;
    }
    setEditingRecord(item);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  }, [dispatch]);

  const onReadMoreClick = useCallback((item) => () => {
    if (item.type === "video" || item.type === "image" || item.type === "album") {
      setModalItem(item);
      setIsModalOpen(true);
      dispatch(fetchMediaGalleryDetail({ id: item.id, type: item.type }));
      setActiveMenuId(null);
      return;
    }
    const url = ROUTES.newsDetail(item.id);
    const fromUrl = window.location.pathname + window.location.search;
    setActivePage(url);
    window.history.pushState({ fromSearch: true, fromUrl, searchUrl: fromUrl }, "", url);
    window.scrollTo(0, 0);
  }, [setActivePage, dispatch]);

  const onCopyUrlClick = useCallback((item) => (e) => {
    e.stopPropagation();
    let shareUrl = "";
    if (item.type === "video" || item.type === "image" || item.type === "album") {
      shareUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
    } else {
      shareUrl = window.location.origin + ROUTES.newsDetail(item.id);
    }
    navigator.clipboard.writeText(shareUrl);
    toast.success("Đã sao chép liên kết chia sẻ!");
    setActiveMenuId(null);
    setShowShareSubmenu(false);
  }, []);

  // const onShareZaloClick = useCallback((item) => (e) => {
  //   e.stopPropagation();
  //   let shareUrl = "";
  //   if (item.type === "video" || item.type === "image" || item.type === "album") {
  //     shareUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
  //   } else {
  //     shareUrl = window.location.origin + ROUTES.newsDetail(item.id);
  //   }
  //   window.open(`https://zalo.me/share?url=${encodeURIComponent(shareUrl)}`, "_blank");
  //   setActiveMenuId(null);
  //   setShowShareSubmenu(false);
  // }, []);

  const onShareGmailClick = useCallback((item) => (e) => {
    e.stopPropagation();
    let shareUrl = "";
    if (item.type === "video" || item.type === "image" || item.type === "album") {
      shareUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
    } else {
      shareUrl = window.location.origin + ROUTES.newsDetail(item.id);
    }
    const title = item.title || "";
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${encodeURIComponent(title)}&body=${encodeURIComponent(`Mình chia sẻ cho bạn bài viết này:\n${shareUrl}`)}`;
    window.open(gmailUrl, '_blank');
    setActiveMenuId(null);
    setShowShareSubmenu(false);
  }, []);

  const onEditModalClose = useCallback(() => setIsEditModalOpen(false), []);
  const onMediaEditModalClose = useCallback(() => setIsMediaEditModalOpen(false), []);
  const onMediaEditTitleChange = useCallback((e) => setMediaEditTitle(e.target.value), []);
  const onModalClose = useCallback(() => setIsModalOpen(false), []);

  const onMediaSaveClick = useCallback(async () => {
    if (!mediaEditTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }
    const toastId = toast.loading("Đang cập nhật...");
    try {
      const updateData = { title: mediaEditTitle };
      if (editingMediaItem.type === 'video') {
        await dispatch(updateVideo({ id: editingMediaItem.id, data: updateData })).unwrap();
      } else {
        await dispatch(updateAlbum({ id: editingMediaItem.id, data: updateData })).unwrap();
      }
      toast.update(toastId, { render: "Đã cập nhật tiêu đề thành công!", type: "success", isLoading: false, autoClose: 2000 });
      setIsMediaEditModalOpen(false);

      // Refresh current search results with all current filters
      const q = debouncedSearchQuery || "";
      const topicIdFromUrl = searchParams.get("topic");
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortOrder: sortOrder,
        sortBy: "publishedAt"
      };

      if (q.trim()) {
        if (selectedLocations.includes("title")) params['filter[title]'] = q;
        if (selectedLocations.includes("tag")) params['filter[tags]'] = q;
        if (selectedLocations.includes("content")) params['filter[content]'] = q;
      }

      if (fromDate) params['filter[publishedAt][startDate]'] = fromDate;
      if (toDate) params['filter[publishedAt][endDate]'] = toDate;
      if (topicIdFromUrl) params['filter[topic]'] = topicIdFromUrl;
      if (selectedUnits.length > 0) params['filter[authorDepartment]'] = JSON.stringify(selectedUnits);

      dispatch(fetchSearchAll(params));
    } catch (error) {
      // console.error("Lỗi khi cập nhật tiêu đề:", error);
      toast.update(toastId, { render: "Cập nhật thất bại", type: "error", isLoading: false, autoClose: 2000 });
    }
  }, [mediaEditTitle, editingMediaItem, dispatch, debouncedSearchQuery, searchParams, currentPage, itemsPerPage, sortOrder, fromDate, toDate, selectedLocations, selectedUnits]);

  const onMenuClick = useCallback((e) => e.stopPropagation(), []);
  const onShareMouseEnter = useCallback(() => setShowShareSubmenu(true), []);
  const onShareMouseLeave = useCallback(() => setShowShareSubmenu(false), []);

  const onDMessengerClick = useCallback((e) => {
    e.stopPropagation();
    toast.info("Tính năng chia sẻ qua D-Messenger đang được phát triển");
    setActiveMenuId(null);
    setShowShareSubmenu(false);
  }, []);

  const onDownloadPdfClick = useCallback((item) => async (e) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    toast.info("Đang chuẩn bị tải PDF: " + item.title);

    try {
      // Dynamic imports to keep initial bundle size small
      const [jsPDFMod, html2canvasMod] = await Promise.all([
        import("jspdf"),
        import("html2canvas")
      ]);
      const jsPDF = jsPDFMod.default;
      const html2canvas = html2canvasMod.default;

      // Temporary element to render the news content for capture
      const root = document.createElement("div");
      root.id = "news-pdf-renderer";
      root.style.position = "fixed";
      root.style.top = "-10000px";
      root.style.left = "-10000px";
      root.style.width = "800px";
      root.style.background = "#fff";
      root.style.padding = "40px";
      root.style.color = "#1e293b";
      root.style.fontFamily = "'Inter', sans-serif";

      // Re-fetch detail to get full content for PDF if not available
      let detailData = item;
      if (!item.content) {
        try {
          const detailRes = await axiosClient.get(API_FILES_VIEW.replace(':id', item.id));
          detailData = detailRes.data || item;
        } catch (err) {
          // console.error("Error fetching detail for PDF:", err);
        }
      }

      root.innerHTML = `
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between;">
           <h2 style="margin: 0; color: #3b82f6;">LIFETEX CMS</h2>
           <div style="text-align: right; font-size: 14px; color: #64748b;">
             <div>Đăng ngày: ${moment(detailData.publishedAt).format("DD/MM/YYYY")}</div>
           </div>
        </div>
        <h1 style="font-size: 32px; font-weight: 700; margin-bottom: 24px; line-height: 1.3;">${detailData.title}</h1>
        <div style="font-size: 16px; line-height: 1.8; color: #334155;">
          ${detailData.content || detailData.summary || "Nội dung bài viết đang được cập nhật..."}
        </div>
        <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
          Copyright &copy; 2024 Lifetex Portal. Bản quyền thuộc về Lifetex.
        </div>
      `;

      document.body.appendChild(root);

      const canvas = await html2canvas(root, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Lifetex_${detailData.title.substring(0, 30)}.pdf`);

      document.body.removeChild(root);
      toast.success("Đã tải bản PDF thành công!");
    } catch (error) {
      // console.error("Lỗi khi tạo PDF:", error);
      toast.error("Không thể tạo file PDF. Vui lòng thử lại sau.");
    }
  }, []);

  const onGoToFirstPageClick = useCallback(() => setCurrentPage(1), []);
  const onGoToPrevPageClick = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), []);
  const onGoToNextPageClick = useCallback(() => setCurrentPage(prev => Math.min(totalPages, prev + 1)), [totalPages]);
  const onGoToLastPageClick = useCallback(() => setCurrentPage(totalPages), [totalPages]);
  const onGoToPageClick = useCallback((p) => () => setCurrentPage(p), []);

  const onEditSuccess = useCallback(() => {
    // Trigger a refresh of the list
    const q = searchParams.get("q") || "";
    const topicIdFromUrl = searchParams.get("topic");
    const params = {};
    if (q.trim()) {
      if (selectedLocations.includes("title")) params['filter[title]'] = q;
      if (selectedLocations.includes("tag")) params['filter[tags]'] = q;
      if (selectedLocations.includes("content")) params['filter[content]'] = q;
    }
    if (fromDate) params['filter[publishedAt][startDate]'] = fromDate;
    if (toDate) params['filter[publishedAt][endDate]'] = toDate;
    if (topicIdFromUrl) params['filter[topic]'] = topicIdFromUrl;
    if (selectedUnits.length > 0) params['filter[authorDepartment]'] = JSON.stringify(selectedUnits);
    params.sortOrder = sortOrder;
    params.sortBy = "publishedAt";
    dispatch(fetchSearchAll(params));
  }, [searchParams, selectedLocations, fromDate, toDate, sortOrder, selectedUnits, dispatch]);

  const handleLikeMedia = async (e, item) => {
    e?.stopPropagation();
    if (!user) {
      toast.info("Vui lòng đăng nhập để thích nội dung");
      return;
    }
    const itemId = item.id;
    const currentLikeState = itemLikes[itemId] || { isLiked: item.meLike || false, count: item.likeCount || item.totalLikes || 0 };
    const newIsLiked = !currentLikeState.isLiked;
    const newCount = newIsLiked ? currentLikeState.count + 1 : Math.max(0, currentLikeState.count - 1);

    setItemLikes(prev => ({ ...prev, [itemId]: { isLiked: newIsLiked, count: newCount } }));

    try {
      const apiUrl = item.type === 'video' ? API_LIKE_VIDEO : API_LIKE_ALBUM;
      const idAsString = String(itemId);
      const payload = item.type === 'video' ? { videoId: idAsString, isLike: newIsLiked } : { albumId: idAsString, isLike: newIsLiked };
      await axiosClient.post(apiUrl, payload);
      if (item.type === 'video') {
        dispatch(updateVideoStats({ videoId: itemId, meLike: newIsLiked, totalLikes: newCount }));
      }
    } catch (error) {
      // console.error("Error liking media:", error);
      setItemLikes(prev => ({ ...prev, [itemId]: currentLikeState }));
    }
  };

  const activeMediaData = useMemo(() => {
    if (!modalItem) return null;
    const detail = currentMediaGalleryDetail?.id === modalItem.id ? currentMediaGalleryDetail : null;
    const data = detail || modalItem;

    let videoUrl = "";
    if (data.videoFileId) videoUrl = `${API_FILES_VIEW}/${data.videoFileId}`;
    else if (data.videoUrl) videoUrl = data.videoUrl.startsWith('http') ? data.videoUrl : `${APP_BASE}${data.videoUrl.startsWith('/') ? '' : '/'}${data.videoUrl}`;
    else if (data.path) videoUrl = data.path.startsWith('http') ? data.path : `${APP_BASE}${data.path.startsWith('/') ? '' : '/'}${data.path}`;

    // Process images for gallery
    let images = [];
    const rawImages = detail?.images || modalItem?.images || [];
    images = rawImages.map(img => {
      if (img.file_id) return { ...img, url: `${API_FILES_VIEW}/${img.file_id}` };
      if (img.id) return { ...img, url: `${API_FILES_VIEW}/${img.id}` };
      if (img.url) return { ...img, url: img.url.startsWith('http') ? img.url : `${APP_BASE}${img.url.startsWith('/') ? '' : '/'}${img.url}` };
      if (img.filename) return { ...img, url: `${APP_BASE}/upload/TCSG/album_images/${img.filename}` };
      return null;
    }).filter(img => img !== null);

    // Ensure we have at least one image if it's an image type
    if (images.length === 0 && (data.type === 'image' || data.type === 'album')) {
      const thumbUrl = data.thumbnailFileId ? `${API_FILES_VIEW}/${data.thumbnailFileId}` :
        data.thumbnail ? (data.thumbnail.startsWith('http') ? data.thumbnail : `${APP_BASE}${data.thumbnail.startsWith('/') ? '' : '/'}${data.thumbnail}`) :
          DEFAULT_NEWS_THUMBNAIL;
      images = [{ url: thumbUrl }];
    }

    return { ...data, videoUrl, images, thumbnailUrl: images[0]?.url };
  }, [modalItem, currentMediaGalleryDetail]);

  return (
    <div className="sr-page-wrapper">
      {/* 1. Hero Banner */}
      <div className="sr-hero">
        <div className="sr-hero-pattern"></div>
        <button
          className="nd-back-button-fixed"
          onClick={onBackClick}
          type="button"
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="sr-hero-content">
          <div className="sr-breadcrumb">
            <span onClick={onGoHomeClick}>Trang chủ</span>
            <ChevronRight size={14} />
            <span className="active">{currentTopicName}</span>
          </div>

          <div className="sr-topic-header">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.4167 14.6667L19.25 11L15.5833 10.1851M15.5833 10.1851L11 9.16667M15.5833 10.1851L16.5 5.5H12.8333M11 9.16667V13.75M11 9.16667L6.41667 10.1851M6.41667 10.1851L2.75 11L4.58333 14.6667M6.41667 10.1851L5.5 5.5H9.16667M9.16667 5.5V2.75H12.8333V5.5M9.16667 5.5H12.8333M2.75 18.3333L3.89125 17.8768C4.24607 17.7349 4.63008 17.6815 5.01016 17.7211C5.39023 17.7607 5.75497 17.8922 6.07292 18.1042C6.54852 18.4213 7.1232 18.5547 7.68987 18.4795C8.25653 18.4042 8.77652 18.1256 9.15292 17.6953L9.185 17.6587C9.41128 17.3998 9.6903 17.1924 10.0033 17.0503C10.3164 16.9081 10.6562 16.8346 11 16.8346C11.3438 16.8346 11.6836 16.9081 11.9967 17.0503C12.3097 17.1924 12.5887 17.3998 12.815 17.6587L12.848 17.6953C13.2244 18.1256 13.7444 18.4042 14.3111 18.4795C14.8777 18.5547 15.4524 18.4213 15.928 18.1042C16.2459 17.8922 16.6107 17.7607 16.9908 17.7211C17.3708 17.6815 17.7548 17.7349 18.1097 17.8768L19.25 18.3333" stroke="url(#sr_gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="sr_gradient" x1="3.75833" y1="-1.74999" x2="21.9056" y2="-0.0241592" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22A6EC" /><stop offset="1" stopColor="#4363EF" />
                </linearGradient>
              </defs>
            </svg>
            <h1 className="sr-topic-name">{currentTopicName}</h1>
          </div>

          <div className="sr-search-bar">
            <span style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleSearch}>
              <span className="sr-search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={20} /></span>
            </span>
            <input
              type="text"
              placeholder="Nhập bài viết, từ khóa..."
              value={searchQuery}
              onChange={onSearchQueryChange}
              onKeyDown={onSearchKeyDown}
            />
            <span
              className={"sr-mic-icon " + (isListening ? 'listening' : '')}
              onClick={handleVoiceSearch}
              style={{ color: isListening ? '#ef4444' : '#3b82f6', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <Mic size={20} />
            </span>
          </div>
        </div>
      </div>

      <div className="sr-main-content">
        {/* 2. Results Header Filters */}
        <div className="sr-results-header">
          <div className="sr-rh-left">
            <h2 className="sr-result-title">Kết quả tìm kiếm cho &quot;{searchQuery || "Tất cả"}&quot;</h2>
            <div className="sr-result-meta">
              Hiển thị:
              <select
                value={itemsPerPage}
                onChange={onItemsPerPageChange}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>
              <span>/ {totalNews || 0} tin</span>
            </div>
          </div>

          <div className="sr-rh-right">
            <div className="sr-filter-container">
              <div
                className={"sr-filter-pill " + (showLocationDropdown ? 'active' : '')}
                onClick={onLocationFilterClick}
              >
                Vị trí từ khóa <ChevronDown size={14} />
              </div>

              {showLocationDropdown && (
                <div className="sr-location-dropdown">
                  <div className="sr-loc-item all" onClick={onSelectAllLocationsClick}>
                    <div className="sr-loc-check-icon">
                      {selectedLocations.length === 3 ? (
                        <div className="sr-loc-radio active"></div>
                      ) : (
                        <div className="sr-loc-radio"></div>
                      )}
                    </div>
                    <div className="sr-loc-label-wrap">
                      <span className="sr-loc-label">Chọn tất cả</span>
                      <span className="sr-loc-sub">{selectedLocations.length} hạng mục</span>
                    </div>
                  </div>
                  <div className="sr-loc-divider"></div>
                  <div className="sr-loc-item" onClick={onLocationItemClick("tag")}>
                    {selectedLocations.includes("tag") ?
                      <span className="sr-loc-cb active" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}><CheckSquare size={18} fill="#3b82f6" /></span> :
                      <span className="sr-loc-cb" style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><Square size={18} /></span>
                    }
                    <span className="sr-loc-label">Tag</span>
                  </div>
                  <div className="sr-loc-item" onClick={onLocationItemClick("title")}>
                    {selectedLocations.includes("title") ?
                      <span className="sr-loc-cb active" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}><CheckSquare size={18} fill="#3b82f6" /></span> :
                      <span className="sr-loc-cb" style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><Square size={18} /></span>
                    }
                    <span className="sr-loc-label">Tiêu đề</span>
                  </div>
                  <div className="sr-loc-item" onClick={onLocationItemClick("content")}>
                    {selectedLocations.includes("content") ?
                      <span className="sr-loc-cb active" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}><CheckSquare size={18} fill="#3b82f6" /></span> :
                      <span className="sr-loc-cb" style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><Square size={18} /></span>
                    }
                    <span className="sr-loc-label">Nội dung</span>
                  </div>
                </div>
              )}
            </div>

            <div className="sr-type-filter-container" style={{ position: 'relative' }}>
              <div
                className={"sr-filter-pill " + (showTypeDropdown ? 'active' : '')}
                onClick={onTypeFilterClick}
              >
                Hạng mục <ChevronDown size={14} />
              </div>

              {showTypeDropdown && (
                <div className="sr-location-dropdown">
                  <div className="sr-loc-item all" onClick={onSelectAllTypesClick}>
                    <div className="sr-loc-check-icon">
                      <div className={"sr-loc-radio " + (selectedTypes.length >= 3 ? 'active' : '')}></div>
                    </div>
                    <div className="sr-loc-label-wrap">
                      <span className="sr-loc-label">Chọn tất cả</span>
                      <span className="sr-loc-sub">{(selectedTypes.includes('news') ? 1 : 0) + (selectedTypes.includes('video') ? 1 : 0) + (selectedTypes.includes('image') ? 1 : 0)} hạng mục</span>
                    </div>
                  </div>
                  <div className="sr-loc-divider"></div>
                  <div className="sr-loc-item" onClick={onTypeItemClick("news")}>
                    {selectedTypes.includes("news") ?
                      <span className="sr-loc-cb active" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}><CheckSquare size={18} fill="#3b82f6" /></span> :
                      <span className="sr-loc-cb" style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><Square size={18} /></span>
                    }
                    <span className="sr-loc-label">Tin tức</span>
                  </div>
                  <div className="sr-loc-item" onClick={onTypeItemClick("video")}>
                    {selectedTypes.includes("video") ?
                      <span className="sr-loc-cb active" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}><CheckSquare size={18} fill="#3b82f6" /></span> :
                      <span className="sr-loc-cb" style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><Square size={18} /></span>
                    }
                    <span className="sr-loc-label">Video</span>
                  </div>
                  <div className="sr-loc-item" onClick={onTypeItemClick("image")}>
                    {selectedTypes.includes("image") ?
                      <span className="sr-loc-cb active" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}><CheckSquare size={18} fill="#3b82f6" /></span> :
                      <span className="sr-loc-cb" style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><Square size={18} /></span>
                    }
                    <span className="sr-loc-label">Ảnh</span>
                  </div>
                </div>
              )}
            </div>
            <div className="sr-date-picker-wrap" style={{ position: 'relative' }}>
              <div
                className={"sr-filter-pill " + (fromDate || toDate ? 'active' : '')}
                style={{ minWidth: '160px', justifyContent: 'center' }}
                onClick={onDatePickerWrapClick}
              >
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {(fromDate || toDate) ? (
                    <>
                      {fromDate ? moment(fromDate).format("DD/MM/YYYY") : "Từ"}
                      <span style={{ opacity: 0.5 }}>-</span>
                      {toDate ? moment(toDate).format("DD/MM/YYYY") : "Đến"}
                    </>
                  ) : (
                    "Thời gian đăng bài"
                  )}
                </span>

                {(fromDate || toDate) ? (
                  <span
                    onClick={onClearDateClick}
                    style={{ position: 'relative', zIndex: 3, cursor: 'pointer', color: '#94a3b8', fontSize: '16px', marginLeft: '6px' }}
                  >
                    &times;
                  </span>
                ) : (
                  <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}><Calendar size={14} /></span>
                )}
              </div>

              {showFromPicker && (
                <div className="sr-date-dropdown-container from">
                  <div className="sr-date-dropdown-header">Từ ngày</div>
                  <CustomDatePicker
                    value={fromDate}
                    onChange={onFromDateChange}
                    onClose={onFromDateClose}
                  />
                </div>
              )}

              {showToPicker && (
                <div className="sr-date-dropdown-container to">
                  <div className="sr-date-dropdown-header">Đến ngày</div>
                  <CustomDatePicker
                    value={toDate}
                    onChange={onToDateChange}
                    onClose={onToDateClose}
                  />
                </div>
              )}
            </div>

            <div className="sr-unit-filter-container" style={{ position: 'relative' }}>
              <div
                className={"sr-filter-pill " + (showUnitDropdown ? 'active' : '')}
                onClick={onUnitFilterClick}
              >
                {selectedUnits.length > 0 ? `Đơn vị (${selectedUnits.length})` : "Đơn vị"}
                <ChevronDown size={14} />
              </div>

              {showUnitDropdown && (
                <div className="sr-unit-dropdown">
                  <div className="sr-dropdown-search" onClick={onMenuClick}>
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Tìm đơn vị..."
                      value={unitSearchQuery}
                      onChange={onUnitSearchChange}
                      autoFocus
                    />
                    {unitSearchQuery && (
                      <button className="sr-search-clear" onClick={onClearUnitSearch}>
                        &times;
                      </button>
                    )}
                  </div>

                  <div
                    className="sr-loc-item all"
                    onClick={onSelectAllUnitsClick}
                  >
                    <div className="sr-loc-check-icon">
                      <div className={"sr-loc-radio " + (selectedUnits.length === units.length ? 'active' : '')}></div>
                    </div>
                    <div className="sr-loc-label-wrap">
                      <span className="sr-loc-label">Chọn tất cả</span>
                      <span className="sr-loc-sub">{units.length} hạng mục</span>
                    </div>
                  </div>
                  <div className="sr-loc-divider"></div>
                  <div className="sr-unit-list">
                    {filteredUnits.length > 0 ? (
                      filteredUnits.map(unit => {
                        const isSelected = selectedUnits.includes(unit.id);
                        return (
                          <div key={unit.id} className="sr-loc-item" onClick={onUnitItemClick(unit.id)}>
                            {isSelected ?
                              <span className="sr-loc-cb active" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}><CheckSquare size={18} fill="#3b82f6" /></span> :
                              <span className="sr-loc-cb" style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><Square size={18} /></span>
                            }
                            <span className="sr-loc-label">{unit.name}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="sr-no-results mini">Không tìm thấy đơn vị</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              className={"sr-sort-toggle " + (sortOrder === "ASC" ? "asc" : "")}
              onClick={onSortToggleClick}
              title={sortOrder === "DESC" ? "Mới nhất trước" : "Cũ nhất trước"}
            >
              <ArrowUpDown size={18} />
            </button>
          </div>
        </div>

        <div className="sr-layout-grid">
          {/* 3. Left: Results List */}
          <div className="sr-list-container">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="sr-card skeleton-box">
                  <div className="skeleton sr-skel-img"></div>
                  <div className="sr-skel-content">
                    <div className="skeleton sr-skel-line" style={{ width: '30%' }}></div>
                    <div className="skeleton sr-skel-line" style={{ width: '80%', height: 24 }}></div>
                    <div className="skeleton sr-skel-line"></div>
                  </div>
                </div>
              ))
            ) : currentItems.length > 0 ? (
              <>
                {currentItems.map((item) => (
                  <div key={item.id} className="sr-card" onClick={onCardClick(item)}>
                    <div className="sr-card-img-box">
                      {(() => {
                        const resImage = getResponsiveImage(item);
                        const isPlaceholder = resImage.src?.includes('placeholder.com');
                        return (
                          <AuthImage
                            src={isPlaceholder ? DEFAULT_NEWS_THUMBNAIL : resImage.src}
                            srcSet={isPlaceholder ? "" : resImage.srcSet}
                            sizes={isPlaceholder ? "" : resImage.sizes}
                            alt={item.title}
                            onError={onImageError}
                          />
                        );
                      })()}
                      {item.type === "video" && (
                        <div className="sr-play-overlay">
                          <div className="sr-play-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="sr-card-info">
                      <span className="sr-card-badge">{item.topicName || item.topic || "Hoạt động sản xuất kinh doanh"}</span>

                      <div className="sr-card-mid">
                        <h3 className="sr-card-title">{item.title}</h3>

                        <div className="sr-menu-container">
                          <button
                            className={"sr-card-more " + (activeMenuId === item.id ? 'active' : '')}
                            onClick={onMenuTriggerClick(item.id)}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenuId === item.id && (
                            <div className="sr-action-menu" onClick={onMenuClick}>
                              {isAdmin && (
                                <div className="sr-menu-item" onClick={onEditClick(item)}>
                                  <Pencil size={16} /> <span>Chỉnh sửa</span>
                                </div>
                              )}
                              <div className="sr-menu-item" onClick={onReadMoreClick(item)}>
                                <Eye size={16} /> <span>{item.type === "video" ? "Xem video" : item.type === "album" ? "Xem ảnh" : "Đọc tin"}</span>
                              </div>
                              <div className="sr-menu-divider"></div>
                              <div
                                className="sr-menu-item has-submenu"
                                onMouseEnter={onShareMouseEnter}
                                onMouseLeave={onShareMouseLeave}
                              >
                                <div className="sr-menu-item-left">
                                  <Share2 size={16} /> <span>Chia sẻ</span>
                                </div>
                                <ChevronRight size={14} />

                                {showShareSubmenu && (
                                  <div className="sr-share-submenu">
                                  <div className="sr-menu-item" onClick={onCopyUrlClick(item)}>
                                      <LinkIcon size={16} /> <span>Sao chép URL</span>
                                    </div>
                                    <div className="sr-menu-item" onClick={onDMessengerClick}>
                                      <Send size={16} /> <span>D-Messenger</span>
                                    </div>
                                    {/* <div className="sr-menu-item" onClick={onShareZaloClick(item)}>
                                      <AuthImage src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" width="16" alt="Zalo" /> <span>Zalo</span>
                                    </div> */}
                                    <div className="sr-menu-item" onClick={onShareGmailClick(item)}>
                                      <span style={{ display: 'flex', alignItems: 'center', color: '#EA4335' }}><Mail size={16} /></span> <span>Gmail</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                                <div className="sr-menu-item" onClick={onDownloadPdfClick(item)}>
                                  <FileDown size={16} /> <span>Tải bản PDF</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      <div className="sr-card-bottom">
                        <span className="sr-card-date">
                          {(() => {
                            const dateVal = item.publishedAt || item.publish_date || item.createdAt || item.created_at;
                            const m = moment(dateVal, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]);
                            return m.isValid() ? m.format("DD/MM/YYYY") : "16/06/2025";
                          })()}
                        </span>
                        <div className="sr-card-stats">
                          <div className="sr-stat">
                            <Eye size={16} />
                            <span>{item.viewCount || 0}</span>
                          </div>
                          <div className="sr-stat">
                            <Heart size={16} />
                            <span>{item.likeCount || 0}</span>
                          </div>
                          <div className="sr-stat">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6.66699 2.14844C5.73079 2.36202 4.85951 2.79712 4.1263 3.41719C3.39309 4.03725 2.81935 4.8242 2.45328 5.71193C2.0872 6.59966 1.93946 7.56227 2.02247 8.51893C2.10548 9.47558 2.41681 10.3984 2.93032 11.2098L2.00032 13.9998L4.79032 13.0698C5.60173 13.5833 6.52451 13.8946 7.48117 13.9776C8.43783 14.0606 9.40043 13.9129 10.2882 13.5468C11.1759 13.1807 11.9628 12.607 12.5829 11.8738C13.203 11.1406 13.6381 10.2693 13.8517 9.3331M13.8517 6.66644C13.5999 5.56457 13.0424 4.55609 12.2432 3.75688C11.444 2.95767 10.4355 2.40017 9.33366 2.14844M11.3337 7.99977C11.3337 7.11572 10.9825 6.26787 10.3573 5.64275C9.73223 5.01763 8.88438 4.66644 8.00032 4.66644M8.66699 7.99977C8.66699 7.82296 8.59675 7.65339 8.47173 7.52837C8.3467 7.40334 8.17714 7.3331 8.00032 7.3331" stroke="#616161" strokeOpacity="0.7" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>{item.commentCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              </>
            ) : (
              <div className="sr-no-results">Không tìm thấy kết quả phù hợp.</div>
            )}
          </div>

          {/* 4. Right: Sidebar */}
          <div className="sr-sidebar">
            <div className="sr-side-card">
              <h3 className="sr-side-title">Hạng mục tìm kiếm</h3>
              <div className="sr-category-list">
                {categorySummary.map((cat) => (
                  <div key={cat.id} className={"sr-cat-item " + (cat.active ? 'active' : '')}>
                    <div className="sr-cat-label">{cat.icon} {cat.label}</div>
                    <span className="sr-cat-count">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sr-promo-card">
              <div className="sr-promo-pattern"></div>
              <h3 className="sr-promo-title">Không tìm thấy kết quả bạn cần?</h3>
              <p className="sr-promo-desc">Tối ưu với bộ lọc.<br />Hoặc mở rộng tìm kiếm trên toàn bộ D-office!</p>
            </div>
          </div>
        </div>
        
        {/* Pagination moved outside layout grid to center correctly */}
        {totalPages > 1 && (
          <div className="sr-pagination">
            <button className="sr-pg-btn" onClick={onGoToFirstPageClick} disabled={currentPage === 1}><ChevronsLeft size={16} /></button>
            <button className="sr-pg-btn" onClick={onGoToPrevPageClick} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
            <div className="sr-pg-nums">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="sr-pg-dots">...</span>}
                    <button className={"sr-pg-num " + (currentPage === p ? 'active' : '')} onClick={onGoToPageClick(p)}>{p}</button>
                  </React.Fragment>
                ))
              }
            </div>
            <button className="sr-pg-btn" onClick={onGoToNextPageClick} disabled={currentPage === totalPages}><ChevronRight size={16} /></button>
            <button className="sr-pg-btn" onClick={onGoToLastPageClick} disabled={currentPage === totalPages}><ChevronsRight size={16} /></button>
          </div>
        )}
      </div>

      <style>{`
        .sr-page-wrapper {
          background: transparent;
          width: 100%;
          min-height: 100vh;
          font-family: 'Be Vietnam Pro', sans-serif;
        }
        .sr-hero {
          background: url('/anhtrongdong.png') no-repeat center center;
          background-size: cover;
          padding: 40px 20px 60px 20px;
          position: relative;
          overflow: hidden;
          text-align: center;
          width: 100%;
        }
        .sr-hero-pattern {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 40%;
          background: url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Vietnam_Dong_Son_drum.svg/500px-Vietnam_Dong_Son_drum.svg.png') no-repeat right center;
          background-size: contain;
          opacity: 0.05;
        }
        .sr-hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
        .sr-breadcrumb { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: #64748b; margin-bottom: 20px; }
        .sr-breadcrumb span { cursor: pointer; }
        .sr-breadcrumb .active { color: #2563eb; font-weight: 600; }
        .sr-topic-header { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 30px; }
        .sr-topic-name { font-size: 26px; font-weight: 400; color: #2563eb; margin: 0; }
        .sr-search-bar { 
          background: white; border-radius: 40px; padding: 10px 24px; display: flex; align-items: center; gap: 15px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto;
        }
        .sr-search-bar input { border: none; outline: none; flex: 1; font-size: 15px; color: #1e293b; padding: 8px 0; }
        .sr-search-icon, .sr-mic-icon { color: #3b82f6; cursor: pointer; transition: all 0.2s; }
        
        .sr-mic-icon.listening {
          animation: sr-listening-pulse 1.5s infinite;
        }

        @keyframes sr-listening-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        .sr-main-content { max-width: 1550px; margin: 0 auto; padding: 40px 20px; }
        .sr-results-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
        .sr-result-title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 10px 0; }
        .sr-result-meta { font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 8px; }
        .sr-result-meta select { border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px 6px; background: white; }
        .sr-rh-right { display: flex; gap: 12px; align-items: center; }
        .sr-filter-container { position: relative; }
        .sr-filter-pill { 
          background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 20px; 
          font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 8px; cursor: pointer;
          transition: all 0.2s;
        }
        .sr-filter-pill:hover, .sr-filter-pill.active { border-color: #3b82f6; color: #3b82f6; }
        
        .sr-location-dropdown {
          position: absolute; top: 100%; left: 0; width: 220px; background: white;
          border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #f1f5f9;
          padding: 12px 0; z-index: 100; margin-top: 8px;
        }
        .sr-loc-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 20px;
          cursor: pointer; transition: background 0.2s;
        }
        .sr-loc-item:hover { background: #f8fafc; }
        .sr-loc-label { font-size: 14px; font-weight: 500; color: #1e293b; }
        .sr-loc-sub { font-size: 11px; color: #94a3b8; margin-left: auto; }
        .sr-loc-divider { height: 1px; background: #f1f5f9; margin: 8px 16px; }
        
        .sr-loc-radio {
          width: 18px; height: 18px; border: 2px solid #cbd5e1; border-radius: 50%;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .sr-loc-radio.active { border-color: #3b82f6; }
        .sr-loc-radio.active::after {
          content: ""; width: 8px; height: 8px; background: #3b82f6; border-radius: 50%;
        }
        .sr-loc-cb { border-radius: 4px; flex-shrink: 0; }
        .sr-loc-label-wrap { display: flex; align-items: center; gap: 8px; flex: 1; }

        .sr-unit-dropdown {
          position: absolute; top: 100%; right: 0; width: 240px; background: white;
          border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #f1f5f9;
          padding: 12px 0; z-index: 100; margin-top: 8px;
        }
        .sr-unit-list { max-height: 280px; overflow-y: auto; }
        .sr-unit-list::-webkit-scrollbar { width: 4px; }
        .sr-unit-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        .sr-dropdown-search {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 4px;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .sr-dropdown-search svg { color: #94a3b8; flex-shrink: 0; }
        .sr-dropdown-search input {
          border: none;
          background: none;
          outline: none;
          font-size: 13px;
          color: #1e293b;
          width: 100%;
          padding: 4px 0;
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
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
        }
        @media (max-width: 1200px) {
          .nd-back-button-fixed {
            left: 20px; /* Thu hẹp khoảng cách khi màn hình nhỏ đi */
          }
        }
        .sr-search-clear {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .sr-search-clear:hover { color: #64748b; }
        .sr-no-results.mini {
          padding: 20px;
          font-size: 13px;
          color: #94a3b8;
          text-align: center;
        }

        .sr-hidden-datepicker {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .sr-sort-toggle { 
          background: white; border: 1px solid #e2e8f0; width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer;
          transition: all 0.2s;
        }
        .sr-sort-toggle:hover { border-color: #3b82f6; color: #3b82f6; }
        .sr-sort-toggle.asc { background: #3b82f6; color: white; border-color: #3b82f6; transform: rotate(180deg); }

        .sr-date-dropdown-container {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 1001;
          animation: srFadeIn 0.2s ease-out;
        }

        .sr-date-dropdown-header {
          background: #3b82f6;
          color: white;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 12px 12px 0 0;
          text-align: center;
        }

        @keyframes srFadeIn {
          from { opacity: 0; transform: translate(-50%, 5px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        .sr-layout-grid { display: grid; grid-template-columns: 1fr 320px; gap: 40px; }
        .sr-list-container { 
          background: white; 
          border-radius: 24px; 
          padding: 20px 40px; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .sr-card { 
          display: flex; 
          gap: 28px; 
          padding: 28px 0;
          cursor: pointer; 
          transition: all 0.2s;
          border-bottom: 1px solid #f1f5f9;
        }
        .sr-card:last-child { border-bottom: none; }
        .sr-card:hover .sr-card-title { color: #2563eb; }
        
        .sr-card-img-box { 
          position: relative;
          width: 220px; 
          height: 135px; 
          border-radius: 16px; 
          overflow: hidden; 
          flex-shrink: 0; 
          background: #f1f5f9; 
        }
        .sr-card-img-box img { width: 100%; height: 100%; object-fit: cover; }
        
        .sr-play-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s;
        }
        .sr-card:hover .sr-play-overlay { background: rgba(0,0,0,0.4); }
        .sr-play-icon {
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: transform 0.3s;
        }
        .sr-play-icon svg { width: 24px; height: 24px; margin-left: 3px; }
        .sr-card:hover .sr-play-icon { transform: scale(1.1); }
        
        .sr-card-info { flex: 1; display: flex; flex-direction: column; }
        .sr-card-badge { 
          background: #eff6ff; 
          color: #64748b; 
          font-size: 11px; 
          font-weight: 500; 
          padding: 4px 12px; 
          border-radius: 20px;
          display: inline-block;
          width: fit-content;
          margin-bottom: 12px;
        }
        
        .sr-card-mid { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 7px; }
        .sr-card-title { 
          font-size: 18px; 
          font-weight: 400; 
          color: #1e293b; 
          margin: 0; 
          line-height: 1.4; 
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .sr-menu-container { position: relative; }
        .sr-card-more { 
          background: none; border: none; color: #94a3b8; cursor: pointer; padding: 6px; border-radius: 8px; 
          transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .sr-card-more:hover, .sr-card-more.active { background: #eff6ff; color: #3b82f6; }
        
        .sr-action-menu {
          position: absolute; top: 100%; right: 0; width: 180px; background: white; 
          border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #f1f5f9;
          padding: 8px; z-index: 100; margin-top: 8px;
        }
        .sr-menu-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 12px;
          border-radius: 8px; font-size: 14px; color: #475569; cursor: pointer; transition: all 0.2s;
          position: relative;
        }
        .sr-menu-item:hover { background: #f8fafc; color: #2563eb; }
        .sr-menu-divider { height: 1px; background: #f1f5f9; margin: 6px 0; }
        
        .sr-menu-item.has-submenu { justify-content: space-between; }
        .sr-menu-item-left { display: flex; align-items: center; gap: 12px; }
        
        .sr-share-submenu {
          position: absolute; top: 0; right: 100%; width: 200px; background: white;
          border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #f1f5f9;
          padding: 8px; margin-right: 12px;
          z-index: 1001;
        }
        /* Tạo cầu nối tàng hình để không bị mất hover khi di chuyển chuột giữa 2 popup */
        .sr-share-submenu::after {
          content: "";
          position: absolute;
          top: 0;
          right: -15px;
          width: 15px;
          height: 100%;
          background: transparent;
        }

        .sr-card-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
        .sr-card-date { font-size: 13px; color: #94a3b8; }
        .sr-card-stats { display: flex; gap: 20px; }
        .sr-stat { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #94a3b8; font-weight: 500; }

        .sr-side-card { background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
        .sr-side-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 20px 0; }
        .sr-cat-item { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 14px 12px; border-radius: 10px; cursor: pointer; 
          color: #64748b; transition: all 0.2s;
          border-bottom: 1px solid #f1f5f9;
        }
        .sr-cat-item:last-child { border-bottom: none; }
        .sr-cat-item:hover { background: #f8fafc; }
        .sr-cat-item.active { color: #2563eb; }
        .sr-cat-label { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: inherit; }
        .sr-cat-label :global(svg) { color: #3b82f6; opacity: 0.8; }
        .sr-cat-count { 
          font-size: 11px; color: #64748b; background: #f1f5f9; 
          padding: 2px 10px; border-radius: 10px; font-weight: 600;
          transition: all 0.2s;
        }
        .sr-cat-item.active .sr-cat-count { background: #dbeafe; color: #2563eb; }

        .sr-promo-card { 
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 20px; padding: 40px 24px;
          position: relative; overflow: hidden;
        }
        .sr-promo-pattern {
          position: absolute; top: 0; right: 0; bottom: 0; left: 0;
          background: url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Vietnam_Dong_Son_drum.svg/500px-Vietnam_Dong_Son_drum.svg.png') no-repeat center;
          background-size: 180%; opacity: 0.03;
        }
        .sr-promo-title { font-size: 18px; font-weight: 700; color: #2563eb; margin: 0 0 16px 0; position: relative; line-height: 1.4; }
        .sr-promo-desc { font-size: 14px; color: #1e40af; opacity: 0.8; line-height: 1.6; margin: 0; position: relative; }

        .sr-pagination { display: flex; justify-content: center; align-items: center; gap: 24px; margin-top: 50px; padding-bottom: 40px; }
        .sr-pg-btn { 
          width: 32px; height: 32px; border: none; background: transparent; color: #94a3b8; 
          cursor: pointer; display: flex; align-items: center; justify-content: center; 
          transition: all 0.2s; 
        }
        .sr-pg-btn:hover:not(:disabled) { color: #3b82f6; transform: scale(1.1); }
        .sr-pg-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .sr-pg-nums { display: flex; align-items: center; gap: 12px; }
        .sr-pg-num { 
          width: 40px; height: 40px; border-radius: 50%; border: none; background: transparent; 
          color: #64748b; font-size: 15px; font-weight: 500; cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          display: flex; align-items: center; justify-content: center;
        }
        .sr-pg-num:hover:not(.active) { background: #f1f5f9; color: #3b82f6; }
        .sr-pg-num.active { 
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
          color: white; 
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
          transform: scale(1.05);
        }
        .sr-pg-dots { color: #94a3b8; padding: 0 4px; font-weight: 600; }

        /* Media Edit Popup Styles */
        .sr-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
          justify-content: center; z-index: 10002;
        }
        .rgv-edit-popup {
          background: white; width: 90%; max-width: 450px; border-radius: 16px;
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
        .rgv-edit-footer { padding: 16px 24px; background: #f8fafc; border-radius: 0 0 16px 16px; display: flex; justify-content: flex-end; gap: 12px; }
        .rgv-btn-cancel { padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748b; background: white; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
        .rgv-btn-cancel:hover { background: #f1f5f9; }
        .rgv-btn-save { padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 500; color: white; border: none; cursor: pointer; transition: all 0.2s; background: #3b82f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .rgv-btn-save:hover { background: #2563eb; transform: translateY(-1px); }

        @media (max-width: 1024px) {
          .sr-layout-grid { grid-template-columns: 1fr; }
          .sr-list-container { padding: 20px; }
        }
        @media (max-width: 768px) {
          .sr-main-content { padding: 20px 16px; }
          .nd-back-button-fixed {
            top: 15px;
            left: 15px;
            width: 36px;
            height: 36px;
          }
          .sr-results-header { flex-direction: column; align-items: stretch; gap: 16px; }
          .sr-rh-right { 
            display: flex;
            flex-wrap: wrap; 
            gap: 10px;
            overflow: visible; /* Crucial: show dropdowns */
          }
          .sr-filter-container, .sr-unit-filter-container { flex: 1; min-width: 140px; }
          .sr-filter-pill { width: 100%; justify-content: center; white-space: nowrap; }
          
          .sr-card { flex-direction: column; gap: 12px; padding: 20px 0; }
          .sr-card-img-box { width: 100%; height: 200px; border-radius: 12px; }
          .sr-card-mid { flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 12px; }
          .sr-card-title { font-size: 16px; }
          
          .sr-menu-container { 
            position: relative; 
            display: flex; 
            justify-content: flex-end; 
            min-width: 32px; 
          }

          .sr-action-menu {
            position: absolute;
            top: 100%;
            right: 0;
            width: 170px;
            z-index: 100;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            display: block !important;
          }

          .sr-share-submenu {
            position: absolute;
            top: 0;
            right: 100%;
            width: 160px;
            margin-right: 8px;
            display: block !important;
          }

          .sr-menu-item { padding: 10px 12px; font-size: 13px; }
          
          .sr-location-dropdown, .sr-unit-dropdown {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90vw;
            max-width: 300px;
            max-height: 80vh;
            z-index: 10001;
            box-shadow: 0 0 0 100vmax rgba(0,0,0,0.5);
            border-radius: 20px;
            padding: 12px;
          }
        }
        @media (max-width: 640px) {
          .sr-topic-name { font-size: 20px; }
          .sr-result-title { font-size: 16px; }
          .sr-list-container { padding: 16px; }
          .sr-pg-nums { display: none; }
        }
      `}</style>
      <EditNewsModal
        isOpen={isEditModalOpen}
        onClose={onEditModalClose}
        data={editingRecord}
        onSuccess={onEditSuccess}
      />

      {/* Media Edit Modal (Title Only) */}
      {isMediaEditModalOpen && (
        <div className="sr-modal-overlay" onClick={onMediaEditModalClose}>
          <div className="rgv-edit-popup" onClick={onMenuClick}>
            <div className="rgv-edit-header">
              <h3>Chỉnh sửa tiêu đề</h3>
              <button className="rgv-close-mini" onClick={onMediaEditModalClose}><X size={18} /></button>
            </div>
            <div className="rgv-edit-body">
              <label>Tiêu đề bản ghi</label>
              <input
                type="text"
                value={mediaEditTitle}
                onChange={onMediaEditTitleChange}
                placeholder="Nhập tiêu đề mới..."
                autoFocus
              />
            </div>
            <div className="rgv-edit-footer">
              <button className="rgv-btn-cancel" onClick={onMediaEditModalClose}>Hủy bỏ</button>
              <button className="rgv-btn-save" onClick={onMediaSaveClick}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && modalItem && modalItem.type === 'video' && (
        <VideoPlayerModal
          item={activeMediaData}
          videoUrl={activeMediaData?.videoUrl || ""}
          isLiked={(itemLikes[modalItem?.id] ? itemLikes[modalItem?.id].isLiked : modalItem?.meLike)}
          onClose={onModalClose}
          onLike={handleLikeMedia}
        />
      )}

      {isModalOpen && modalItem && (modalItem.type === 'image' || modalItem.type === 'album') && (
        <ImageGalleryModal
          item={activeMediaData}
          onClose={onModalClose}
        />
      )}
    </div>
  );
}
