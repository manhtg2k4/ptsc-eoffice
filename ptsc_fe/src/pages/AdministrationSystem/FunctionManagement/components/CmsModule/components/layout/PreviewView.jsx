import React, { useState, useContext, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as LucideIcons from "lucide-react";

import Link from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimLink";
import { usePathname } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav";
import { BLOCKS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/blocks";
import { FOOTER_MAP, PREHEADER_MAP, SUBHEADER_MAP } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/componentMapping";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { ConfigSidebar } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/Sidebar/ConfigSidebar";
import { AuthContext } from "@AuthContext/AuthProvider";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import AuthModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/AuthModal";
// import NotificationDropdown from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/NotificationModal";
import ErrorOverlay from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/ErrorOverlay";
import EventCalendarPage from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EventCalendarPage";
import { useNotificationSocket } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/useAlbumSocket";
import * as S from "./PreviewView.styles";
import { fetchUserRoles, fetchTopics } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import { encodeHTML } from "@/utils/securityUtils";

const { Menu, Settings } = LucideIcons;

const TopicMenuItem = ({ topic, onClick, isActive }) => {
  const handleClick = useCallback((e) => {
    onClick(e, topic);
  }, [onClick, topic]);

  return (
    <S.TopicItem onClick={handleClick} $isActive={isActive}>
      <S.TopicBullet $isActive={isActive} />
      <span>{topic.name || topic.title}</span>
    </S.TopicItem>
  );
};

// Sub-component for Menu Item to avoid inline arrow functions in loop
const NavMenuItem = ({ item, isSidebar, isActive, fSize, tColor, iColor, homeIconSize, onClick, topics, currentTopicId }) => {
  const isHome = item.label.toLowerCase() === "home" || item.label === "Tin tức";
  const isLibrary = item.label === "Thư viện";

  const handleClick = useCallback((e) => {
    onClick(e, item.href);
  }, [onClick, item.href]);

  const handleTopicItemClick = useCallback((e, topic) => {
    e.preventDefault();
    e.stopPropagation();
    const params = new URLSearchParams({ topicId: topic.id });
    if (topic.name || topic.title) params.set("topicName", topic.name || topic.title);
    const url = `/tin-tuc?${params.toString()}`;
    onClick(e, url);
  }, [onClick]);

  return (
    <S.StyledLink
      href={item.href || null}
      onClick={handleClick}
    >
      <S.NavLinkStyled
        $isSidebar={isSidebar}
        $isActive={isActive}
        $fSize={fSize}
        $tColor={tColor}
      >
        {isHome ? (
          <S.HomeIconSvg $size={homeIconSize} viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.75 17.4993H14.75C13.8333 17.4993 12 16.9493 12 14.7493V12.916H1V14.7493C1 16.9493 2.83333 17.4993 3.75 17.4993Z" fill={isActive ? "#0062AD" : iColor} className="home-fill" />
            <path d="M2.83333 10.1667V2.83333C2.83333 2.3471 3.02649 1.88079 3.3703 1.53697C3.71412 1.19315 4.18044 1 4.66667 1H15.6667C16.1529 1 16.6192 1.19315 16.963 1.53697C17.3068 1.88079 17.5 2.3471 17.5 2.83333V14.75C17.5 15.6667 16.95 17.5 14.75 17.5M14.75 17.5H3.75C2.83333 17.5 1 16.95 1 14.75V12.9167H12V14.75C12 16.95 13.8333 17.5 14.75 17.5Z" stroke={isActive ? "#0062AD" : iColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="home-stroke" />
          </S.HomeIconSvg>
        ) : isLibrary ? (
          <S.LibraryIconSvg $size={isSidebar ? 28 : 24} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.75 5.50033C2.75 5.0141 2.94315 4.54778 3.28697 4.20396C3.63079 3.86015 4.0971 3.66699 4.58333 3.66699H8.18583C8.48759 3.66695 8.78468 3.74139 9.05077 3.8837C9.31685 4.02602 9.54369 4.23181 9.71117 4.48283L10.4555 5.60116C10.623 5.85217 10.8498 6.05797 11.1159 6.20028C11.382 6.3426 11.6791 6.41704 11.9808 6.41699H17.4167C17.9029 6.41699 18.3692 6.61015 18.713 6.95396C19.0568 7.29778 19.25 7.7641 19.25 8.25033V16.5003C19.25 16.9866 19.0568 17.4529 18.713 17.7967C18.3692 18.1405 17.4167 18.3337 17.4167 18.3337H4.58333C4.0971 18.3337 3.63079 18.1405 3.28697 17.7967C2.94315 17.4529 2.75 16.9866 2.75 16.5003V5.50033Z" fill={isActive ? "#0062AD" : iColor} className="library-fill" />
          </S.LibraryIconSvg>
        ) : (
          (item.icon || isSidebar) && (
            <S.IconBox>
              {(() => {
                const IconKey = item.icon;

                // 1. Check if direct SVG code
                if (IconKey && IconKey.trim().startsWith('<svg')) {
                  return (
                    <S.SvgIconContainer
                      $isSidebar={isSidebar}
                      $isActive={isActive}
                      $iColor={iColor}
                      dangerouslySetInnerHTML={{ __html: encodeHTML(IconKey) }}
                    />
                  );
                }

                // 2. Check if IconKey is a URL
                const isUrl = IconKey && (IconKey.startsWith('http') || IconKey.startsWith('/') || IconKey.includes('.'));
                if (isUrl) {
                  return (
                    <S.NavIconImg
                      src={IconKey}
                      alt=""
                      $isSidebar={isSidebar}
                    />
                  );
                }

                // Bỏ qua validate computed reference bằng cách gán vào biến nội bộ
                const icons = LucideIcons;
                const IconComp = IconKey && icons[IconKey];
                if (IconComp) {
                  return <IconComp size={isSidebar ? 24 : 20} stroke={isActive ? "#0062AD" : iColor} />;
                }
                if (isSidebar) {
                  return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#0062AD" : iColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                  );
                }
                return null;
              })()}
            </S.IconBox>
          )
        )}
        {(item.label !== "Home" || isSidebar) ? (item.label === "Home" ? "Tin tức" : item.label) : "Tin tức"}

        {isHome && topics?.length > 0 && (
          <S.TopicDropdownContainer $isSidebar={isSidebar}>
            <S.TopicList>
              {topics.map(topic => (
                <TopicMenuItem
                  key={topic.id}
                  topic={topic}
                  onClick={handleTopicItemClick}
                  isActive={currentTopicId === topic.id}
                />
              ))}
            </S.TopicList>
          </S.TopicDropdownContainer>
        )}
      </S.NavLinkStyled>
    </S.StyledLink>
  );
};

export function PreviewView({ children }) {
  const {
    layout,
    headerConfig,
    preHeaderConfig,
    topicNavConfig,
    footerConfig,
    setActivePage,
    setIsPreview,
    subHeaderConfig,
    activePage,
    apiError
  } = useCMS();
  const { user } = useContext(AuthContext);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  // const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Kết nối socket toàn cục để luôn nhận được thông báo tag/mới
  const { fetchNotifications } = useNotificationSocket(null);

  // Lắng nghe sự kiện yêu cầu reload thông báo từ các modal khác
  useEffect(() => {
    const handleReload = () => fetchNotifications(1, 10);
    window.addEventListener('RELOAD_NOTIFICATIONS', handleReload);
    return () => window.removeEventListener('RELOAD_NOTIFICATIONS', handleReload);
  }, [fetchNotifications]);
  const dispatch = useDispatch();

  const headerPos = headerConfig?.position || "top";
  const isFixed = headerConfig?.isFixed;
  const isSidebar = !isMobile && (headerPos === "left" || headerPos === "right");
  const isMiddle = headerPos === "middle";
  const sidebarWidth = headerConfig?.sidebarWidth || 70;
  const menuFontSize = headerConfig?.menuFontSize || 13;
  const homeIconSize = headerConfig?.homeIconSize || (isSidebar ? 28 : 30);
  const menuSpacing = headerConfig?.menuSpacing || (isSidebar ? 16 : 20);
  const tabTextColor = headerConfig?.tabTextColor || "#707070";
  const tabIconColor = headerConfig?.tabIconColor || "#707070";
  const logoWidth = headerConfig?.logoWidth || (isSidebar ? 50 : 40);
  const logoHeight = headerConfig?.logoHeight || "auto";
  const visibleHeaderMenu = useMemo(
    () => (headerConfig?.menu || []).filter(item => !item.hidden),
    [headerConfig?.menu]
  );
  const { topicHeaderMenu, topicLibraryMenu } = useMemo(() => {
    const normalizeText = (value = "") => value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .trim()
      .toLowerCase();
    const isLibraryItem = (item) => {
      const label = normalizeText(item.label);
      const href = normalizeText(item.href);
      return label.includes("thu vien") || href.includes("thu-vien") || href.includes("library");
    };

    return {
      topicHeaderMenu: visibleHeaderMenu.filter(item => !isLibraryItem(item)),
      topicLibraryMenu: visibleHeaderMenu.filter(isLibraryItem)
    };
  }, [visibleHeaderMenu]);
  const { userRoleList, topicList } = useSelector((state) => state.news);

  const urlTopicId = useMemo(() => {
    if (!activePage) return null;
    const search = activePage.split("?")[1];
    if (!search) return null;
    try {
      return new URLSearchParams(search).get("topicId");
    } catch {
      return null;
    }
  }, [activePage]);

  const topics = useMemo(() => {
    const list = Array.isArray(topicList) ? topicList : (topicList?.data || topicList?.items || []);
    return list.filter(topic => !topic.status?.includes("Không hoạt động"));
  }, [topicList]);

  // Sort 1 lần duy nhất, tăng dần theo order (undefined/null → đẩy xuống cuối)
  const topicsSorted = useMemo(() => {
    return [...topics].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
  }, [topics]);



  // TopicNav: luôn top 14
  const topicsForNav = useMemo(() => {
    return topicsSorted.slice(0, 14);
  }, [topicsSorted]);

  // Dropdown trong Home menu: luôn top 14, chỉ slice từ array đã sort sẵn
  const topicsForMenuDropdown = useMemo(() => {
    return topicsSorted.slice(0, 14);
  }, [topicsSorted]);
  const showTopicNav = !topicNavConfig?.hidden;

  useEffect(() => {
    dispatch(fetchTopics({ limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (headerConfig?.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = headerConfig.faviconUrl;
    }
  }, [headerConfig?.faviconUrl]);
  const isAdmin = userRoleList?.roles?.some(
    (role) => role === "ADMIN_NEWS"
  );
  useEffect(() => {
    dispatch(fetchUserRoles());
  }, [dispatch]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Cuộn lên đầu trang khi chuyển đổi tab / màn hình
  useEffect(() => {
    window.scrollTo(0, 0);
    const container = document.querySelector('.cms-module-container');
    if (container && container.parentElement) {
      container.parentElement.scrollTo(0, 0);
    }
  }, [activePage]);

  const handleConfigAction = useCallback((val) => {
    if (!user) {
      setShowAuthModal(true);
      setIsSidebarOpen(false); // Close sidebar to show modal clearly
    } else {
      setIsPreview(val);
    }
  }, [user, setIsPreview]);

  const handleCloseAuthModal = useCallback(() => setShowAuthModal(false), []);
  const handleEditClick = useCallback(() => handleConfigAction(false), [handleConfigAction]);
  const handleOpenSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);
  // const handleToggleNotification = useCallback(() => {
  //   if (!showNotificationModal) {
  //     fetchNotifications(1, 10);
  //   }
  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  const handleLogoClick = useCallback((e) => {
    e.preventDefault();
    if (setActivePage) {
      setActivePage("/");
      window.history.pushState(null, "", "/");
    }
  }, [setActivePage]);

  const handleNavWheel = useCallback((e) => {
    if (!isSidebar) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  }, [isSidebar]);

const handleMenuClick = useCallback((e, directHref) => {
    if (setActivePage) {
      e.preventDefault();
      
      // Lấy href từ tham số trực tiếp (cho các menu thông thường), 
      // nếu không có thì lấy từ thuộc tính data-href của thẻ được click (cho các menu dùng ref trực tiếp)
      const href = directHref || e.currentTarget?.getAttribute("data-href");

      if (href) {
        setActivePage(href);
        window.history.pushState(null, "", href);
      } else {
        logger.warn("handleMenuClick: href is undefined or empty");
      }
    }
  }, [setActivePage]);

  const handleTopicNavClick = useCallback((topic) => (e) => {
    e.preventDefault();

    const params = new URLSearchParams({ topicId: String(topic.id) });
    const topicName = topic.name || topic.title;
    if (topicName) params.set("topicName", topicName);

    const url = `${ROUTES.TIN_TUC}?${params.toString()}`;
    setActivePage(url);
    window.history.pushState(null, "", url);
  }, [setActivePage]);

  // Nếu là Mobile thì lấy hết, nếu là Desktop thì chỉ lấy từ mục thứ 8 trở đi (vì desktop hiển thị 0-8)
  const sidebarMenu = useMemo(() => {
    const groupMenu = isMobile
      ? visibleHeaderMenu
      : visibleHeaderMenu.slice(8);

    const extraMenuMapped = groupMenu.map(m => ({
      label: m.label.toLowerCase() === "home" ? "Tin tức" : m.label,
      icon: (m.label.toLowerCase() === "home" || m.label === "Tin tức") ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ) : (m.label === "Thư viện") ? (
        <svg width="24" height="24" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.75 5.50033C2.75 5.0141 2.94315 4.54778 3.28697 4.20396C3.63079 3.86015 4.0971 3.66699 4.58333 3.66699H8.18583C8.48759 3.66695 8.78468 3.74139 9.05077 3.8837C9.31685 4.02602 9.54369 4.23181 9.71117 4.48283L10.4555 5.60116C10.623 5.85217 10.8498 6.05797 11.1159 6.20028C11.382 6.3426 11.6791 6.41704 11.9808 6.41699H17.4167C17.9029 6.41699 18.3692 6.61015 18.713 6.95396C19.0568 7.29778 19.25 7.7641 19.25 8.25033V16.5003C19.25 16.9866 19.0568 17.4529 18.713 17.7967C18.3692 18.1405 17.4167 18.3337 17.4167 18.3337H4.58333C4.0971 18.3337 3.63079 18.1405 3.28697 17.7967C2.94315 17.4529 2.75 16.9866 2.75 16.5003V5.50033Z" fill="currentColor" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      ),
      action: () => {
        if (setActivePage) {
          setActivePage(m.href);
          window.history.pushState(null, "", m.href);
        }
        setIsSidebarOpen(false);
      }
    }));
    return [...extraMenuMapped];
  }, [visibleHeaderMenu, isMobile, setActivePage]);

  const pathname = usePathname();
  const { currentNews } = useSelector((state) => state.news);
  const isPageHideTopicNav = useMemo(() => {
    const currentPath = activePage?.split('?')[0].replace(/\/$/, '') || "";

    const userPageConfig = headerConfig?.menu?.find(m => {
      const menuPath = m.href?.split('?')[0].replace(/\/$/, '') || "";
      return (menuPath === currentPath || (menuPath !== "" && currentPath.startsWith(menuPath)));
    });

    const systemPageConfig = headerConfig?.systemPages?.find(s => {
      const systemPath = s.href?.split('?')[0].replace(/\/$/, '') || "";
      return (systemPath === currentPath || (systemPath !== "" && currentPath.startsWith(systemPath)));
    });

    return Boolean((userPageConfig || systemPageConfig)?.hideTopicNav);
  }, [activePage, headerConfig?.menu, headerConfig?.systemPages]);

  // const handleHelpClick = useCallback(() => {
  //   // Potentially open help modal?
  // }, []);

  return (
    <S.PreviewContainer $bgVal={headerConfig?.layoutBackgroundColor} $isSidebar={isSidebar}>
      <style>{`
        html, body {
          overscroll-behavior-y: none;
        }
      `}</style>

      {/* Auth Warning Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
      />

      <ErrorOverlay error={apiError} />

      {headerConfig && !headerConfig.hidden && !isMiddle && (
        <S.Header
          $isSidebar={isSidebar}
          $headerPos={headerPos}
          $isFixed={isFixed}
          $sidebarWidth={sidebarWidth}
          $bgCol={headerConfig.backgroundColor}
          $bgImg={headerConfig.backgroundImage}
        >
          <S.HeaderInner
            $isSidebar={isSidebar}
            $menuSpacing={menuSpacing}
          >
            {/* Chỉ hiển thị Logo ảnh ở đây */}
            <S.LogoGroup $isSidebar={isSidebar}>
              {/* Mobile Menu Button - Hamburger */}
              <S.MobileMenuBtn
                onClick={handleOpenSidebar}
              >
                <Menu size={28} />
              </S.MobileMenuBtn>

              {headerConfig.logoUrl && (
                <Link href="/" onClick={handleLogoClick}>
                  <S.LogoImage
                    src={headerConfig.logoUrl}
                    alt="Logo"
                    $wVal={logoWidth}
                    $hVal={logoHeight}
                  />
                </Link>
              )}
            </S.LogoGroup>
            <S.DesktopNav
              $isSidebar={isSidebar}
              $menuSpacing={menuSpacing}
              onWheel={handleNavWheel}
            >
              {visibleHeaderMenu.slice(0, 8).map((m) => {
                const currentPath = (activePage || pathname || "/").split('?')[0];
                const menuPath = (m.href || "/").split('?')[0];
                let isActive = currentPath === menuPath;

                // Nếu đang ở trang chủ, mặc định active tab Tin tức/Home
                if (!isActive && currentPath === "/" && (m.label?.toLowerCase() === "tin tức" || m.label?.toLowerCase() === "home" || m.label?.toLowerCase() === "trang chủ" || m.label?.toLowerCase() === "news")) {
                  isActive = true;
                }

                // Logic check active
                if (!isActive) {
                  const isNewsTab = m.href === "/" || m.href === ROUTES.TIN_TUC || m.label?.toLowerCase() === "tin tức" || m.label?.toLowerCase() === "home" || m.label?.toLowerCase() === "trang chủ";

                  if (currentPath.startsWith(ROUTES.NEWS_DETAIL_PREFIX)) {
                    const topicHref = currentNews ? `${ROUTES.TOPIC_PREFIX}${encodeURIComponent(currentNews.topic || currentNews.topicName || "")}` : null;
                    const hasTopicInMenu = topicHref ? visibleHeaderMenu.some(menuItem => menuItem.href === topicHref) : false;

                    if (topicHref && m.href === topicHref) {
                      isActive = true;
                    } else if (isNewsTab && !hasTopicInMenu) {
                      isActive = true;
                    }
                  }

                  if (currentPath.startsWith(ROUTES.TOPIC_PREFIX) || currentPath.startsWith(ROUTES.TIN_TUC) || currentPath.startsWith(ROUTES.SEARCH) || currentPath.startsWith(ROUTES.CALENDAR)) {
                    const hasTopicInMenu = visibleHeaderMenu.some(menuItem => menuItem.href === currentPath);
                    if (isNewsTab && !hasTopicInMenu) {
                      isActive = true;
                    }
                  }
                  if (currentPath.startsWith(ROUTES.VIDEO_DETAIL_PREFIX) && currentPath !== ROUTES.VIDEO) {
                    if (m.href === ROUTES.VIDEO) isActive = true;
                  }
                  if (currentPath.startsWith(ROUTES.ALBUM_DETAIL_PREFIX) && currentPath !== ROUTES.ALBUM) {
                    if (m.href === ROUTES.ALBUM) isActive = true;
                  }
                }

                return (
                  <NavMenuItem
                    key={m.href}
                    item={m}
                    isSidebar={isSidebar}
                    isActive={isActive}
                    fSize={menuFontSize}
                    tColor={tabTextColor}
                    iColor={tabIconColor}
                    homeIconSize={homeIconSize}
                    onClick={handleMenuClick}
                    topics={topicsForMenuDropdown}
                    currentTopicId={urlTopicId}
                  />
                );
              })}
            </S.DesktopNav>
          </S.HeaderInner>
          <S.UserMenuContainer
            $isSidebar={isSidebar}
          >
            {/* <S.ActionButton onClick={handleHelpClick}>
              <HelpCircle size={22} />
            </S.ActionButton> */}
            {/* <div style={{ position: "relative", display: "flex", zIndex: 1001 }}>
              <S.ActionButton
                onClick={handleToggleNotification}
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <S.UnreadBadge>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </S.UnreadBadge>
                )}
              </S.ActionButton>
              <NotificationDropdown
                isOpen={showNotificationModal}
                onClose={handleCloseNotification}
                isSidebar={isSidebar}
                headerPos={headerPos}
                notifications={notifications}
                unreadCount={unreadCount}
                fetchNotifications={fetchNotifications}
                total={total}
              />
            </div> */}
            {isAdmin && (
              <S.ConfigActionButton
                onClick={handleEditClick}
                title="Cấu hình giao diện"
              >
                <Settings size={22} />
              </S.ConfigActionButton>
            )}
          </S.UserMenuContainer>
        </S.Header>
      )}

      {/* Main Content Wrapper */}
      <S.MainWrapper
        $isFixed={isFixed}
        $isSidebar={isSidebar}
        $isHidden={headerConfig?.hidden}
        $headerPos={headerPos}
      >
        {(() => {
          const isUserHidePreHeader = headerConfig?.menu?.some(m =>
            (m.href === activePage || (m.href !== "/" && activePage?.startsWith(m.href))) && m.hidePreHeader
          );
          const isSystemHidePreHeader = headerConfig?.systemPages?.some(s =>
            (s.href === activePage || (s.href !== "/" && activePage?.startsWith(s.href))) && s.hidePreHeader
          );

          if (isUserHidePreHeader || isSystemHidePreHeader || !preHeaderConfig || preHeaderConfig.hidden) {
            return null;
          }

          return (
            <div>
              {(() => {
                const mapConfig = preHeaderConfig.componentType && PREHEADER_MAP[preHeaderConfig.componentType]
                  ? PREHEADER_MAP[preHeaderConfig.componentType]
                  : PREHEADER_MAP.default;
                const Comp = mapConfig?.component;
                if (!Comp) return null;
                return <Comp {...preHeaderConfig} />;
              })()}
            </div>
          );
        })()}

        {/* Header - Middle position: rendered between TopBar and TopicNav */}
        {isMiddle && headerConfig && !headerConfig.hidden && (
          <S.Header
            $isSidebar={false}
            $headerPos={headerPos}
            $isFixed={isFixed}
            $sidebarWidth={sidebarWidth}
            $bgCol={headerConfig.backgroundColor}
            $bgImg={headerConfig.backgroundImage}
          >
            <S.HeaderInner
              $isSidebar={false}
              $menuSpacing={menuSpacing}
            >
              <S.LogoGroup $isSidebar={false}>
                <S.MobileMenuBtn onClick={handleOpenSidebar}>
                  <Menu size={28} />
                </S.MobileMenuBtn>
                {headerConfig.logoUrl && (
                  <a href="/" onClick={handleLogoClick}>
                    <S.LogoImage
                      src={headerConfig.logoUrl}
                      alt="Logo"
                      $wVal={logoWidth}
                      $hVal={logoHeight}
                    />
                  </a>
                )}
              </S.LogoGroup>
              <S.DesktopNav
                $isSidebar={false}
                $menuSpacing={menuSpacing}
                onWheel={handleNavWheel}
              >
                {visibleHeaderMenu.slice(0, 8).map((m) => {
                  const currentPath = (activePage || "/").split('?')[0];
                  const menuPath = (m.href || "/").split('?')[0];
                  const isActive = currentPath === menuPath;
                  return (
                    <NavMenuItem
                      key={m.href}
                      item={m}
                      isSidebar={false}
                      isActive={isActive}
                      fSize={menuFontSize}
                      tColor={tabTextColor}
                      iColor={tabIconColor}
                      homeIconSize={homeIconSize}
                      onClick={handleMenuClick}
                      topics={topicsForMenuDropdown}
                      currentTopicId={urlTopicId}
                    />
                  );
                })}
              </S.DesktopNav>
            </S.HeaderInner>
            <S.UserMenuContainer $isSidebar={false}>
              {isAdmin && (
                <S.ConfigActionButton
                  onClick={handleEditClick}
                  title="C\u1ea5u h\u00ecnh giao di\u1ec7n"
                >
                  <Settings size={22} />
                </S.ConfigActionButton>
              )}
            </S.UserMenuContainer>
          </S.Header>
        )}

        {(((showTopicNav && !isPageHideTopicNav) && (topics.length > 0 || visibleHeaderMenu.length > 0 || isAdmin)) || (subHeaderConfig && !subHeaderConfig.hidden)) && (
          <>
            {showTopicNav && !isPageHideTopicNav && (topics.length > 0 || visibleHeaderMenu.length > 0 || isAdmin) && (
              <S.TopicNavBarWrapper $surface={topicNavConfig?.backgroundColor}>
                <S.TopicNavBarInner>
                  <S.TopicNavList>
                    {topicHeaderMenu.map((m) => {
                      const currentPath = (activePage || pathname || "/").split('?')[0];
                      const menuPath = (m.href || "/").split('?')[0];
                      const isActive = currentPath === menuPath;
                      const label = m.label === "Home" ? "Tin tức" : m.label;

                      return (
                        <S.TopicNavButton
                          key={`header-menu-${m.href || label}`}
                          type="button"
                          data-href={m.href} 
                          onClick={handleMenuClick}
                          $isActive={isActive}
                          $surface={topicNavConfig?.backgroundColor}
                          $hoverTone={topicNavConfig?.hoverBackgroundColor}
                          $activeTone={topicNavConfig?.activeBackgroundColor}
                          $ink={topicNavConfig?.textColor}
                          $hoverInk={topicNavConfig?.hoverTextColor}
                          $activeInk={topicNavConfig?.activeTextColor}
                          $underlineColor={topicNavConfig?.underlineColor}
                          title={label}
                        >
                          {label}
                        </S.TopicNavButton>
                      );
                    })}
                    {topicsForNav.map((topic) => {
                      const topicName = topic.name || topic.title;
                      const isActive = String(urlTopicId || "") === String(topic.id);

                      return (
                        <S.TopicNavButton
                          key={topic.id}
                          type="button"
                          onClick={handleTopicNavClick(topic)}
                          $isActive={isActive}
                          $surface={topicNavConfig?.backgroundColor}
                          $hoverTone={topicNavConfig?.hoverBackgroundColor}
                          $activeTone={topicNavConfig?.activeBackgroundColor}
                          $ink={topicNavConfig?.textColor}
                          $hoverInk={topicNavConfig?.hoverTextColor}
                          $activeInk={topicNavConfig?.activeTextColor}
                          $underlineColor={topicNavConfig?.underlineColor} 
                          title={topicName}
                        >
                          {topicName}
                        </S.TopicNavButton>
                      );
                    })}
                    {topicLibraryMenu.map((m) => {
                      const currentPath = (activePage || pathname || "/").split('?')[0];
                      const menuPath = (m.href || "/").split('?')[0];
                      const isActive = currentPath === menuPath;
                      const label = m.label === "Home" ? "Tin tức" : m.label;

                      return (
                        <S.TopicNavButton
                          key={`header-menu-library-${m.href || label}`}
                          type="button"
                          data-href={m.href} 
                          onClick={handleMenuClick}
                          $isActive={isActive}
                          $surface={topicNavConfig?.backgroundColor}
                          $hoverTone={topicNavConfig?.hoverBackgroundColor}
                          $activeTone={topicNavConfig?.activeBackgroundColor}
                          $ink={topicNavConfig?.textColor}
                          $hoverInk={topicNavConfig?.hoverTextColor}
                          $activeInk={topicNavConfig?.activeTextColor}
                          $underlineColor={topicNavConfig?.underlineColor}
                          title={label}
                        >
                          {label}
                        </S.TopicNavButton>
                      );
                    })}
                    {/* {isAdmin && (
                      <S.TopicNavButton
                        type="button"
                        onClick={handleEditClick}
                        $isActive={false}
                        $surface={topicNavConfig?.backgroundColor}
                        $hoverTone={topicNavConfig?.hoverBackgroundColor}
                        $activeTone={topicNavConfig?.activeBackgroundColor}
                        $ink={topicNavConfig?.textColor}
                        $hoverInk={topicNavConfig?.hoverTextColor}
                        $activeInk={topicNavConfig?.activeTextColor}
                        $underlineColor={topicNavConfig?.underlineColor}
                        title="THIẾT LẬP CÀI ĐẶT"
                      >
                        THIẾT LẬP CÀI ĐẶT
                      </S.TopicNavButton>
                    )} */}
                  </S.TopicNavList>
                </S.TopicNavBarInner>
              </S.TopicNavBarWrapper>
            )}

            <S.SubHeaderWrapper
              $isFixed={isFixed}
              $isSidebar={isSidebar}
              $isHidden={headerConfig?.hidden}
              $headerPos={headerPos}
            >

              {(() => {
                if (!subHeaderConfig || subHeaderConfig.hidden) return null;
                const Comp = SUBHEADER_MAP?.default?.component;
                if (!Comp) return null;

                const currentPath = activePage?.split('?')[0].replace(/\/$/, '') || "";

                const userPageConfig = headerConfig?.menu?.find(m => {
                  const menuPath = m.href?.split('?')[0].replace(/\/$/, '') || "";
                  return (menuPath === currentPath || (menuPath !== "" && currentPath.startsWith(menuPath)));
                });

                const systemPageConfig = headerConfig?.systemPages?.find(s => {
                  const systemPath = s.href?.split('?')[0].replace(/\/$/, '') || "";
                  return (systemPath === currentPath || (systemPath !== "" && currentPath.startsWith(systemPath)));
                });

                const activeConfig = userPageConfig || systemPageConfig || {};
                const isUserHideSearch = activeConfig.hideSearch;

                const mergedSubHeaderConfig = {
                  ...subHeaderConfig,
                  backgroundColor: activeConfig.subHeaderBg || subHeaderConfig.backgroundColor,
                  textColor: activeConfig.subHeaderText || subHeaderConfig.textColor,
                  accentColor: activeConfig.subHeaderAccent || subHeaderConfig.accentColor,
                  searchBgColor: activeConfig.subHeaderSearchBg || subHeaderConfig.searchBgColor
                };

                return <Comp {...mergedSubHeaderConfig} hideSearch={isUserHideSearch} />;
              })()}
            </S.SubHeaderWrapper>
          </>
        )}

        <S.MainContent
          $bgVal={headerConfig?.layoutBackgroundColor}
        >
          {(() => {
            const isFullWidthPage = activePage === ROUTES.CALENDAR ||
              headerConfig?.menu?.find(m => m.href === activePage)?.fullWidth ||
              headerConfig?.menu?.find(m => activePage?.startsWith(m.href) && m.href !== "/")?.fullWidth ||
              headerConfig?.systemPages?.some(s => (s.href === activePage || (s.href !== "/" && activePage?.startsWith(s.href))) && s.fullWidth);

            const pageMaxW = isFullWidthPage ? "100%" : "1550px";

            if (children) {
              return (
                <div style={{ width: '100%', minWidth: 0 }}>
                  {children}
                </div>
              );
            }

            if (activePage === ROUTES.CALENDAR) {
              return (
                <S.BlockContainer $wVal={100} $bgCol="transparent">
                  <S.ContentWrapper $wVal={100} $maxW="100%">
                    <EventCalendarPage />
                  </S.ContentWrapper>
                </S.BlockContainer>
              );
            }

            return (
              layout.map(block => {
                const blockConfig = BLOCKS[block.type];
                const Comp = blockConfig?.component;
                const width = block.props?.width || 100;
                const height = block.props?.height || "";
                const heightTablet = block.props?.heightTablet || "";

                if (!Comp) {
                  return (
                    <S.BlockContainer key={block.id} $wVal={width} $mbVal={block.props?.marginBottom}>
                      <S.ContentWrapper $wVal={width} $hVal={height} $hTablet={heightTablet}>
                        <div style={{ color: 'red', border: '1px solid red', padding: 10 }}>
                          Missing component for: {block.type}
                        </div>
                      </S.ContentWrapper>
                    </S.BlockContainer>
                  );
                }

                if (block.type === "news") {
                  const newsPath = ROUTES.newsDetail(block.id);
                  return (
                    <S.BlockContainer key={block.id} $wVal={width} $bgCol={block.props?.backgroundColor} $mbVal={block.props?.marginBottom}>
                      <S.ContentWrapper $wVal={width} $hVal={height} $hTablet={heightTablet} $maxW={pageMaxW}>
                        <Comp id={block.id} {...block.props} href={newsPath} activePage={activePage || pathname} />
                      </S.ContentWrapper>
                    </S.BlockContainer>
                  );
                }

                return (
                  <S.BlockContainer key={block.id} $wVal={width} $bgCol={block.props?.backgroundColor} $mbVal={block.props?.marginBottom}>
                    <S.ContentWrapper $wVal={width} $hVal={height} $hTablet={heightTablet} $maxW={pageMaxW}>
                      <Comp id={block.id} {...block.props} activePage={activePage || pathname} />
                    </S.ContentWrapper>
                  </S.BlockContainer>
                );
              })
            );
          })()}
        </S.MainContent>

        {footerConfig && !footerConfig.hidden && (
          <S.Footer>
            {(() => {
              const mapConfig = footerConfig.componentType && FOOTER_MAP[footerConfig.componentType]
                ? FOOTER_MAP[footerConfig.componentType]
                : FOOTER_MAP.default;
              const Comp = mapConfig?.component;
              if (!Comp) return null;
              return <Comp {...footerConfig} />;
            })()}
          </S.Footer>
        )}

        <ConfigSidebar
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          menuItems={sidebarMenu}
        />

        {/* Premium Scroll To Top Button */}
        <S.ScrollTopButton
          $visible={showScrollTop}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </S.ScrollTopButton>
      </S.MainWrapper>
    </S.PreviewContainer>
  );
}
