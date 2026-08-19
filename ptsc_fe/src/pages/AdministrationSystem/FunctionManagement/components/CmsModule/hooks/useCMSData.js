import { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/AuthProvider";
// import { arrayMove } from "@dnd-kit/sortable";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { BLOCKS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/blocks";
import { API_PAGE, API_BANNER } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import axiosClient from "./axiosClient";

const INITIAL_PAGES = {};

const INITIAL_TOPIC_NAV_CONFIG = {
  hidden: false,
  backgroundColor: "#ffffff",
  hoverBackgroundColor: "#eff6ff",
  activeBackgroundColor: "#0f62fe",
  textColor: "#1f2937",
  hoverTextColor: "#0f62fe",
  activeTextColor: "#ffffff"
};

const INITIAL_SUB_HEADER_CONFIG = {
  userName: "Nguyễn Văn A",
  videoUrl: ""
};

const INITIAL_HEADER_CONFIG = {
  // logo: "My CMS", 
  layoutBackgroundColor: "#eff8ff",
  menu: [
    { label: "Home", href: ROUTES.HOME },
  ]
};

const INITIAL_PRE_HEADER_CONFIG = {
  imageUrl: "https://static.vecteezy.com/system/resources/thumbnails/053/181/871/small/lush-green-valley-surrounded-by-majestic-mountains-free-photo.jpg",
  imageUrlMobile: "",
  height: "",
  heightMobile: "",
  title: "",
  logoUrl: "",
  logoWidth: 40,
  logoHeight: 40,
  text: "",
  titleColor: "#1e293b",
  textColor: "#64748b"
};

const INITIAL_PAGE_IDS = {
  [ROUTES.HOME]: "home",
};

const INITIAL_FOOTER_CONFIG = {
  componentType: "default",
  logoUrl: "",
  logoWidth: 80,
  logoHeight: 80,
  companyName: "© 2025 SNP, chuyên trang nội bộ Tổng Công Ty Tân Cảng Sài Gòn.",
  description: "SNP giữ bản quyền nội dung trên website này.",
  hotlineLabel: "Hotline:",
  hotlineNumber: "024 7300 5678",
  followText: "Theo dõi Tân Cảng Sài Gòn trên:",
  socialLinks: [
    { iconType: "facebook", url: "https://facebook.com", bgColor: "#3b5998", label: "Facebook" },
    { iconType: "zalo", url: "#", bgColor: "#0068FF", label: "Zalo" }
  ],
  imageUrl: "",
  backgroundColor: "#2c3e50",
  textColor: "#ffffff"
};

export function useCMSData(initialPagePath = ROUTES.HOME) {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [pages, setPages] = useState(() => {
    // Khởi tạo sẵn layout cho trang chi tiết news nếu được mở lần đầu
    if (initialPagePath.startsWith(ROUTES.NEWS_DETAIL_PREFIX) && !INITIAL_PAGES[initialPagePath]) {
      const id = initialPagePath.split("/").pop();
      return {
        ...INITIAL_PAGES,
        [initialPagePath]: [
          {
            id,
            type: "newsDetail",
            props: {
              title: "Chi tiết tin",
              content: "Nội dung chi tiết tin... Bạn có thể chỉnh và kéo layout ở đây."
            }
          }
        ]
      };
    }
    return INITIAL_PAGES;
  });

  const [activePage, setActivePage] = useState(initialPagePath);

  useEffect(() => {
    if (initialPagePath && initialPagePath !== activePage) {
      setActivePage(initialPagePath);
    }
  }, [initialPagePath]);

  const [headerConfig, setHeaderConfig] = useState(INITIAL_HEADER_CONFIG);
  const [footerConfig, setFooterConfig] = useState(INITIAL_FOOTER_CONFIG);
  const [preHeaderConfig, setPreHeaderConfig] = useState(INITIAL_PRE_HEADER_CONFIG);
  const [topicNavConfig, setTopicNavConfig] = useState(INITIAL_TOPIC_NAV_CONFIG);
  const [subHeaderConfig, setSubHeaderConfig] = useState(INITIAL_SUB_HEADER_CONFIG);
  const [pageIds, setPageIds] = useState(INITIAL_PAGE_IDS);
  const [banners, setBanners] = useState([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const isLoading = isGlobalLoading || isPageLoading;

  // 1. Fetch Global Config (Home Page) on Mount
  useEffect(() => {
    const fetchGlobal = async () => {
      if (authLoading) return;

      const homeId = pageIds[ROUTES.HOME];
      if (!homeId) {
        setIsGlobalLoading(false);
        return;
      }

      setIsGlobalLoading(true);
      try {
        const [pageResult, bannerResult] = await Promise.allSettled([
          axiosClient.get(`${API_PAGE}/${homeId}`),
          axiosClient.get(API_BANNER)
        ]);

        let mappedTopics = [];
        // if (topResult.status === 'fulfilled') {
        //   const topData = topResult.value?.data || [];
        //   mappedTopics = topData
        //     .filter(t => !t.status?.includes("Không hoạt động"))
        //     .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        //     .map(t => ({
        //       label: t.name,
        //       href: `${ROUTES.TOPIC_PREFIX}${encodeURIComponent(t.name)}`,
        //       displayOrder: t.displayOrder
        //     }));
        // }

        if (bannerResult.status === 'fulfilled') {
          const bannerData = bannerResult.value?.data || [];
          setBanners(bannerData);
        }

        if (pageResult.status === 'fulfilled') {
          const data = pageResult.value;
          const blocks = Array.isArray(data) ? data : data?.blocks || [];
          const homeLayout = [];

          blocks.forEach(block => {
            const { key, type, ...props } = block;
            if (key === 'preHeader') setPreHeaderConfig(props);
            else if (key === 'topicNav') setTopicNavConfig(prev => ({ ...prev, ...props }));
            else if (key === 'header') {
              const apiMenu = props.menu || [];

              // Cập nhật lại displayOrder cho các mục trong menu đã lưu (nếu có trong danh sách chủ đề)
              const enrichedApiMenu = apiMenu.map(item => {
                const topicMatch = mappedTopics.find(t => t.href === item.href || t.label === item.label);
                return topicMatch ? { ...item, displayOrder: topicMatch.displayOrder } : item;
              });

              const uniqueTopics = mappedTopics.filter(
                top => !enrichedApiMenu.some(m => m.href === top.href)
              );

              const mergedMenu = [...enrichedApiMenu, ...uniqueTopics];

              // Sắp xếp: Home đứng đầu (index -1), các mục khác theo displayOrder
              const sortedMenu = mergedMenu.sort((a, b) => {
                if (a.href === "/") return -1;
                if (b.href === "/") return 1;
                const orderA = a.displayOrder !== undefined ? a.displayOrder : 999;
                const orderB = b.displayOrder !== undefined ? b.displayOrder : 999;
                return orderA - orderB;
              });

              setHeaderConfig({ ...props, menu: sortedMenu });
            }
            else if (key === 'footer') setFooterConfig(props);
            else if (key === 'subHeader') setSubHeaderConfig(props);
            else if (type && BLOCKS[type]) homeLayout.push({ id: key, type, props });
          });
          setPages(prev => ({ ...prev, [ROUTES.HOME]: homeLayout.sort((a, b) => (a.props.order ?? 0) - (b.props.order ?? 0)) }));
          setApiError(null);
        } else {
          // Nếu API trang chủ lỗi (có thể do chưa đăng nhập), vẫn cập nhật Topics vào Menu mặc định
          logger.warn("CMS Page API failed, using initial config with topics.");

          // Trích xuất lỗi thực tế nếu có
          // const errorMsg = pageResult.reason?.response?.data?.message || pageResult.reason?.message || "Không thể kết nối đến máy chủ cấu hình.";
          // setApiError(errorMsg); // Đã tắt: hiển thị màn hình mặc định thay vì overlay lỗi

          if (mappedTopics.length > 0) {
            setHeaderConfig(prev => {
              const currentMenu = prev.menu || [];
              const uniqueTopics = mappedTopics.filter(
                top => !currentMenu.some(m => m.href === top.href)
              );
              const mergedMenu = [...currentMenu, ...uniqueTopics];

              const sortedMenu = mergedMenu.sort((a, b) => {
                if (a.href === "/") return -1;
                if (b.href === "/") return 1;
                return (a.displayOrder || 999) - (b.displayOrder || 999);
              });

              return {
                ...prev,
                menu: sortedMenu
              };
            });
          }
        }
      } catch (err) {
        logger.error("Unexpected error in fetchGlobal:", err);
        // setApiError(err.message || "Lỗi không xác định khi tải dữ liệu."); // Đã tắt: hiển thị màn hình mặc định thay vì overlay lỗi
      } finally {
        setIsGlobalLoading(false);
      }
    };
    fetchGlobal();
  }, [user, authLoading, pageIds]);

  // 2. Fetch Active Page Layout
  useEffect(() => {
    const fetchPageLayout = async () => {
      // Logic cho Home Page (đã được fetch ở fetchGlobal)
      if (activePage === ROUTES.HOME) {
        return;
      }

      // Logic cho Topic Page
      if (activePage.startsWith(ROUTES.TOPIC_PREFIX)) {
        const topicName = decodeURIComponent(activePage.replace(ROUTES.TOPIC_PREFIX, ""));
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "topic-news-grid",
              type: "customBlock",
              props: {
                componentType: "newsGridView",
                topic: topicName,
                width: 100
              }
            }
          ]
        }));
        return;
      }

      // Logic cho News Detail Page
      if (activePage.startsWith(ROUTES.NEWS_DETAIL_PREFIX)) {
        const newsId = activePage.replace(ROUTES.NEWS_DETAIL_PREFIX, "");
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "news-detail-view",
              type: "customBlock",
              props: {
                componentType: "newsDetail",
                newsId: newsId,
                width: 100
              }
            }
          ]
        }));
        return;
      }

      // Logic cho All News Page
      if (activePage === "/tin-tuc" || activePage.startsWith("/tin-tuc?")) {
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "all-news-grid",
              type: "customBlock",
              props: {
                componentType: "newsGridView",
                width: 100
              }
            }
          ]
        }));
        return;
      }

      // Logic cho Search Page
      if (activePage === ROUTES.SEARCH || activePage.startsWith(ROUTES.SEARCH + "?")) {
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "search-results-page",
              type: "customBlock",
              props: {
                componentType: "searchResults",
                width: 100
              }
            }
          ]
        }));
        return;
      }

      // Logic cho Calendar Page
      if (activePage === ROUTES.CALENDAR || activePage.startsWith(ROUTES.CALENDAR + "?")) {
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "event-calendar-page",
              type: "customBlock",
              props: {
                componentType: "eventCalendar",
                width: 100
              }
            }
          ]
        }));
        return;
      }

      // Logic cho Video Page
      if (activePage === ROUTES.VIDEO) {
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "video-page",
              type: "customBlock",
              props: {
                componentType: "videoPage",
                width: 100
              }
            }
          ]
        }));
        return;
      }

      // Logic cho Video Detail Page
      if (activePage.startsWith(ROUTES.VIDEO_DETAIL_PREFIX)) {
        const videoId = activePage.replace(ROUTES.VIDEO_DETAIL_PREFIX, "");
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "video-detail-view",
              type: "customBlock",
              props: {
                componentType: "videoDetailPage",
                videoId: videoId,
                width: 100
              }
            }
          ]
        }));
        return;
      }

      // Logic cho Album Page
      if (activePage === ROUTES.ALBUM) {
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "album-page",
              type: "customBlock",
              props: {
                componentType: "albumPage",
                width: 100
              }
            }
          ]
        }));
        return;
      }

      // Logic cho Album Detail Page (Photo Gallery)
      if (activePage.startsWith(ROUTES.ALBUM_DETAIL_PREFIX)) {
        const albumId = activePage.replace(ROUTES.ALBUM_DETAIL_PREFIX, "");
        setPages(prev => ({
          ...prev,
          [activePage]: [
            {
              id: "photo-gallery-page",
              type: "customBlock",
              props: {
                componentType: "photoGalleryPage",
                albumId: albumId,
                width: 100
              }
            }
          ]
        }));
        return;
      }

      let pageId = pageIds[activePage];
      let resolvedPath = activePage;

      // If no exact match, try to match dynamic patterns
      if (!pageId) {
        const potentialPatterns = Object.keys(pageIds).filter(p => p.includes(":"));
        for (const pattern of potentialPatterns) {
          const regex = new RegExp("^" + pattern.replace(/:[^\s/]+/g, "([^/]+)") + "$");
          if (regex.test(activePage)) {
            pageId = pageIds[pattern];
            resolvedPath = pattern;
            break;
          }
        }
      }

      // For dynamic news detail routes, generate a pageId from the path
      if (!pageId && activePage.startsWith(ROUTES.NEWS_DETAIL_PREFIX)) {
        pageId = `news_${activePage.split("/").pop()}`;
      }

      // Fallback: Nếu không tìm thấy pageId trong map, tự động tạo từ đường dẫn
      if (!pageId && activePage.startsWith("/")) {
        pageId = activePage.replace(/\//g, '_').replace(/:/g, 'var_');
      }

      if (!pageId) return;

      setIsPageLoading(true);
      try {
        const data = await axiosClient.get(`${API_PAGE}/${pageId}`);

        const blocks = Array.isArray(data) ? data : data?.blocks;
        if (!blocks) return;

        const newLayout = [];
        blocks.forEach(block => {
          const { key, type, ...props } = block;
          if (type && BLOCKS[type]) newLayout.push({ id: key, type, props });
        });
        setPages(prev => ({ ...prev, [resolvedPath]: newLayout.sort((a, b) => (a.props.order ?? 0) - (b.props.order ?? 0)) }));
      } catch (error) {
        if (error.response && error.response.status === 404) {
          logger.log(`No layout found on server for ${activePage}. Not updating state.`);
        }
        logger.error(`Failed to fetch layout for ${activePage}:`, error);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchPageLayout();
  }, [activePage, pageIds]);

  // Determine which layout to show (exact match or dynamic match)
  let currentLayoutKey = activePage;
  if (!pages[activePage]) {
    const potentialPatterns = Object.keys(pages).filter(p => p.includes(":"));
    for (const pattern of potentialPatterns) {
      const regex = new RegExp("^" + pattern.replace(/:[^\s/]+/g, "([^/]+)") + "$");
      if (regex.test(activePage)) {
        currentLayoutKey = pattern;
        break;
      }
    }
  }

  const layout = pages[currentLayoutKey] || [];

  const setLayout = useCallback((newLayout) => {
    setPages(prev => ({ ...prev, [currentLayoutKey]: newLayout }));
  }, [currentLayoutKey]);

  return {
    pages, setPages,
    activePage, setActivePage,
    headerConfig, setHeaderConfig,
    footerConfig, setFooterConfig,
    preHeaderConfig, setPreHeaderConfig,
    topicNavConfig, setTopicNavConfig,
    subHeaderConfig, setSubHeaderConfig,
    pageIds, setPageIds,
    banners, setBanners,
    isGlobalLoading, isPageLoading, isLoading,
    apiError, setApiError,
    layout, setLayout
  };
}
