import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav";
import { useDispatch, useSelector } from "react-redux";
import { fetchLatestNews, fetchMostViewedNews } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import moment from "moment";
import { Calendar, Eye } from "lucide-react";
import "moment/locale/vi";
import * as S from "./TopNewsTabs.styles";
// import { getImageUrl, DEFAULT_NEWS_THUMBNAIL } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/imageHelper";

moment.locale("vi");

function NewsItemComponent({ item, onClick }) {
  const handleClick = useCallback(() => {
    onClick(item.id);
  }, [item.id, onClick]);

  return (
    <S.NewsItem onClick={handleClick}>
      <S.ItemIconCircle>
        <S.Dot />
      </S.ItemIconCircle>
      <S.ItemInfo>
        <S.ItemTitle>{item.title}</S.ItemTitle>
        <S.ItemDate>
          <Calendar size={14} />
          <span>{item.date}</span>
        </S.ItemDate>
      </S.ItemInfo>
    </S.NewsItem>
  );
}

export function TopNewsTabs({ scrollSpeed }) {
  const { setActivePage, activePage } = useCMS();
  const router = useRouter();
  const dispatch = useDispatch();

  const newsData = useSelector(function (state) {
    return state.news;
  });
  const { latestNews, mostViewedNews } = newsData;

  const [activeTab, setActiveTab] = useState("newest");
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const visibleItems = 15;
  const containerRef = React.useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const scrollRequestRef = React.useRef();

  const rawList = useMemo(function () {
    let data;
    if (activeTab === "newest") {
      data = latestNews;
    } else if (activeTab === "mostViewed") {
      data = mostViewedNews;
    }

    if (!data) return [];
    return Array.isArray(data) ? data : (data.items || []);
  }, [activeTab, latestNews, mostViewedNews]);

  useEffect(function () {
    const fetchFuncMap = {
      newest: fetchLatestNews,
      mostViewed: fetchMostViewedNews,
    };
    const fetchFunc = fetchFuncMap[activeTab];

    if (fetchFunc) {
      const isNewsGridScreen = activePage === "/tin-tuc" || (activePage && activePage.indexOf("/topic/") === 0);

      let sortBy = 'publishedAt';
      if (activeTab === 'mostViewed') sortBy = 'viewCount';

      setIsLoadingTab(true);
      const fetchPromise = isNewsGridScreen
        ? dispatch(fetchFunc({ sortBy: sortBy, sortOrder: 'DESC' }))
        : dispatch(fetchFunc());

      fetchPromise.finally(function () {
        setIsLoadingTab(false);
      });
    }
  }, [activeTab, dispatch, activePage]);

  const allNewsItems = useMemo(function () {
    return rawList.map(function (item) {
      const pubDate = item.publishedAt || item.createdAt;

      return {
        id: item.id,
        title: item.title,
        date: pubDate ? moment(pubDate, ["YYYY-MM-DD", "DD/MM/YYYY", moment.ISO_8601]).format("DD/MM/YYYY") : "",
        _raw: item
      };
    });
  }, [rawList]);

  const displayedItems = allNewsItems.slice(0, visibleItems);

  const isAutoScrollingRef = React.useRef(isAutoScrolling);
  const isReadyRef = React.useRef(false);
  const scrollPosRef = React.useRef(0);
  const speedRef = React.useRef(0.35);

  useEffect(() => {
    isAutoScrollingRef.current = isAutoScrolling;
  }, [isAutoScrolling]);

  useEffect(() => {
    const parsedSpeed = parseFloat(scrollSpeed);
    speedRef.current = !isNaN(parsedSpeed) ? parsedSpeed : 0.35;
  }, [scrollSpeed]);

  // Reset trạng thái sẵn sàng khi chuyển Tab hoặc đang nạp dữ liệu
  useEffect(() => {
    isReadyRef.current = false;
    scrollPosRef.current = 0;
  }, [activeTab, isLoadingTab]);

  // ─── Tự động cuộn (Auto Scroll) ───────────────────────────────────────────
  useEffect(() => {
    const animate = () => {
      const container = containerRef.current;
      if (container && isAutoScrollingRef.current && !isLoadingTab && displayedItems.length > 0) {
        // Căn giữa (vào đầu bộ số 3 trong 5 bộ)
        if (!isReadyRef.current && container.scrollHeight > 0) {
          const startPos = 0;
          container.scrollTop = startPos;
          scrollPosRef.current = startPos;
          isReadyRef.current = true;
        }

        // Thực hiện trôi liên tục
        if (isReadyRef.current && container.scrollHeight > container.clientHeight) {
          scrollPosRef.current += speedRef.current;
          container.scrollTop = scrollPosRef.current;
          const singleSetHeight = container.scrollHeight / 5;
          if (scrollPosRef.current + container.clientHeight >= container.scrollHeight - 10) {
            scrollPosRef.current -= singleSetHeight * 4;
            container.scrollTop = scrollPosRef.current;
          }
        }
      }
      scrollRequestRef.current = requestAnimationFrame(animate);
    };

    scrollRequestRef.current = requestAnimationFrame(animate);
    return () => {
      if (scrollRequestRef.current) {
        cancelAnimationFrame(scrollRequestRef.current);
      }
    };
  }, [isLoadingTab, displayedItems.length]);


  // Xử lý sự kiện cuộn vô tận thủ công (và tự động)
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !isReadyRef.current) return;

    const container = containerRef.current;
    if (!isAutoScrollingRef.current) {
      scrollPosRef.current = container.scrollTop;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const singleSetHeight = scrollHeight / 5;

    // Nhảy vị trí nếu vượt quá giới hạn an toàn để tạo hiệu ứng vô tận
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      const newPos = Math.max(0, scrollTop - (singleSetHeight * 4));
      container.scrollTop = newPos;
      scrollPosRef.current = newPos;
    } else {
      scrollPosRef.current = scrollTop;
    }
  }, []);

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleTabNewest = useCallback(function () {
    setActiveTab("newest");
  }, []);

  const handleTabMostViewed = useCallback(function () {
    setActiveTab("mostViewed");
  }, []);

  const handleItemClick = useCallback(function (id) {
    const url = ROUTES.newsDetail(id);
    const fromUrl = window.location.pathname + window.location.search;
    if (setActivePage) {
      setActivePage(url);
      window.history.pushState({ fromUrl }, "", url);
      window.scrollTo(0, 0);
    } else {
      router.push(url);
    }
  }, [setActivePage, router]);

  // Tạm dừng khi di chuột vào, tiếp tục khi di chuột ra
  const handleMouseEnter = useCallback(() => setIsAutoScrolling(false), []);
  const handleMouseLeave = useCallback(() => setIsAutoScrolling(true), []);

  return (
    <S.Container>
      {/* Tabs Header */}
      <S.TabsHeader>
        <S.TabButton
          $isActive={activeTab === "newest"}
          onClick={handleTabNewest}
        >
          <S.TabDot />
          <span>Tin mới nhất</span>
        </S.TabButton>
        <S.TabButton
          $isActive={activeTab === "mostViewed"}
          onClick={handleTabMostViewed}
        >
          <Eye size={16} />
          <span>Xem nhiều</span>
        </S.TabButton>
      </S.TabsHeader>

      {/* Content List with Circular Scroll (Auto + Manual) */}
      <S.TimelineContent
        ref={containerRef}
        onScroll={handleScroll}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isLoadingTab ? (
          [1, 2, 3, 4, 5, 6, 7].map(function (i) {
            return (
              <S.SkeletonItem key={i}>
                <S.ItemIconCircleSkeleton />
                <S.ItemInfo>
                  <S.TitleSkeleton />
                  <S.DateSkeleton />
                </S.ItemInfo>
              </S.SkeletonItem>
            );
          })
        ) : displayedItems.length > 0 ? (
          <S.MarqueeWrapper>
            {/* Nhân bản danh sách 5 lần để đảm bảo luôn tràn khung hình dù ít tin */}
            {['set-1', 'set-2', 'set-3', 'set-4', 'set-5'].map((set) => (
              displayedItems.map((item) => (
                <NewsItemComponent
                  key={`${set}-${item.id}`}
                  item={item}
                  onClick={handleItemClick}
                />
              ))
            ))}
          </S.MarqueeWrapper>
        ) : (
          <S.NoData>Không có dữ liệu</S.NoData>
        )}
      </S.TimelineContent>
    </S.Container>
  );
}
