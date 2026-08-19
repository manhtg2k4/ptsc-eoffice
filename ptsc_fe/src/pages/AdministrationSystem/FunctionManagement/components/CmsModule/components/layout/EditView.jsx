import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BLOCKS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/blocks";
import { FOOTER_MAP, PREHEADER_MAP, SUBHEADER_MAP } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/componentMapping";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { SortableBlock } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/SortableBlock/SortableBlock";
import { ControlBar } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/layout/ControlBar";
import { PageSidebar } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/layout/PageSidebar";
import { AddPanel } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/layout/AddPanel";
import { ConfigPanel } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/layout/ConfigPanel";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import { fetchTopics } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import * as LucideIcons from "lucide-react";
import * as S from './EditView.styles';
import { encodeHTML } from "@/utils/securityUtils";

export function EditView() {
  const dispatch = useDispatch();
  const { topicList } = useSelector((state) => state.news);
  const {
    headerConfig,
    setHeaderConfig,
    preHeaderConfig,
    setPreHeaderConfig,
    topicNavConfig,
    setTopicNavConfig,
    footerConfig,
    setFooterConfig,
    activePage,
    setActivePage,
    layout,
    setLayout,
    selected,
    setSelected,
    showAddPanel,
    setShowAddPanel,
    showPageMenu,
    setShowPageMenu,
    setIsPreview,
    pages,
    setPages,
    onDragEnd,
    deleteBlock,
    handleResizeBlock,
    addPage,
    deletePage,
    updateBlock,
    onSave,
    updatePageMetadata,
    subHeaderConfig,
    setSubHeaderConfig,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    // setIsSidebarOpen,
  } = useCMS();
  // const { user, logout } = useContext(AuthContext);

  const headerPos = headerConfig?.position || "top";
  const isSidebar = (headerPos === "left" || headerPos === "right");
  const isMiddle = headerPos === "middle";
  const sidebarWidth = headerConfig?.sidebarWidth || 120;
  const menuFontSize = headerConfig?.menuFontSize || 14;
  const homeIconSize = headerConfig?.homeIconSize || (isSidebar ? 36 : 30);
  const menuSpacing = headerConfig?.menuSpacing || (isSidebar ? 30 : 20);
  const tabTextColor = headerConfig?.tabTextColor || "#185b8e";
  const tabIconColor = headerConfig?.tabIconColor || "#185b8e";
  const logoWidth = headerConfig?.logoWidth || (isSidebar ? 70 : 40);
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

  useEffect(() => {
    if (headerConfig?.siteTitle) {
      document.title = headerConfig.siteTitle;
    }
  }, [headerConfig?.siteTitle]);

  const [activeDragItem, setActiveDragItem] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const topics = useMemo(() => {
    const list = Array.isArray(topicList) ? topicList : (topicList?.data || topicList?.items || []);
    return list.filter(topic => !topic.status?.includes("Không hoạt động"));
  }, [topicList]);
  const activeTopicId = useMemo(() => {
    if (!activePage) return null;
    const search = activePage.split("?")[1];
    if (!search) return null;

    try {
      return new URLSearchParams(search).get("topicId");
    } catch {
      return null;
    }
  }, [activePage]);
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && !e.target.closest('.header-user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  useEffect(() => {
    dispatch(fetchTopics({ limit: 100 }));
  }, [dispatch]);

  // const handleLogout = async () => {
  //   setShowUserMenu(false);
  //   if (logout) {
  //     await logout();
  //     window.location.reload();
  //   }
  // };

  // const getUserDisplay = () => {
  //   if (!user || (!user.user && !user.username)) return { name: 'User', initial: 'U', role: 'Thành viên' };
  //   const username = user.user?.username || user.username || 'User';
  //   const role = user.user?.organizationName || user.organizationName || 'SNP Member';
  //   return { name: username, initial: username.charAt(0).toUpperCase(), role };
  // };
  // const userInfo = getUserDisplay();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event) => {
    setActiveDragItem(event.active);
  };

  const handleDragEndWrapper = (event) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    if (active.id.toString().startsWith("new-")) {
      const type = active.data.current?.type;
      if (type) {
        const defaultProps = Object.fromEntries(Object.keys(BLOCKS[type].schema).map(k => [k, ""]));
        if ("width" in defaultProps) defaultProps.width = 100;
        if ("height" in defaultProps) defaultProps.height = "";

        const newBlock = {
          id: Date.now().toString(),
          type,
          props: defaultProps
        };

        const overIndex = layout.findIndex(x => x.id === over.id);
        const newLayout = [...layout];

        if (overIndex !== -1) {
          newLayout.splice(overIndex + 1, 0, newBlock);
        } else {
          newLayout.push(newBlock);
        }
        setLayout(newLayout);
      }
      return;
    }

    // Nếu là kéo thả sắp xếp bình thường
    if (onDragEnd) onDragEnd(event);
  };

  const onHandleHeaderClick = useCallback(() => {
    setSelected({ id: "header", type: "header", props: headerConfig });
  }, [headerConfig, setSelected]);

  const onHandleHeaderMouseEnter = useCallback((e) => {
    if (selected?.id !== "header") e.currentTarget.style.outline = "1px dashed #0B5FFF";
  }, [selected?.id]);

  const onHandleHeaderMouseLeave = useCallback((e) => {
    if (selected?.id !== "header") e.currentTarget.style.outline = "1px dashed transparent";
  }, [selected?.id]);

  const onHandlePreHeaderClick = useCallback(() => {
    setSelected({ id: "preHeader", type: "preHeader", props: preHeaderConfig });
  }, [preHeaderConfig, setSelected]);

  const onHandlePreHeaderMouseEnter = useCallback((e) => {
    if (selected?.id !== "preHeader") e.currentTarget.style.outline = "1px dashed #0B5FFF";
  }, [selected?.id]);

  const onHandlePreHeaderMouseLeave = useCallback((e) => {
    if (selected?.id !== "preHeader") e.currentTarget.style.outline = "1px dashed transparent";
  }, [selected?.id]);

  const onHandleSubHeaderClick = useCallback(() => {
    setSelected({ id: "subHeader", type: "subHeader", props: subHeaderConfig });
  }, [subHeaderConfig, setSelected]);

  const onHandleTopicNavClick = useCallback(() => {
    setSelected({ id: "topicNav", type: "topicNav", props: topicNavConfig });
  }, [topicNavConfig, setSelected]);

  const onHandleSubHeaderMouseEnter = useCallback((e) => {
    if (selected?.id !== "subHeader") e.currentTarget.style.outline = "1px dashed #0B5FFF";
  }, [selected?.id]);

  const onHandleSubHeaderMouseLeave = useCallback((e) => {
    if (selected?.id !== "subHeader") e.currentTarget.style.outline = "1px dashed transparent";
  }, [selected?.id]);

  const onHandleTopicNavMouseEnter = useCallback((e) => {
    if (selected?.id !== "topicNav") e.currentTarget.style.outline = "1px dashed #0B5FFF";
  }, [selected?.id]);

  const onHandleTopicNavMouseLeave = useCallback((e) => {
    if (selected?.id !== "topicNav") e.currentTarget.style.outline = "1px dashed transparent";
  }, [selected?.id]);

  const onHandleFooterClick = useCallback(() => {
    setSelected({ id: "footer", type: "footer", props: footerConfig });
  }, [footerConfig, setSelected]);

  const onHandleFooterMouseEnter = useCallback((e) => {
    if (selected?.id !== "footer") e.currentTarget.style.outline = "1px dashed #0B5FFF";
  }, [selected?.id]);

  const onHandleFooterMouseLeave = useCallback((e) => {
    if (selected?.id !== "footer") e.currentTarget.style.outline = "1px dashed transparent";
  }, [selected?.id]);

  const handleControlBarBack = useCallback(() => setIsPreview(true), [setIsPreview]);
  const handleNavWheel = useCallback((e) => {
    if (!isSidebar) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  }, [isSidebar]);

  const handleCloseMobileMenu = useCallback((e) => {
    e.stopPropagation();
    setIsMobileMenuOpen(false);
  }, []);

  const handleAddBlockToLayout = useCallback((block) => {
    setLayout([...layout, block]);
  }, [layout, setLayout]);

  const handleCloseAddPanel = useCallback(() => {
    setShowAddPanel(false);
  }, [setShowAddPanel]);

  const handleCloseSelected = useCallback(() => {
    setSelected(null);
  }, [setSelected]);

  const handleMobileMenuNav = useCallback((href) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePage(href);
    setIsMobileMenuOpen(false);
  }, [setActivePage]);

  const handleTopicMenuClick = useCallback((topic) => (e) => {
    e.preventDefault();
    e.stopPropagation();

    const params = new URLSearchParams({ topicId: String(topic.id) });
    const topicName = topic.name || topic.title;
    if (topicName) params.set("topicName", topicName);

    setActivePage(`${ROUTES.TIN_TUC}?${params.toString()}`);
  }, [setActivePage]);

  const handleTopicHeaderMenuClick = useCallback((href) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePage(href);
  }, [setActivePage]);

  // const handleTopicSettingsClick = useCallback((e) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   setSelected({ id: "header", type: "header", props: headerConfig });
  // }, [headerConfig, setSelected]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndWrapper}
    >
      <S.MainWrapper>
        <style>{`
        .edit-mobile-menu-btn { display: none; }

        @media (max-width: 1024px) {
          .edit-mobile-menu-btn { display: flex !important; }
        }
      `}</style>
        <ControlBar
          headerConfig={headerConfig}
          activePage={activePage}
          showPageMenu={showPageMenu}
          setShowPageMenu={setShowPageMenu}
          showAddPanel={showAddPanel}
          setShowAddPanel={setShowAddPanel}
          setSelected={setSelected}
          setIsPreview={setIsPreview}
          onSave={onSave}
          onBack={handleControlBarBack}
        />

        <S.CanvasWrapper>
          <PageSidebar
            showPageMenu={showPageMenu}
            headerConfig={headerConfig}
            activePage={activePage}
            setActivePage={setActivePage}
            setSelected={setSelected}
            deletePage={deletePage}
            addPage={addPage}
            setShowPageMenu={setShowPageMenu}
          />

          {/* Main Canvas */}
          <S.CanvasArea>
            {/* Page Container */}
            <S.PageSheet>


              {/* Main Canvas Body Wrap (Header + Content) */}
              <S.LayoutBody $isSidebar={isSidebar}>

                {/* Header Area - hidden here when position is 'middle' */}
                {!isMiddle && (
                <S.HeaderArea
                  onClick={onHandleHeaderClick}
                  $isSidebar={isSidebar}
                  $headerPos={headerPos}
                  $sidebarWidth={sidebarWidth}
                  $headerBgColor={headerConfig.backgroundColor}
                  $headerBgImage={headerConfig.backgroundImage}
                  $isSelected={selected?.id === "header"}
                  $isHidden={headerConfig?.hidden}
                  onMouseEnter={onHandleHeaderMouseEnter}
                  onMouseLeave={onHandleHeaderMouseLeave}
                >
                  <S.AreaLabel>HEADER</S.AreaLabel>

                  <S.HeaderInner $isSidebar={isSidebar} $menuSpacing={menuSpacing}>
                    {/* Logo Container */}
                    <S.LogoBox $isSidebar={isSidebar}>
                      {headerConfig.logoUrl ? (
                        <S.LogoImage
                          src={headerConfig.logoUrl}
                          $logoWidth={logoWidth}
                          $logoHeight={logoHeight}
                          alt="Logo"
                        />
                      ) : (
                        <S.LogoText>{headerConfig.logo}</S.LogoText>
                      )}
                    </S.LogoBox>


                    <S.NavItemsWrapper
                      onWheel={handleNavWheel}
                      $isSidebar={isSidebar}
                      $menuSpacing={menuSpacing}
                    >
                      {visibleHeaderMenu.slice(0, 8).map((m, i) => {
                        const currentPath = (activePage || "/").split("?")[0];
                        const menuPath = (m.href || "/").split("?")[0];
                        const isActive = currentPath === menuPath;
                        const isHome = m.label.toLowerCase() === "home" || m.label === "Tin tức";
                        return (
                          <S.MenuItemBox
                            key={i}
                            $fSize={menuFontSize}
                            $isActive={isActive}
                            $tabTextColor={tabTextColor}
                            $isSidebar={isSidebar}
                          >
                            {isHome ? (
                              <svg style={{ marginBottom: 10 }} width={homeIconSize} height={homeIconSize} viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3.75 17.4993H14.75C13.8333 17.4993 12 16.9493 12 14.7493V12.916H1V14.7493C1 16.9493 2.83333 17.4993 3.75 17.4993Z" fill={isActive ? "#0062AD" : tabIconColor} />
                                <path d="M2.83333 10.1667V2.83333C2.83333 2.3471 3.02649 1.88079 3.3703 1.53697C3.71412 1.19315 4.18044 1 4.66667 1H15.6667C16.1529 1 16.6192 1.19315 16.963 1.53697C17.3068 1.88079 17.5 2.3471 17.5 2.83333V14.75C17.5 15.6667 16.95 17.5 14.75 17.5M14.75 17.5H3.75C2.83333 17.5 1 16.95 1 14.75V12.9167H12V14.75C12 16.95 13.8333 17.5 14.75 17.5Z" stroke={isActive ? "#0062AD" : tabIconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              (m.icon || isSidebar) && (
                                <>
                                  {(() => {
                                    const IconKey = m.icon;

                                    // 1. Check if direct SVG code
                                    if (IconKey && IconKey.trim().startsWith('<svg')) {
                                      return (
                                        <S.SVGIconWrapper
                                          $isSidebar={isSidebar}
                                          $isActive={isActive}
                                          $tabIconColor={tabIconColor}
                                          dangerouslySetInnerHTML={{ __html: encodeHTML(IconKey) }}
                                        />
                                      );
                                    }

                                    // 2. Check if IconKey is a URL
                                    const isUrl = IconKey && (IconKey.startsWith('http') || IconKey.startsWith('/') || IconKey.includes('.'));
                                    if (isUrl) {
                                      return (
                                        <S.IconImage
                                          src={IconKey}
                                          $isSidebar={isSidebar}
                                          alt=""
                                        />
                                      );
                                    }

                                    // Bỏ qua validate computed reference bằng cách gán vào biến nội bộ
                                    const icons = LucideIcons;
                                    const IconComp = IconKey && icons[IconKey];
                                    if (IconComp) {
                                      return <IconComp size={isSidebar ? 24 : 20} stroke={isActive ? "#0062AD" : tabIconColor} />;
                                    }
                                    if (isSidebar) {
                                      return (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#0062AD" : tabIconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                      );
                                    }
                                    return null;
                                  })()}
                                </>
                              )
                            )}
                            {(m.label !== "Home" || isSidebar) ? (m.label === "Home" ? "Tin tức" : m.label) : "Tin tức"}
                            {isSidebar && isActive && (
                              <S.ActiveIndicator $headerPos={headerPos} />
                            )}
                          </S.MenuItemBox>
                        );
                      })}
                    </S.NavItemsWrapper>
                  </S.HeaderInner>
                </S.HeaderArea>
                )}

                {/* Page Content Container */}
                <S.ContentContainer $headerPos={headerPos}>

                  {/* PreHeader Area - Middle Header injected after PreHeader */}
                  {(() => {
                    const isUserHidePreHeader = headerConfig?.menu?.some(m =>
                      (m.href === activePage || (m.href !== "/" && activePage?.startsWith(m.href))) && m.hidePreHeader
                    );
                    const isSystemHidePreHeader = headerConfig?.systemPages?.some(s =>
                      (s.href === activePage || (s.href !== "/" && activePage?.startsWith(s.href))) && s.hidePreHeader
                    );

                    if (isUserHidePreHeader || isSystemHidePreHeader) return null;

                    return (
                      <S.SectionArea
                        onClick={onHandlePreHeaderClick}
                        $bBot
                        $isSelected={selected?.id === "preHeader"}
                        $isHidden={preHeaderConfig?.hidden}
                        $zIdx={20}
                        onMouseEnter={onHandlePreHeaderMouseEnter}
                        onMouseLeave={onHandlePreHeaderMouseLeave}
                      >
                        <S.AreaLabel>TOP BAR</S.AreaLabel>
                        {(() => {
                          const Comp = preHeaderConfig?.componentType && PREHEADER_MAP[preHeaderConfig.componentType]
                            ? PREHEADER_MAP[preHeaderConfig.componentType].component
                            : PREHEADER_MAP.default.component;
                          return <Comp {...preHeaderConfig} />;
                        })()}
                      </S.SectionArea>
                    );
                  })()}

                  {/* Header Area - Middle position: rendered between TopBar and TopicNav */}
                  {isMiddle && (
                    <S.HeaderArea
                      onClick={onHandleHeaderClick}
                      $isSidebar={false}
                      $headerPos={headerPos}
                      $sidebarWidth={sidebarWidth}
                      $headerBgColor={headerConfig.backgroundColor}
                      $headerBgImage={headerConfig.backgroundImage}
                      $isSelected={selected?.id === "header"}
                      $isHidden={headerConfig?.hidden}
                      onMouseEnter={onHandleHeaderMouseEnter}
                      onMouseLeave={onHandleHeaderMouseLeave}
                    >
                      <S.AreaLabel>HEADER</S.AreaLabel>
                      <S.HeaderInner $isSidebar={false} $menuSpacing={menuSpacing}>
                        <S.LogoBox $isSidebar={false}>
                          {headerConfig.logoUrl ? (
                            <S.LogoImage
                              src={headerConfig.logoUrl}
                              $logoWidth={logoWidth}
                              $logoHeight={logoHeight}
                              alt="Logo"
                            />
                          ) : (
                            <S.LogoText>{headerConfig.logo}</S.LogoText>
                          )}
                        </S.LogoBox>
                        <S.NavItemsWrapper
                          onWheel={handleNavWheel}
                          $isSidebar={false}
                          $menuSpacing={menuSpacing}
                        >
                          {visibleHeaderMenu.slice(0, 8).map((m, i) => {
                            const currentPath = (activePage || "/").split("?")[0];
                            const menuPath = (m.href || "/").split("?")[0];
                            const isActive = currentPath === menuPath;
                            const isHome = m.label.toLowerCase() === "home" || m.label === "Tin tức";
                            return (
                              <S.MenuItemBox
                                key={i}
                                $fSize={menuFontSize}
                                $isActive={isActive}
                                $tabTextColor={tabTextColor}
                                $isSidebar={false}
                              >
                                {isHome ? (
                                  <svg style={{ marginBottom: 10 }} width={homeIconSize} height={homeIconSize} viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3.75 17.4993H14.75C13.8333 17.4993 12 16.9493 12 14.7493V12.916H1V14.7493C1 16.9493 2.83333 17.4993 3.75 17.4993Z" fill={isActive ? "#0062AD" : tabIconColor} />
                                    <path d="M2.83333 10.1667V2.83333C2.83333 2.3471 3.02649 1.88079 3.3703 1.53697C3.71412 1.19315 4.18044 1 4.66667 1H15.6667C16.1529 1 16.6192 1.19315 16.963 1.53697C17.3068 1.88079 17.5 2.3471 17.5 2.83333V14.75C17.5 15.6667 16.95 17.5 14.75 17.5M14.75 17.5H3.75C2.83333 17.5 1 16.95 1 14.75V12.9167H12V14.75C12 16.95 13.8333 17.5 14.75 17.5Z" stroke={isActive ? "#0062AD" : tabIconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                ) : null}
                                {(m.label !== "Home" || false) ? (m.label === "Home" ? "Tin tức" : m.label) : "Tin tức"}
                              </S.MenuItemBox>
                            );
                          })}
                        </S.NavItemsWrapper>
                      </S.HeaderInner>
                    </S.HeaderArea>
                  )}

                  {/* Mobile Menu Sidebar & Overlay */}
                  {isMobileMenuOpen && (
                    <>
                      <S.MobileMenuOverlay onClick={handleCloseMobileMenu} />
                      <S.MobileMenuContainer>
                        <S.MobileMenuHeader>
                          <h3 style={{ margin: 0, color: "#185b8e" }}>Menu</h3>
                          <button onClick={handleCloseMobileMenu} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#666" }}>&times;</button>
                        </S.MobileMenuHeader>
                        <S.MobileMenuContent>
                          {visibleHeaderMenu.map((m, i) => {
                            const currentPath = (activePage || "/").split("?")[0];
                            const menuPath = (m.href || "/").split("?")[0];
                            const isActive = currentPath === menuPath;
                            return (
                              <S.MobileMenuItem
                                key={i}
                                onClick={handleMobileMenuNav(m.href)}
                                $isActive={isActive}
                              >
                                {m.label}
                              </S.MobileMenuItem>
                            )
                          })}
                        </S.MobileMenuContent>
                      </S.MobileMenuContainer>
                    </>
                  )}

                  {(topics.length > 0 || visibleHeaderMenu.length > 0) && !isPageHideTopicNav && (
                    <S.SectionArea
                      onClick={onHandleTopicNavClick}
                      $bBot
                      $mWid="1024px"
                      $zIdx={15}
                      $isSelected={selected?.id === "topicNav"}
                      $isHidden={topicNavConfig?.hidden}
                      onMouseEnter={onHandleTopicNavMouseEnter}
                      onMouseLeave={onHandleTopicNavMouseLeave}
                    >
                      <S.AreaLabel>TOPIC MENU</S.AreaLabel>
                      <S.TopicNavBar $surface={topicNavConfig?.backgroundColor}>
                        <S.TopicNavInner>
                          <S.TopicNavList>
                            {topicHeaderMenu.map((m) => {
                              const currentPath = (activePage || "/").split("?")[0];
                              const menuPath = (m.href || "/").split("?")[0];
                              const isActive = currentPath === menuPath;
                              const label = m.label === "Home" ? "Tin tức" : m.label;

                              return (
                                <S.TopicNavButton
                                  key={`header-menu-${m.href || label}`}
                                  type="button"
                                  onClick={handleTopicHeaderMenuClick(m.href)}
                                  $isActive={isActive}
                                  $surface={topicNavConfig?.backgroundColor}
                                  $hoverTone={topicNavConfig?.hoverBackgroundColor}
                                  $activeTone={topicNavConfig?.activeBackgroundColor}
                                  $ink={topicNavConfig?.textColor}
                                  $hoverInk={topicNavConfig?.hoverTextColor}
                                  $activeInk={topicNavConfig?.activeTextColor}
                                  title={label}
                                >
                                  {label}
                                </S.TopicNavButton>
                              );
                            })}
                            {topics.map((topic) => {
                              const topicName = topic.name || topic.title;
                              const isActive = String(activeTopicId || "") === String(topic.id);

                              return (
                                <S.TopicNavButton
                                  key={topic.id}
                                  type="button"
                                  onClick={handleTopicMenuClick(topic)}
                                  $isActive={isActive}
                                  $surface={topicNavConfig?.backgroundColor}
                                  $hoverTone={topicNavConfig?.hoverBackgroundColor}
                                  $activeTone={topicNavConfig?.activeBackgroundColor}
                                  $ink={topicNavConfig?.textColor}
                                  $hoverInk={topicNavConfig?.hoverTextColor}
                                  $activeInk={topicNavConfig?.activeTextColor}
                                  title={topicName}
                                >
                                  {topicName}
                                </S.TopicNavButton>
                              );
                            })}
                            {topicLibraryMenu.map((m) => {
                              const currentPath = (activePage || "/").split("?")[0];
                              const menuPath = (m.href || "/").split("?")[0];
                              const isActive = currentPath === menuPath;
                              const label = m.label === "Home" ? "Tin tức" : m.label;

                              return (
                                <S.TopicNavButton
                                  key={`header-menu-library-${m.href || label}`}
                                  type="button"
                                  onClick={handleTopicHeaderMenuClick(m.href)}
                                  $isActive={isActive}
                                  $surface={topicNavConfig?.backgroundColor}
                                  $hoverTone={topicNavConfig?.hoverBackgroundColor}
                                  $activeTone={topicNavConfig?.activeBackgroundColor}
                                  $ink={topicNavConfig?.textColor}
                                  $hoverInk={topicNavConfig?.hoverTextColor}
                                  $activeInk={topicNavConfig?.activeTextColor}
                                  title={label}
                                >
                                  {label}
                                </S.TopicNavButton>
                              );
                            })}
                            {/* <S.TopicNavButton
                              type="button"
                              onClick={handleTopicSettingsClick}
                              $isActive={selected?.id === "header"}
                              $surface={topicNavConfig?.backgroundColor}
                              $hoverTone={topicNavConfig?.hoverBackgroundColor}
                              $activeTone={topicNavConfig?.activeBackgroundColor}
                              $ink={topicNavConfig?.textColor}
                              $hoverInk={topicNavConfig?.hoverTextColor}
                              $activeInk={topicNavConfig?.activeTextColor}
                              title="THIẾT LẬP CÀI ĐẶT"
                            >
                              THIẾT LẬP CÀI ĐẶT
                            </S.TopicNavButton> */}
                          </S.TopicNavList>
                        </S.TopicNavInner>
                      </S.TopicNavBar>
                    </S.SectionArea>
                  )}

                  {/* Sub-Header Area - THÊM MỚI */}
                  <S.SectionArea
                    onClick={onHandleSubHeaderClick}
                    $bBot
                    $isSelected={selected?.id === "subHeader"}
                    $isHidden={subHeaderConfig?.hidden}
                    $mWid="1024px"
                    onMouseEnter={onHandleSubHeaderMouseEnter}
                    onMouseLeave={onHandleSubHeaderMouseLeave}
                  >
                    <S.AreaLabel>SUB-HEADER</S.AreaLabel>
                    {(() => {
                      const Comp = SUBHEADER_MAP.default.component;

                      const currentPath = activePage?.split('?')[0].replace(/\/$/, '') || "";

                      // Find active page config
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

                      // Override colors if specific page config exists
                      const mergedSubHeaderConfig = {
                        ...subHeaderConfig,
                        backgroundColor: activeConfig.subHeaderBg || subHeaderConfig.backgroundColor,
                        textColor: activeConfig.subHeaderText || subHeaderConfig.textColor,
                        accentColor: activeConfig.subHeaderAccent || subHeaderConfig.accentColor,
                        searchBgColor: activeConfig.subHeaderSearchBg || subHeaderConfig.searchBgColor
                      };

                      return <Comp {...mergedSubHeaderConfig} hideSearch={isUserHideSearch} />;
                    })()}
                  </S.SectionArea>

                  {/* Body Area */}
                  <S.BodyArea $bg={headerConfig?.layoutBackgroundColor}>
                    <S.AreaLabel>BODY</S.AreaLabel>
                    <SortableContext items={layout.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <S.BlocksGrid>
                        {layout.length === 0 && <S.EmptyState>Kéo thả component vào đây</S.EmptyState>}
                        {layout.map(b => (
                          <SortableBlock
                            key={b.id}
                            block={b}
                            activePage={activePage}
                            onSelect={setSelected}
                            isEditing={true}
                            onDelete={deleteBlock}
                            onResize={handleResizeBlock}
                          />
                        ))}
                      </S.BlocksGrid>
                    </SortableContext>
                  </S.BodyArea>

                  {/* Footer Area */}
                  <S.SectionArea
                    onClick={onHandleFooterClick}
                    $bTop
                    $isSelected={selected?.id === "footer"}
                    $isHidden={footerConfig?.hidden}
                    onMouseEnter={onHandleFooterMouseEnter}
                    onMouseLeave={onHandleFooterMouseLeave}
                  >
                    <S.AreaLabel $isBot>FOOTER</S.AreaLabel>
                    {(() => {
                      const Comp = footerConfig?.componentType && FOOTER_MAP[footerConfig.componentType]
                        ? FOOTER_MAP[footerConfig.componentType].component
                        : FOOTER_MAP.default.component;
                      return <Comp {...footerConfig} />;
                    })()}
                  </S.SectionArea>
                </S.ContentContainer>
              </S.LayoutBody>
            </S.PageSheet>

            {/* Right Sidebar: Chuyển sang absolute để đồng bộ với thanh bên trái */}
            <S.RightSidebar
              $isOpen={showAddPanel || selected}
            >
              <S.SidebarContent>
                {showAddPanel && !selected && (
                  <AddPanel
                    onAddBlock={handleAddBlockToLayout}
                    onClose={handleCloseAddPanel}
                  />
                )}

                {selected && (
                  <ConfigPanel
                    selected={selected}
                    onUpdate={updateBlock}
                    onClose={handleCloseSelected}
                    headerConfig={headerConfig}
                    setHeaderConfig={setHeaderConfig}
                    preHeaderConfig={preHeaderConfig}
                    setPreHeaderConfig={setPreHeaderConfig}
                    footerConfig={footerConfig}
                    setFooterConfig={setFooterConfig}
                    pages={pages}
                    setPages={setPages}
                    activePage={activePage}
                    setActivePage={setActivePage}
                    updatePageMetadata={updatePageMetadata}
                    subHeaderConfig={subHeaderConfig}
                    setSubHeaderConfig={setSubHeaderConfig}
                    topicNavConfig={topicNavConfig}
                    setTopicNavConfig={setTopicNavConfig}
                    addMenuItem={addMenuItem}
                    updateMenuItem={updateMenuItem}
                    deleteMenuItem={deleteMenuItem}
                  />
                )}
              </S.SidebarContent>
            </S.RightSidebar>
          </S.CanvasArea>
        </S.CanvasWrapper>

        {/* Hiệu ứng khi đang kéo */}
        <DragOverlay>
          {activeDragItem ? (
            activeDragItem.id.toString().startsWith("new-") ? (
              <S.DragOverlayItem>
                <S.PlusText>+</S.PlusText>
                <S.DragLabel>{BLOCKS[activeDragItem.data.current.type].label}</S.DragLabel>
              </S.DragOverlayItem>
            ) : (
              (() => {
                const block = layout.find(b => b.id === activeDragItem.id);
                if (!block) return null;
                const Comp = BLOCKS[block.type].component;
                return (
                  <S.DragOverlayBlock>
                    <S.DragHeader>
                      <S.DragHandleIcon>⠿</S.DragHandleIcon> {BLOCKS[block.type].label}
                    </S.DragHeader>
                    <S.DragPreviewBody>
                      <S.DragScaleWrapper>
                        <Comp id={block.id} {...block.props} />
                      </S.DragScaleWrapper>
                    </S.DragPreviewBody>
                  </S.DragOverlayBlock>
                );
              })()
            )
          ) : null}
        </DragOverlay>
      </S.MainWrapper>
    </DndContext>
  );
}
