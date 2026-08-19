"use client";

import React, { useState, useEffect, useMemo, useCallback, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublishedNews, fetchLatestNews, fetchMostViewedNews, fetchFavoriteNews } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { API_LIKE_COMMENT, API_TOPPICS, API_DON_VI } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import moment from "moment";
import "moment/locale/vi";
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
  Square,
  CheckSquare,
  Mic,
  Pencil,
  ArrowLeft 
} from "lucide-react";
import { toast } from "react-toastify";
import { AuthContext } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/AuthProvider";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import AuthModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/AuthModal";
import ErrorState from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/ErrorState";
import ShareModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/ShareModal";
import { globalComponentRegistry } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import { getResponsiveImage, DEFAULT_NEWS_THUMBNAIL } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/imageHelper";
import CustomDatePicker from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/common/CustomDatePicker";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';


moment.locale("vi");

export default function NewsGridView({ topic }) {
  const { setActivePage } = useCMS();
  const { user } = useContext(AuthContext);
  const dispatch = useDispatch();
  const {
    newsList, loading, error, latestNews, mostViewedNews, favoriteNews,
    totalNews, totalLatestNews, totalMostViewedNews, totalFavoriteNews
  } = useSelector((state) => state.news);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [sortOrder, setSortOrder] = useState("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [, setShowSortDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setTopics] = useState([]);
  const [topicId, setTopicId] = useState(null);
  const [optimisticLikes, setOptimisticLikes] = useState({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // const fromDateRef = React.useRef(null);
  // const toDateRef = React.useRef(null);
  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [topicNameFromId, setTopicNameFromId] = useState("");


  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const urlTopicId = searchParams ? searchParams.get('topicId') : null;
  const urlTopicName = searchParams ? searchParams.get('topicName') : null;

  const currentSortBy = useMemo(() => {
    if (currentTab === 'mostViewed') return "viewCount";
    if (currentTab === 'favorite') return "likeCount";
    return "publishedAt";
  }, [currentTab]);

  useEffect(() => {
    setTopicId(null);
    const fetchTopics = async () => {
      try {
        const response = await axiosClient.get(API_TOPPICS);
        const topicsData = response?.data || [];
        setTopics(topicsData);
        if (urlTopicId) {
          setTopicId(urlTopicId); // Không dùng Number() vì ID có thể là chuỗi UUID
          const found = topicsData.find(t => String(t.id) === String(urlTopicId));
          if (found) setTopicNameFromId(found.name);
        } else if (topic && topicsData.length > 0) {
          const foundTopic = topicsData.find(t => t.name === topic);
          if (foundTopic) setTopicId(foundTopic.id);
        }
      } catch (error) {
        logger.error("Error fetching topics:", error);
      }
    };
    fetchTopics();

    const fetchUnits = async () => {
      // Only fetch units if user is logged in
      if (!user) return;

      try {
        const response = await axiosClient.get(API_DON_VI, { params: { limit: 1000 } });
        if (response?.success) {
          setUnits(response.data || []);
        }
      } catch (error) {
        logger.error("Error fetching units:", error);
      }
    };
    fetchUnits();
  }, [topic, urlTopicId, user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.ng-filter-container') &&
        !event.target.closest('.ng-date-picker-wrap')) {
        setShowUnitDropdown(false);
        setShowFromPicker(false);
        setShowToPicker(false);
      }
      
      if (!event.target.closest('.ng-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      logger.error("Speech Recognition Error:", event.error);
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
      // Auto trigger search after voice recognition
      setTimeout(() => {
        handleSearch();
      }, 500);
    };

    recognition.start();
  };

  const handleSearch = useCallback(() => {
    const params = {
      'filter[title]': searchQuery,
      sortBy: currentSortBy,
      sortOrder: sortOrder,
      limit: itemsPerPage,
      page: 1 // Tìm kiếm mới luôn về trang 1
    };

    if (fromDate) params['filter[publishedAt][startDate]'] = fromDate;
    if (toDate) params['filter[publishedAt][endDate]'] = toDate;
    if (selectedUnits.length > 0) params['filter[authorDepartment]'] = JSON.stringify(selectedUnits);



    if (topicId) params['filter[topic]'] = topicId;
    if (currentTab === 'mostViewed') dispatch(fetchMostViewedNews(params));
    else if (currentTab === 'favorite') dispatch(fetchFavoriteNews(params));
    else if (currentTab === 'newest') dispatch(fetchLatestNews(params));
    else {
      dispatch(fetchPublishedNews(params));
    }
  }, [searchQuery, currentSortBy, sortOrder, itemsPerPage, fromDate, toDate, selectedUnits, topicId, currentTab, dispatch]);

  const handleLike = useCallback(async (e, item) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const isLiked = optimisticLikes[item.id]?.meLike ?? item.meLike ?? false;
    const currentCount = optimisticLikes[item.id]?.likeCount ?? item.likeCount ?? 0;

    const newMeLike = !isLiked;
    const newLikeCount = newMeLike ? currentCount + 1 : Math.max(0, currentCount - 1);

    setOptimisticLikes(prev => ({
      ...prev,
      [item.id]: { meLike: newMeLike, likeCount: newLikeCount }
    }));

    try {
      await axiosClient.post(API_LIKE_COMMENT, {
        type: "NEWS",
        objectId: Number(item.id),
        isLike: newMeLike
      });
    } catch (error) {
      setOptimisticLikes(prev => ({
        ...prev,
        [item.id]: { meLike: isLiked, likeCount: currentCount }
      }));
    }
  }, [user, optimisticLikes]);

  useEffect(() => {
    // Nếu có topic trên URL nhưng state topicId chưa được cập nhật thì chờ
    if (urlTopicId && !topicId) return;
    // Nếu có prop topic nhưng chưa tìm thấy topicId tương ứng cũng chờ
    if (topic && !topicId && !urlTopicId) return;

    const params = {
      sortBy: currentSortBy,
      sortOrder: sortOrder,
      limit: itemsPerPage,
      page: currentPage
    };
    if (fromDate) params['filter[publishedAt][startDate]'] = fromDate;
    if (toDate) params['filter[publishedAt][endDate]'] = toDate;
    if (selectedUnits.length > 0) params['filter[authorDepartment]'] = JSON.stringify(selectedUnits);

    // Luôn ưu tiên dùng topicId nếu có
    if (topicId) params['filter[topic]'] = topicId;

    if (currentTab === 'mostViewed') dispatch(fetchMostViewedNews(params));
    else if (currentTab === 'favorite') dispatch(fetchFavoriteNews(params));
    else if (currentTab === 'newest') dispatch(fetchLatestNews(params));
    else {
      dispatch(fetchPublishedNews(params));
    }
  }, [dispatch, topicId, currentTab, topic, urlTopicId, currentSortBy, sortOrder, fromDate, toDate, selectedUnits, currentPage, itemsPerPage]);



  useEffect(() => {
    setCurrentPage(1);
    setSortOrder("DESC");
  }, [topicId, currentTab]);

  const { activeItems, totalCount } = useMemo(() => {
    let items = [];
    let total = 0;

    if (currentTab === 'mostViewed') {
      items = mostViewedNews;
      total = totalMostViewedNews;
    } else if (currentTab === 'favorite') {
      items = favoriteNews;
      total = totalFavoriteNews;
    } else if (currentTab === 'newest') {
      items = latestNews;
      total = totalLatestNews;
    } else {
      items = newsList;
      total = totalNews;
    }

    const baseList = Array.isArray(items) ? items : (items?.items || []);

    const processedItems = baseList.map(item => {
      if (optimisticLikes[item.id]) {
        return {
          ...item,
          meLike: optimisticLikes[item.id].meLike,
          likeCount: optimisticLikes[item.id].likeCount
        };
      }
      return item;
    });

    return { activeItems: processedItems, totalCount: total };
  }, [newsList, latestNews, mostViewedNews, favoriteNews, totalNews, totalLatestNews, totalMostViewedNews, totalFavoriteNews, currentTab, optimisticLikes]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const currentItems = activeItems; // Dữ liệu từ API đã đúng trang rồi

  const onGlobalClick = useCallback(() => setShowSortDropdown(false), []);
  const onAuthModalClose = useCallback(() => setShowAuthModal(false), []);
  const onGoHomeClick = useCallback(() => {
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
    onGoHomeClick(); // Fallback về trang chủ nếu không có lịch sử
  }, [setActivePage, onGoHomeClick]);

  const onSearchQueryChange = useCallback((e) => setSearchQuery(e.target.value), []);
  const onSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const onPageSizeChange = useCallback((e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  }, []);

  const onDatePickerWrapClick = useCallback((e) => {
    e.stopPropagation();
    setShowUnitDropdown(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      setShowFromPicker((prev) => !prev);
      setShowToPicker(false);
    } else {
      setShowToPicker((prev) => !prev);
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

  const onUnitFilterClick = useCallback((e) => {
    e.stopPropagation();
    setShowUnitDropdown(prev => {
      const nextState = !prev;
      if (nextState) {
        setShowFromPicker(false);
        setShowToPicker(false);
      }
      return nextState;
    });
  }, []);

  const onSelectAllUnitsClick = useCallback(() => {
    if (selectedUnits.length === units.length) {
      setSelectedUnits([]);
    } else {
      setSelectedUnits(units.map(u => u.id));
    }
  }, [selectedUnits.length, units]);

  const onUnitItemClick = useCallback((unitId) => () => {
    setSelectedUnits(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  }, []);

  const onSortBtnClick = useCallback((e) => {
    e.stopPropagation();
    setSortOrder(prev => prev === "DESC" ? "ASC" : "DESC");
  }, []);

  const onCardClick = useCallback((item) => () => {
    const url = ROUTES.newsDetail(item.id);
    const fromUrl = window.location.pathname + window.location.search;
    setActivePage(url);
    window.history.pushState({ fromUrl }, "", url);
    window.scrollTo(0, 0);
  }, [setActivePage]);

  const onImageError = useCallback((e) => {
    e.target.onerror = null;
  }, []);

  const onCardLikeClick = useCallback((item) => (e) => {
    handleLike(e, item);
  }, [handleLike]);

  const onPageFirstClick = useCallback(() => setCurrentPage(1), []);
  const onPagePrevClick = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), []);
  const onPageNumClick = useCallback((p) => () => setCurrentPage(p), []);
  const onPageNextClick = useCallback(() => setCurrentPage(prev => Math.min(totalPages, prev + 1)), [totalPages]);
  const onPageLastClick = useCallback(() => setCurrentPage(totalPages), [totalPages]);

  const micIconClassName = "ng-mic-icon" + (isListening ? " listening" : "");
  const filterDateClassName = "ng-filter-item" + ((fromDate || toDate) ? " active" : "");
  const filterUnitClassName = "ng-filter-item" + (showUnitDropdown ? " active" : "");
  const unitRadioAllClassName = "ng-unit-radio" + (selectedUnits.length === units.length ? " active" : "");
  const sortBtnClassName = "ng-sort-btn" + (sortOrder === "ASC" ? " asc" : "");

  const onRetryClick = useCallback(() => window.location.reload(), []);

  const onToggleMenu = useCallback((itemId) => (e) => {
    e.stopPropagation();
    setActiveMenuId(prev => prev === itemId ? null : itemId);
  }, []);

  const onCardView = useCallback((item) => (e) => {
    e.stopPropagation();
    const url = ROUTES.newsDetail(item.id);
    const fromUrl = window.location.pathname + window.location.search;
    setActivePage(url);
    window.history.pushState({ fromUrl }, "", url);
    window.scrollTo(0, 0);
    setActiveMenuId(null);
  }, [setActivePage]);

  const onShareClick = useCallback((item) => (e) => {
    e.stopPropagation();
    setSelectedItem(item);
    setShowShareModal(true);
    setActiveMenuId(null);
  }, []);



  const onEditSuccess = useCallback(() => {
    handleSearch(); // Refresh the list
  }, [handleSearch]);
  
    const onEditClick = useCallback((item) => (e) => {
    e.stopPropagation();
    setSelectedItem(item);
    
    openDetailDialog(globalComponentRegistry.EDIT_NEWS, item.id, {
      onSuccess: onEditSuccess,
      autoClose: true
    });

    setActiveMenuId(null);
  }, [onEditSuccess]);

  const onStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const onCloseShareModal = useCallback(() => {
    setShowShareModal(false);
  }, []);

  if (error) {
    return <ErrorState title="Không thể tải danh sách tin" onRetry={onRetryClick} />;
  }

  return (
    <div className="news-grid-page-redesign" onClick={onGlobalClick}>
      <AuthModal isOpen={showAuthModal} onClose={onAuthModalClose} />

      {/* Hero Banner Section */}
      <div className="ng-hero-banner">
        <div className="ng-hero-pattern"></div>
        <button
          className="nd-back-button-fixed"
          onClick={onBackClick}
          type="button"
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ng-hero-content">
          <div className="ng-breadcrumb-new">
            <span
              onClick={onGoHomeClick}
              style={{ cursor: 'pointer' }}
            >
              Trang chủ
            </span>
            <ChevronRight size={14} />
            <span className="ng-current-page-bc">{urlTopicName || topicNameFromId || topic || "Tin tức"}</span>
          </div>
          <div className="ng-topic-title-box">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.4167 14.6667L19.25 11L15.5833 10.1851M15.5833 10.1851L11 9.16667M15.5833 10.1851L16.5 5.5H12.8333M11 9.16667V13.75M11 9.16667L6.41667 10.1851M6.41667 10.1851L2.75 11L4.58333 14.6667M6.41667 10.1851L5.5 5.5H9.16667M9.16667 5.5V2.75H12.8333V5.5M9.16667 5.5H12.8333M2.75 18.3333L3.89125 17.8768C4.24607 17.7349 4.63008 17.6815 5.01016 17.7211C5.39023 17.7607 5.75497 17.8922 6.07292 18.1042C6.54852 18.4213 7.1232 18.5547 7.68987 18.4795C8.25653 18.4042 8.77652 18.1256 9.15292 17.6953L9.185 17.6587C9.41128 17.3998 9.6903 17.1924 10.0033 17.0503C10.3164 16.9081 10.6562 16.8346 11 16.8346C11.3438 16.8346 11.6836 16.9081 11.9967 17.0503C12.3097 17.1924 12.5887 17.3998 12.815 17.6587L12.848 17.6953C13.2244 18.1256 13.7444 18.4042 14.3111 18.4795C14.8777 18.5547 15.4524 18.4213 15.928 18.1042C16.2459 17.8922 16.6107 17.7607 16.9908 17.7211C17.3708 17.6815 17.7548 17.7349 18.1097 17.8768L19.25 18.3333" stroke="url(#paint0_linear_2375_8282)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="paint0_linear_2375_8282" x1="3.75833" y1="-1.74999" x2="21.9056" y2="-0.0241592" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22A6EC" />
                  <stop offset="1" stopColor="#4363EF" />
                </linearGradient>
              </defs>
            </svg>
            <h2 className="ng-hero-topic-name">{urlTopicName || topicNameFromId || topic || "Tin tức"}</h2>
          </div>
          <div className="ng-search-wrapper">
            <div className="ng-search-box">
              <div className="ng-search-left">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" onClick={handleSearch} style={{ cursor: 'pointer' }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Nhập bài viết, từ khóa..."
                  className="ng-search-input"
                  value={searchQuery}
                  onChange={onSearchQueryChange}
                  onKeyDown={onSearchKeyDown}
                />
              </div>
              <span
                className={micIconClassName}
                onClick={handleVoiceSearch}
                style={{
                  color: isListening ? '#ef4444' : '#3b82f6',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Mic size={20} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ng-container">
        {/* Header Section */}
        <div className="ng-header">
          <div className="ng-header-left">
            <h1 className="ng-title">Bảng tin</h1>
            <div className="ng-meta">
              Hiển thị:
              <select
                className="ng-limit-select"
                value={itemsPerPage}
                onChange={onPageSizeChange}
              >
                <option value="9">9</option>
                <option value="18">18</option>
                <option value="27">27</option>
              </select>
              <span className="ng-total">/ {totalCount} tin</span>
            </div>
          </div>

          <div className="ng-header-right">
            <div className="ng-date-picker-wrap" style={{ position: 'relative' }}>
              <div
                className={filterDateClassName}
                style={{ minWidth: '180px', justifyContent: 'center' }}
                onClick={onDatePickerWrapClick}
              >
                <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>
                  {(fromDate || toDate) ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {fromDate ? moment(fromDate).format("DD/MM/YYYY") : "Từ ngày"}
                      <span style={{ color: '#cbd5e1' }}>-</span>
                      {toDate ? moment(toDate).format("DD/MM/YYYY") : "Đến ngày"}
                    </span>
                  ) : (
                    "Thời gian đăng bài"
                  )}
                </span>

                {(fromDate || toDate) ? (
                  <span
                    onClick={onClearDateClick}
                    style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', marginLeft: '6px' }}
                  >
                    &times;
                  </span>
                ) : (
                  <span style={{ marginLeft: '8px' }}>
                    <Calendar size={16} />
                  </span>
                )}
              </div>

              {showFromPicker && (
                <div className="ng-date-dropdown-container from">
                  <div className="ng-date-dropdown-header">Chọn ngày bắt đầu</div>
                  <CustomDatePicker
                    value={fromDate}
                    onChange={onFromDateChange}
                    onClose={onFromDateClose}
                  />
                </div>
              )}

              {showToPicker && (
                <div className="ng-date-dropdown-container to">
                  <div className="ng-date-dropdown-header">Chọn ngày kết thúc</div>
                  <CustomDatePicker
                    value={toDate}
                    onChange={onToDateChange}
                    onClose={onToDateClose}
                  />
                </div>
              )}
            </div>

            <div className="ng-filter-container" style={{ position: 'relative' }}>
              <div
                className={filterUnitClassName}
                onClick={onUnitFilterClick}
              >
                <span>
                  {selectedUnits.length > 0
                    ? `Đơn vị (${selectedUnits.length})`
                    : "Đơn vị"}
                </span>
                <ChevronDown size={16} />
              </div>

              {showUnitDropdown && (
                <div className="ng-unit-dropdown">
                  <div
                    className="ng-unit-item all"
                    onClick={onSelectAllUnitsClick}
                  >
                    <div className={unitRadioAllClassName}>
                      <div className="ng-unit-radio-inner"></div>
                    </div>
                    <div className="ng-unit-label-wrap">
                      <span className="ng-unit-label">Chọn tất cả</span>
                      <span className="ng-unit-sub">{units.length} hạng mục</span>
                    </div>
                  </div>

                  <div className="ng-unit-divider"></div>

                  <div className="ng-unit-list">
                    {units.map(unit => {
                      const isSelected = selectedUnits.includes(unit.id);
                      return (
                        <div
                          key={unit.id}
                          className="ng-unit-item"
                          onClick={onUnitItemClick(unit.id)}
                        >
                          {isSelected ? (
                            <span className="ng-unit-cb active" style={{ color: "#fff" }}>
                              <CheckSquare size={18} fill="#3b82f6" />
                            </span>
                          ) : (
                            <span className="ng-unit-cb" style={{ color: "#cbd5e1" }}>
                              <Square size={18} />
                            </span>
                          )}
                          <span className="ng-unit-label">{unit.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button
              className={sortBtnClassName}
              onClick={onSortBtnClick}
              title={sortOrder === "DESC" ? "Mới nhất trước" : "Cũ nhất trước"}
            >
              <ArrowUpDown size={18} />
            </button>
          </div>
        </div>

        {/* Grid Content */}
        <div className="ng-grid">
          {loading ? (
            Array(itemsPerPage).fill(0).map((_, i) => (
              <div key={`skeleton-${i}`} className="ng-card skeleton-box">
                <div className="skeleton ng-skeleton-img"></div>
                <div className="ng-card-body">
                  <div className="skeleton ng-skeleton-line" style={{ width: '40%' }}></div>
                  <div className="skeleton ng-skeleton-line"></div>
                  <div className="skeleton ng-skeleton-line" style={{ width: '80%' }}></div>
                </div>
              </div>
            ))
          ) : (
            currentItems.map((item) => {
              const resImage = getResponsiveImage(item);
              return (
                <div key={item.id} className="ng-card" onClick={onCardClick(item)}>
                  <div className="ng-card-img-box">
                    <AuthImage
                      src={resImage.src?.includes('placeholder.com') ? DEFAULT_NEWS_THUMBNAIL : resImage.src}
                      alt={item.title}
                      customClassName="ng-card-img"
                      onError={onImageError}
                    />
                  </div>
                  <div className="ng-card-body">
                    <span className="ng-card-date">
                      {(() => {
                        const dateVal = item.publishedAt || item.publish_date || item.createdAt || item.created_at;
                        const m = moment(dateVal, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]);
                        return m.isValid() ? m.format("DD/MM/YYYY") : "16/06/2025";
                      })()}
                    </span>
                    <h3 className="ng-card-title">
                      {item.isImportant && <span className="ng-important-tag">Quan trọng</span>}
                      {item.isNew && <span className="ng-new-tag">[Mới] </span>}
                      {item.title}
                    </h3>
                    <div className="ng-card-footer">
                      <div className="ng-stats">
                        <div className="ng-stat">
                          <Eye size={14} />
                          <span>{item.viewCount || 0}</span>
                        </div>
                        <div className="ng-stat" onClick={onCardLikeClick(item)}>
                          <span style={{ color: item.meLike ? "#ef4444" : "#64748b" }}>
                            <Heart size={14} fill={item.meLike ? "#ef4444" : "none"} />
                          </span>
                          <span>{item.likeCount || 0}</span>
                        </div>
                        <div className="ng-stat">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.66699 2.14844C5.73079 2.36202 4.85951 2.79712 4.1263 3.41719C3.39309 4.03725 2.81935 4.8242 2.45328 5.71193C2.0872 6.59966 1.93946 7.56227 2.02247 8.51893C2.10548 9.47558 2.41681 10.3984 2.93032 11.2098L2.00032 13.9998L4.79032 13.0698C5.60173 13.5833 6.52451 13.8946 7.48117 13.9776C8.43783 14.0606 9.40043 13.9129 10.2882 13.5468C11.1759 13.1807 11.9628 12.607 12.5829 11.8738C13.203 11.1406 13.6381 10.2693 13.8517 9.3331M13.8517 6.66644C13.5999 5.56457 13.0424 4.55609 12.2432 3.75688C11.444 2.95767 10.4355 2.40017 9.33366 2.14844M11.3337 7.99977C11.3337 7.11572 10.9825 6.26787 10.3573 5.64275C9.73223 5.01763 8.88438 4.66644 8.00032 4.66644M8.66699 7.99977C8.66699 7.82296 8.59675 7.65339 8.47173 7.52837C8.3467 7.40334 8.17714 7.3331 8.00032 7.3331" stroke="#616161" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>{item.shareCount || item.commentCount || 0}</span>
                        </div>
                      </div>
                      <div className="ng-menu-container">
                        <button 
                          className={"ng-more-btn" + (activeMenuId === item.id ? " active" : "")}
                          onClick={onToggleMenu(item.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeMenuId === item.id && (
                          <div className="ng-action-menu" onClick={onStopPropagation}>
                            <div className="ng-menu-item" onClick={onCardView(item)}>
                              <Eye size={14} />
                              <span>Xem chi tiết</span>
                            </div>
                            {item.flags?.canUpdatePublished === true && (
                              <div className="ng-menu-item" onClick={onEditClick(item)}>
                                <Pencil size={14} />
                                <span>Chỉnh sửa tin</span>
                              </div>
                            )}
                            <div className="ng-menu-item" onClick={onShareClick(item)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                              </svg>
                              <span>Chia sẻ tin</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="ng-pagination">
          <button className="ng-pg-btn" onClick={onPageFirstClick} disabled={currentPage === 1 || totalPages <= 1}>
              <ChevronsLeft size={16} strokeWidth={1.5} />
            </button>
            <button className="ng-pg-btn" onClick={onPagePrevClick} disabled={currentPage === 1 || totalPages <= 1}>
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>

            <div className="ng-pg-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2))
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="ng-pg-ellipsis">...</span>}
                    <button
                      className={"ng-pg-num" + (currentPage === p ? ' active' : '')}
                      onClick={onPageNumClick(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))
              }
            </div>

            <button className="ng-pg-btn" onClick={onPageNextClick} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button className="ng-pg-btn" onClick={onPageLastClick} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronsRight size={16} strokeWidth={1.5} />
            </button>
          </div>
      </div>

      <ShareModal 
        isOpen={showShareModal} 
        onClose={onCloseShareModal}
        item={selectedItem}
      />

      <style>{`
        .ng-new-tag {
          color: #f59e0b;
          font-weight: 700;
          margin-right: 6px;
        }
        .ng-important-tag {
          background: #ffab40;
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
          flex-shrink: 0;
          margin-right: 6px;
          margin-bottom: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
        }
        .news-grid-page-redesign {
          background: transparent;
          width: 100%;
          min-height: 100vh;
          font-family: 'Be Vietnam Pro', -apple-system, sans-serif;
          position: relative;
        }
        .ng-menu-container {
          position: relative;
        }
        .ng-action-menu {
          position: absolute;
          bottom: calc(100% + 8px);
          right: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border: 1px solid #f1f5f9;
          min-width: 150px;
          z-index: 100;
          overflow: hidden;
          animation: slideUp 0.2s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ng-more-btn.active {
          color: #3b82f6;
          background: #eff6ff;
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
        .ng-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          color: #475569;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ng-menu-item:hover {
          background: #f8fafc;
          color: #3b82f6;
        }
        .ng-menu-item svg {
          color: #64748b;
        }
        .ng-menu-item:hover svg {
          color: #3b82f6;
        }
        .ng-hero-banner {
          background: url('/anhtrongdong.png') no-repeat center center;
          background-size: cover;
          padding: 30px 20px;
          position: relative;
          overflow: hidden;
          text-align: center;
          margin-bottom: 40px;
          width: 100%;
        }
        .ng-hero-pattern {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 40%;
          background: url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Vietnam_Dong_Son_drum.svg/500px-Vietnam_Dong_Son_drum.svg.png');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: right center;
          opacity: 0.05;
        }
        .ng-hero-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 800px;
          margin: 0 auto;
        }
        .ng-breadcrumb-new {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 13px;
          margin-bottom: 16px;
          font-weight: 500;
        }
        .ng-breadcrumb-new span:first-child:hover {
          color: #2563eb;
          text-decoration: underline;
        }
        .ng-current-page-bc {
          color: #3b82f6;
          font-weight: 600;
        }
        .ng-topic-title-box {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        .ng-hero-topic-name {
          font-size: 26px;
          font-weight: 400;
          color: #2563eb;
          margin: 0;
        }
        .ng-search-wrapper {
          width: 100%;
          max-width: 650px;
        }
        .ng-search-box {
          background: white;
          border-radius: 40px;
          padding: 8px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          width: 100%;
          border: 1px solid #e2e8f0;
        }
        .ng-search-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .ng-search-input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 15px;
          color: #1e293b;
          background: transparent;
          padding: 10px 0;
        }
        .ng-search-input::placeholder {
          color: #94a3b8;
        }
        .ng-mic-icon {
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .ng-mic-icon:hover {
          opacity: 1;
        }
        .ng-container {
          max-width: 1550px;
          margin: 0 auto;
          padding: 0 20px 60px 20px;
        }
        .ng-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }
        .ng-title {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        .ng-meta {
          font-size: 14px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ng-limit-select {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 2px 8px;
          background: white;
          color: #1e293b;
          font-weight: 500;
          outline: none;
        }
        .ng-header-right {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .ng-filter-item {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ng-filter-item:hover, .ng-filter-item.active {
          border-color: #3b82f6;
          color: #1e293b;
          background: #eff6ff;
        }

        /* Unit Dropdown Styles */
        .ng-unit-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 240px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid #f1f5f9;
          padding: 15px 0;
          z-index: 1000;
          margin-top: 10px;
          animation: ngFadeIn 0.2s ease-out;
        }

        @keyframes ngFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ng-unit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .ng-unit-item:hover {
          background: #f8fafc;
        }

        .ng-unit-label {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .ng-unit-sub {
          font-size: 12px;
          color: #94a3b8;
          margin-left: auto;
        }

        .ng-unit-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 8px 15px;
        }

        .ng-unit-radio {
          width: 18px;
          height: 18px;
          border: 2px solid #cbd5e1;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ng-unit-radio.active {
          border-color: #3b82f6;
        }

        .ng-unit-radio-inner {
          width: 10px;
          height: 10px;
          background: #3b82f6;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .ng-unit-radio.active .ng-unit-radio-inner {
          opacity: 1;
        }

        .ng-unit-cb {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ng-unit-label-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .ng-unit-list {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .ng-unit-list::-webkit-scrollbar {
          width: 4px;
        }
        .ng-unit-list::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }

        .ng-date-dropdown-container {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 1001;
          animation: ngFadeIn 0.2s ease-out;
        }
        
        .ng-date-dropdown-container.from { right: auto; left: 0; }

        .ng-date-dropdown-header {
          background: #3b82f6;
          color: white;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 12px 12px 0 0;
          text-align: center;
        }

        .ng-mic-icon.listening {
          animation: ng-listening-pulse 1.5s infinite;
        }

        @keyframes ng-listening-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        .ng-sort-btn {
          background: white;
          border: 1px solid #e2e8f0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ng-sort-btn:hover {
          border-color: #3b82f6; 
          color: #3b82f6;
        }
        .ng-sort-btn.asc {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
          transform: rotate(180deg);
        }
        .ng-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }
        .ng-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          transition: transform 0.3s, box-shadow 0.3s;
          cursor: pointer;
          display: flex;
          flex-direction: column;
        }
        .ng-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .ng-card-img-box {
          aspect-ratio: 16/10;
          overflow: hidden;
          background: #f1f5f9;
        }
        .ng-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s;
        }
        .ng-card:hover .ng-card-img {
          transform: scale(1.05);
        }
        .ng-card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .ng-card-date {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        .ng-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.5;
          margin: 0 0 20px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
          transition: color 0.3s ease;
        }
        .ng-card:hover .ng-card-title {
          color: #3b82f6;
        }
        .ng-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
        }
        .ng-stats {
          display: flex;
          gap: 16px;
        }
        .ng-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
        .ng-more-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .ng-more-btn:hover {
          background: #f8fafc;
          color: #64748b;
        }
        .ng-pagination {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-top: 48px;
        }
        .ng-pg-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ng-pg-btn:hover:not(:disabled) {
          color: #3b82f6;
        }
        .ng-pg-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .ng-pg-numbers {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ng-pg-num {
          min-width: 36px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ng-pg-num.active {
          background: #3b82f6;
          color: white;
        }
        .ng-pg-num:hover:not(.active) {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }
        .ng-pg-ellipsis {
          color: #64748b;
          padding: 0 4px;
          font-weight: 500;
        }
        .ng-skeleton-img {
          aspect-ratio: 16/10;
        }
        .ng-skeleton-line {
          height: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        @media (max-width: 1200px) {
          .nd-back-button-fixed {
            left: 20px; /* Thu hẹp khoảng cách khi màn hình nhỏ đi */
          }
        }
        @media (max-width: 1024px) {
          .ng-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .ng-header { flex-direction: column; gap: 20px; }
          .ng-header-right { width: 100%; overflow-x: auto; padding-bottom: 8px; }
          .ng-grid { grid-template-columns: 1fr; }
          .ng-pagination { justify-content: center; }
          .ng-hero-banner {
            padding: 60px 15px 30px 15px !important; /* Thêm khoảng trống phía trên tránh đè nút */
          }
        }
      `}</style>
    </div>
  );
}
