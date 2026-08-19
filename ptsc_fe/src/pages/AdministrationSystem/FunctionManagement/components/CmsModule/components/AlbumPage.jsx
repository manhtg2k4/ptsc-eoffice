import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAlbums, fetchTopics } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import { API_FILES_VIEW, APP_BASE } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import moment from "moment";
/* eslint-disable import/no-relative-packages */
import { useRouter } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
/* eslint-enable import/no-relative-packages */
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { Folder, Image as ImageIcon, Eye, Camera, Calendar, User, ChevronLeft, ChevronRight } from "lucide-react";
import ErrorState from "./dialog/ErrorState";
import ShareModal from "./dialog/ShareModal";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import AuthBgDiv from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/AuthBgDiv';

export default function AlbumPage() {
  const router = useRouter();
  const { setActivePage } = useCMS();
  const dispatch = useDispatch();
  const { albumList, loading, topicList, error } = useSelector((state) => state.news);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả Chủ đề");
  const [sortBy, setSortBy] = useState("Mới nhất");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: "", title: "" });

  const startRef = useRef(null);
  const endRef = useRef(null);

  // Memoized callbacks for event handlers
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const handleHomeClick = useCallback(() => {
    if (setActivePage) {
      setActivePage(ROUTES.HOME);
      window.history.pushState(null, "", ROUTES.HOME);
      window.scrollTo(0, 0);
    } else {
      router.push(ROUTES.HOME);
    }
  }, [setActivePage, router]);

  const handleBreadcrumbHome = useCallback(() => {
    if (setActivePage) {
      setActivePage("/");
      router.push("/");
    }
  }, [setActivePage, router]);

  const handleCategoryChange = useCallback((e) => {
    setSelectedCategory(e.target.value);
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const handleStartDateClick = useCallback(() => {
    startRef.current?.showPicker?.();
  }, []);

  const handleStartDateChange = useCallback((e) => {
    setStartDate(e.target.value);
  }, []);

  const handleStartDateInputClick = useCallback((e) => {
    e.target.showPicker?.();
  }, []);

  const handleEndDateClick = useCallback(() => {
    endRef.current?.showPicker?.();
  }, []);

  const handleEndDateChange = useCallback((e) => {
    setEndDate(e.target.value);
  }, []);

  const handleEndDateInputClick = useCallback((e) => {
    e.target.showPicker?.();
  }, []);

  const handleCalendarIconClick = useCallback(() => {
    if (!startDate && startRef.current?.showPicker) {
      startRef.current.showPicker();
    } else if (endRef.current?.showPicker) {
      endRef.current.showPicker();
    }
  }, [startDate]);

  const handleAlbumCardClick = useCallback((album) => {
    const url = ROUTES.albumDetail(album.id);
    if (setActivePage) {
      setActivePage(url);
      window.history.pushState(null, "", url);
      window.scrollTo(0, 0);
    } else {
      router.push(url);
    }
  }, [setActivePage, router]);

  const handleSlideClick = useCallback(() => {
    if (allAlbums.length === 0 || !allAlbums[currentSlide]) return;
    const url = ROUTES.albumDetail(allAlbums[currentSlide].id);
    if (setActivePage) {
      setActivePage(url);
      window.history.pushState(null, "", url);
      window.scrollTo(0, 0);
    } else {
      router.push(url);
    }
  }, [setActivePage, router, currentSlide, allAlbums]);

  const handleMouseOver = useCallback((e) => {
    e.target.style.color = '#0066cc';
  }, []);

  const handleMouseOut = useCallback((e) => {
    e.target.style.color = '#666';
  }, []);

  const handleSlideNavPrev = useCallback(() => {
    if (allAlbums.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + allAlbums.length) % allAlbums.length);
    }
  }, [allAlbums.length]);

  const handleSlideNavNext = useCallback(() => {
    if (allAlbums.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % allAlbums.length);
    }
  }, [allAlbums.length]);

  const handleDotClick = useCallback((idx) => {
    setCurrentSlide(idx);
  }, []);

  const handlePrevPage = useCallback(() => {
    const newPage = currentPage - 1;
    setCurrentPage(newPage);
  }, [currentPage]);

  const handlePageClick = useCallback((pageNum) => {
    setCurrentPage(pageNum);
  }, []);

  const handleNextPage = useCallback(() => {
    const newPage = currentPage + 1;
    setCurrentPage(newPage);
  }, [currentPage]);

  const handleShareClose = useCallback(() => {
    setShowShareModal(false);
  }, []);

  // Wrapper callbacks to avoid inline arrow functions in JSX  
  const onDotClick = useCallback((idx) => () => {
    handleDotClick(idx);
  }, [handleDotClick]);

  const onAlbumCardClick = useCallback((album) => () => {
    handleAlbumCardClick(album);
  }, [handleAlbumCardClick]);

  const onShareClick = useCallback((album) => (e) => {
    e.stopPropagation();
    handleOpenShare(e, album);
  }, [handleOpenShare]);

  const onPageClick = useCallback((pageNum) => () => {
    handlePageClick(pageNum);
  }, [handlePageClick]);

  useEffect(() => {
    dispatch(fetchTopics());
  }, [dispatch]);

  const categories = useMemo(() => {
    const list = Array.isArray(topicList) ? topicList : (topicList?.data || topicList?.items || []);
    const activeList = list.filter(t => !t.status?.includes("Không hoạt động"));
    return ["Tất cả Chủ đề", ...activeList.map(t => t.name || t.title)];
  }, [topicList]);

  useEffect(() => {
    const params = { page: currentPage, limit: 10 };
    const filter = {};
    const sort = {};

    // Topic Filter
    if (selectedCategory !== "Tất cả Chủ đề") {
      const list = Array.isArray(topicList) ? topicList : (topicList?.data || topicList?.items || []);
      const topic = list.find(t => (t.name || t.title) === selectedCategory);
      if (topic) {
        filter.topic = topic.id;
      }
    }

    // Date Filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.startDate = startDate;
      if (endDate) filter.createdAt.endDate = endDate;
    }

    // Sort
    if (sortBy === "Mới nhất") {
      sort.views = 1;
    } else if (sortBy === "Cũ nhất") {
      sort.views = -1;
    }

    if (Object.keys(filter).length > 0) params.filter = filter;
    if (Object.keys(sort).length > 0) params.sort = sort;

    dispatch(fetchAlbums(params));
  }, [dispatch, currentPage, selectedCategory, sortBy, startDate, endDate, topicList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, sortBy, startDate, endDate]);

  const handleOpenShare = useCallback((e, album) => {
    e.stopPropagation();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const albumUrl = `${baseUrl}${ROUTES.albumDetail(album.id)}`;
    setShareData({
      url: albumUrl,
      title: album.title
    });
    setShowShareModal(true);
  }, []);

  const allAlbums = useMemo(() => {
    const rawItems = albumList?.data || [];

    return rawItems.map(v => {
      let thumb = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80";

      // Prioritize file_id from images array if available
      if (v.images && v.images.length > 0 && v.images[0].file_id) {
        thumb = `${API_FILES_VIEW}/${v.images[0].file_id}`;
      } else if (v.thumbnail_id) {
        thumb = `${API_FILES_VIEW}/${v.thumbnail_id}`;
      } else if (v.thumbnail) {
        thumb = v.thumbnail.startsWith('http') ? v.thumbnail : `${APP_BASE}${v.thumbnail}`;
      } else if (v.images && v.images.length > 0) {
        const firstImg = v.images[0];
        thumb = firstImg.url?.startsWith('http') ? firstImg.url : `${APP_BASE}${firstImg.url}`;
      }

      return {
        id: v.id,
        title: v.title || "Album không tiêu đề",
        tag: v.topic || "Sự kiện",
        photos: v.images ? v.images.length : 0,
        views: v.views || 0,
        date: v.createdAt ? moment(v.createdAt).format("DD/MM/YYYY") : "Chưa cập nhật",
        author: v.createdByName || "SNP Admin",
        thumbnail: thumb,
        isNew: v.albumType === "featured",
        rawDate: v.createdAt
      };
    });
  }, [albumList]);

  const stats = useMemo(() => {
    const totalAlbums = albumList?.meta?.total || allAlbums.length;
    let totalPhotos = 0;
    let totalViews = 0;
    allAlbums.forEach(a => {
      totalPhotos += (a.photos || 0);
      totalViews += (a.views || 0);
    });

    return [
      { label: "Tổng số Album", color: "#e0f2fe", value: totalAlbums.toLocaleString(), icon: <Folder size={22} /> },
      { label: "Tổng số Hình ảnh", color: "#f3e8ff", value: totalPhotos.toLocaleString(), icon: <ImageIcon size={22} /> },
      { label: "Album mới (tháng này)", color: "#fef3c7", value: allAlbums.filter(a => moment(a.rawDate).isSame(moment(), 'month')).length, icon: <Calendar size={22} /> },
      { label: "Tổng lượt thích", color: "#fee2e2", value: totalViews.toLocaleString(), icon: <Eye size={22} /> }
    ];
  }, [allAlbums, albumList]);

  const albums = allAlbums;

  if (error) {
    return (
      <ErrorState
        title="Không thể tải Album"
        message="Hiện tại hệ thống không thể lấy dữ liệu hình ảnh. Vui lòng thử lại sau hoặc quay về trang chủ."
        onRetry={handleRetry}
        onHomeClick={handleHomeClick}
      />
    );
  }

  if ((loading || albums.length === 0) && !error) {
    return (
      <div className="album-page-wrapper">
        <div className="breadcrumb" style={{
          background: "#fff",
          padding: "12px 24px",
          borderBottom: "1px solid #e0e0e0",
          fontSize: 13,
          color: "#666"
        }}>
          <span onClick={handleBreadcrumbHome} style={{ color: '#666', cursor: 'pointer' }}>Trang chủ</span>
          <span style={{ margin: "0 8px" }}>›</span>
          <span style={{ color: "#0066cc", fontWeight: 600 }}>Album Tân Cảng Sài Gòn</span>
        </div>
        <div className="container">
          <div className="skeleton" style={{ width: '300px', height: '42px', marginBottom: '28px' }}></div>

          {/* Hero Slider Skeleton */}
          <div className="skeleton" style={{ width: '100%', height: '480px', borderRadius: '16px', marginBottom: '40px' }}></div>

          {/* Stats Grid Skeleton */}
          <div className="stats-grid" style={{ marginBottom: '48px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={`skeleton-stat-${i}`} className="stats-card">
                <div className="skeleton" style={{ width: '50px', height: '50px', borderRadius: '12px', marginBottom: '12px' }}></div>
                <div className="skeleton" style={{ width: '100px', height: '14px', marginBottom: '8px' }}></div>
                <div className="skeleton" style={{ width: '60px', height: '20px' }}></div>
              </div>
            ))}
          </div>

          {/* Filters Skeleton */}
          <div className="album-filters-bar" style={{ marginBottom: '32px' }}>
            <div className="skeleton" style={{ width: '100%', height: '50px', borderRadius: '12px' }}></div>
          </div>

          {/* Album List Grid Skeleton */}
          <div className="album-list-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={`skeleton-card-${i}`} className="album-horizontal-card">
                <div className="skeleton" style={{ width: '280px', height: '100%', borderRadius: '12px 0 0 12px' }}></div>
                <div className="card-content-box" style={{ padding: '20px' }}>
                  <div className="skeleton" style={{ width: '80px', height: '20px', marginBottom: '12px' }}></div>
                  <div className="skeleton" style={{ width: '100%', height: '24px', marginBottom: '16px' }}></div>
                  <div className="meta-grid">
                    {[1, 2, 3, 4].map(j => (
                      <div key={`skeleton-meta-${i}-${j}`} className="skeleton" style={{ width: '80px', height: '14px' }}></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="album-page-wrapper">
      {/* Breadcrumb */}
      <div className="breadcrumb" style={{
        background: "#fff",
        padding: "12px 24px",
        borderBottom: "1px solid #e0e0e0",
        fontSize: 13,
        color: "#666"
      }}>
        <span
          onClick={handleHomeClick}
          style={{ cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
          Trang chủ
        </span>
        <span style={{ margin: "0 8px" }}>›</span>
        <span style={{ color: "#0066cc", fontWeight: 600 }}>Album Tân Cảng Sài Gòn</span>
      </div>

      <div className="container">
        {/* Title */}
        <h1 className="page-title">Album Nổi bật</h1>

        {/* Hero Slider */}
        {allAlbums.length > 0 && (
          <div className="hero-slider-container">
            <AuthBgDiv
              customClassName="hero-slider"
              bgSrc={allAlbums[currentSlide].thumbnail}
            >
              <div className="hero-overlay">
                <div className="hero-content-row">
                  <div style={{ flex: 1 }}>
                    <span className="hero-tag">
                      {allAlbums[currentSlide].tag}
                    </span>
                    <h2 className="hero-title">
                      {allAlbums[currentSlide].title}
                    </h2>

                    <div className="hero-meta">
                      <div className="meta-item">
                        <Camera size={18} />
                        <div>
                          <span className="meta-label">Hình ảnh</span>
                          <span className="meta-val">{allAlbums[currentSlide].photos}</span>
                        </div>
                      </div>
                      <div className="meta-item">
                        <Eye size={18} />
                        <div>
                          <span className="meta-label">Lượt xem</span>
                          <span className="meta-val">{allAlbums[currentSlide].views.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="meta-item">
                        <Calendar size={18} />
                        <div>
                          <span className="meta-label">Ngày</span>
                          <span className="meta-val">{allAlbums[currentSlide].date}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="detail-btn"
                    onClick={handleSlideClick}
                  >
                    Xem chi tiết <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Slider Nav */}
              <button className="slider-nav-btn prev" onClick={handleSlideNavPrev}>
                <ChevronLeft size={24} />
              </button>
              <button className="slider-nav-btn next" onClick={handleSlideNavNext}>
                <ChevronRight size={24} />
              </button>
            </AuthBgDiv>

            {/* Pagination Dots */}
            <div className="slider-dots">
              {allAlbums.slice(0, 10).map((album, idx) => {
                const dotClassName = idx === currentSlide ? 'dot active' : 'dot';
                return (
                  <div
                    key={album.id}
                    className={dotClassName}
                    onClick={onDotClick(idx)}
                    role="button"
                    tabIndex={0}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={`stat-${stat.label}`} className="stats-card">
              <div className="stat-icon-box" style={{ background: stat.color }}>
                {stat.icon}
              </div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="album-filters-bar">
          <div className="filter-group">
            <label>Chủ đề :</label>
            <select
              className="filter-select"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              {categories.map((cat) => (
                <option key={`cat-${cat}`} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sắp xếp:</label>
            <select
              className="filter-select"
              value={sortBy}
              onChange={handleSortChange}
            >
              <option>Mới nhất</option>
              <option>Cũ nhất</option>
            </select>
          </div>

          <div className="date-picker-group">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Từ ngày"
                className="date-input"
                readOnly
                value={startDate ? moment(startDate).format("DD/MM/YYYY") : ""}
                onClick={handleStartDateClick}
                style={{ cursor: 'pointer' }}
              />
              <input
                type="date"
                ref={startRef}
                className="date-input"
                value={startDate}
                onChange={handleStartDateChange}
                onClick={handleStartDateInputClick}
                style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
            </div>
            <span className="date-sep">→</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Đến ngày"
                className="date-input"
                readOnly
                value={endDate ? moment(endDate).format("DD/MM/YYYY") : ""}
                onClick={handleEndDateClick}
                style={{ cursor: 'pointer' }}
              />
              <input
                type="date"
                ref={endRef}
                className="date-input"
                value={endDate}
                onChange={handleEndDateChange}
                onClick={handleEndDateInputClick}
                style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
            </div>
            <div
              className="calendar-icon-box"
              onClick={handleCalendarIconClick}
              style={{ cursor: 'pointer' }}
            >
              <Calendar size={18} />
            </div>
          </div>
        </div>

        {/* Album Grid */}
        <div className="album-list-grid" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.3s" }}>
          {albums.map((album) => (
            <div
              key={album.id}
              className="album-horizontal-card"
              onClick={onAlbumCardClick(album)}
              role="button"
              tabIndex={0}
            >
              <div className="card-thumb-box">
                <AuthImage src={album.thumbnail} alt={album.title} />
                {album.isNew && <span className="badge-new">Mới</span>}
              </div>

              <div className="card-content-box">
                <div className="content-top">
                  <div className="flex-row">
                    <span className="category-tag">{album.tag}</span>
                    <button className="share-btn-icon" onClick={onShareClick(album)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5.33398C13.1046 5.33398 14 4.43855 14 3.33398C14 2.22941 13.1046 1.33398 12 1.33398C10.8954 1.33398 10 2.22941 10 3.33398C10 4.43855 10.8954 5.33398 12 5.33398Z" stroke="#737373" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 10C5.10457 10 6 9.10457 6 8C6 6.89543 5.10457 6 4 6C2.89543 6 2 6.89543 2 8C2 9.10457 2.89543 10 4 10Z" stroke="#737373" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 14.666C13.1046 14.666 14 13.7706 14 12.666C14 11.5614 13.1046 10.666 12 10.666C10.8954 10.666 10 11.5614 10 12.666C10.8954 13.7706 10.8954 14.666 12 14.666Z" stroke="#737373" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5.72656 9.00586L10.2799 11.6592" stroke="#737373" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.2732 4.33984L5.72656 6.99318" stroke="#737373" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  <h3 className="album-card-title">{album.title}</h3>
                </div>

                <div className="content-bottom-meta">
                  <div className="meta-grid">
                    <div className="meta-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.6667 2H3.33333C2.59695 2 2 2.59695 2 3.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V3.33333C14 2.59695 13.403 2 12.6667 2Z" stroke="#4A5565" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5.9974 7.33268C6.73378 7.33268 7.33073 6.73573 7.33073 5.99935C7.33073 5.26297 6.73378 4.66602 5.9974 4.66602C5.26102 4.66602 4.66406 5.26297 4.66406 5.99935C4.66406 6.73573 5.26102 7.33268 5.9974 7.33268Z" stroke="#4A5565" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14 10.0004L11.9427 7.94312C11.6926 7.69315 11.3536 7.55273 11 7.55273C10.6464 7.55273 10.3074 7.69315 10.0573 7.94312L4 14.0004" stroke="#4A5565" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{album.photos} ảnh</span>
                    </div>
                    <div className="meta-item">
                      <Eye size={16} /> <span>{album.views.toLocaleString()} lượt xem</span>
                    </div>
                    <div className="meta-item">
                      <Calendar size={16} /> <span>{album.date}</span>
                    </div>
                    <div className="meta-item">
                      <User size={16} /> <span>{album.author}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination - Always Visible */}
        <div className="pagination-container">
          <button
            className="pag-nav-btn"
            disabled={currentPage === 1}
            onClick={handlePrevPage}
          >
            <ChevronLeft size={20} />
          </button>

          {[...Array(albumList?.meta?.totalPages || 5)].map((_, i) => {
            const pageNum = i + 1;
            const buttonClassName = pageNum === currentPage ? 'pag-num-btn active' : 'pag-num-btn';
            return (
              <button
                key={`page-${pageNum}`}
                className={buttonClassName}
                onClick={onPageClick(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            className="pag-nav-btn"
            disabled={currentPage === (albumList?.meta?.totalPages || 5)}
            onClick={handleNextPage}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={handleShareClose}
        url={shareData.url}
        title={shareData.title}
      />
    </div>
  );
}