import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { List, Collapse, useTheme, useMediaQuery, Tooltip } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  StyledDrawer,
  StyledListItemButton,
  StyledListItemIcon,
  StyledListItemText,
  DrawerContentBox,
  SubMenuList,
  StyledContainerSvg,
  StyledSvg,
  CountBadge,
  BoxST,
  ModuleRail,
  ModuleRailWrapper,
  ModuleRailList,
  ModuleRailContent,
  ModuleRailIconBox,
  ModuleRailItem,
  ModuleNamesPanel,
  ModuleNamesList,
  ModuleNameItem,
  MenuPanel,
  HoverSubMenuPanel,
} from "@styles/Sidebar.styles";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { setCurrentPageTitle, setSidebarOpen, setCurrentPageBreadcrumb, setSelectedModule  } from "@redux/slices/layoutSlice";
import { closeGlobalDialog } from "@components/GlobalDialogPortal";
import useDynamicMenuRoutes from "@hooks/useDynamicMenuRoutes";
import { setCodeGlobal } from "@redux/slices/FormDesign/formDesignSlice";
import DOMPurify from "dompurify";

const hasSlug = (path) => path && path.includes(":");

const decodeHtml = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

// Hàm tiện ích tìm đường dẫn con khả dụng đầu tiên
const findFirstNavigablePath = (item) => {
  if (item.path) return item.path;
  if (item.subItems?.length) {
    for (const sub of item.subItems) {
      const p = findFirstNavigablePath(sub);
      if (p) return p;
    }
  }
  return null;
};

const SvgIconFromApi = ({ rawSvg, size = 24 }) => {
  if (!rawSvg || typeof rawSvg !== "string") return null;

  let svg = decodeHtml(rawSvg);
  svg = svg.replace(/^"|"$/g, "").trim();
  svg = svg
    .replace(/fill="[^"]*"/g, 'fill="currentColor"')
    .replace(/fill:\s*[^;"]+;?/g, "fill: currentColor;")
    .replace(/<svg([^>]*)>/, `<svg$1 fill="currentColor">`)
    .replace(/width="\w*"/g, `width="${size}"`)
    .replace(/height="\w*"/g, `height="${size}"`);

  return (
    <StyledSvg
      styledWidth={size}
      styledHeight={size}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg) }}
    />
  );
};

// Component con cho các Item trong Module Rail
const ModuleRailItemAction = React.memo(({ item, onSelect, isActive }) => {
  const handleClick = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  return (
    <ModuleRailItem onClick={handleClick} $isActive={isActive}>
      <ModuleRailIconBox $isActive={isActive}>
        {item.settingIcon ? (
          <SvgIconFromApi rawSvg={item.settingIcon} size={20} />
        ) : (
          item.icon
        )}
      </ModuleRailIconBox>
    </ModuleRailItem>
  );
});
ModuleRailItemAction.displayName = "ModuleRailItemAction";

// Component con cho Tên Phân Hệ
const ModuleNameItemAction = React.memo(({ item, onSelect, isActive }) => {
  const handleClick = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  return (
    <ModuleNameItem $isActive={isActive} onClick={handleClick}>
      {item.title}
    </ModuleNameItem>
  );
});
ModuleNameItemAction.displayName = "ModuleNameItemAction";

// Component Độc lập cho Menu Hover (Menu cấp 1 & cấp 2 bên Panel con)
const HoverMenuItem = React.memo(({
  item,
  itemKey,
  level,
  titleParent,
  isActive,
  sideBarMenuCountLoading,
  hoveredCategoryKey,
  onClick,
  onMouseEnter,
  onSubMenuMouseEnter,
  filterSubItems,
}) => {
  const handleClick = useCallback(() => {
    onClick(item, itemKey);
  }, [item, itemKey, onClick]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(itemKey);
  }, [itemKey, onMouseEnter]);

  const isParentActive = isActive(item);
  const isExpanded = isParentActive || (hoveredCategoryKey && hoveredCategoryKey.startsWith(itemKey));

  const visibleSubItems = useMemo(() => {
    if (!item.subItems) return [];
    return item.subItems.filter((sub) => {
      if (sub.hidden || hasSlug(sub.path)) return false;
      if (sub.subItems && !sub.path) return filterSubItems(sub.subItems);
      return true;
    });
  }, [item.subItems, filterSubItems]);

  // Xác định đường dẫn đích: nếu là menu cha, lấy đường dẫn của con đầu tiên khả dụng
  const targetPath = useMemo(() => {
    return item.path || findFirstNavigablePath(item);
  }, [item]);

  return (
    <React.Fragment>
      <Tooltip title="" placement="right">
        <StyledListItemButton
          component={targetPath ? Link : "div"}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          to={targetPath || undefined}
          $level={level}
          $isActive={isParentActive || titleParent === item.title}
          itemPath={item.path}
        >
          <StyledListItemIcon>
            {item.settingIcon ? (
              <StyledContainerSvg styledColor={"#d32a2aff"}>
                <SvgIconFromApi rawSvg={item.settingIcon} size={24} />
              </StyledContainerSvg>
            ) : (
              item.icon
            )}
          </StyledListItemIcon>

          <StyledListItemText
            primary={
              <>
                {item.title}
                {!sideBarMenuCountLoading && item.count > 0 && (
                  <CountBadge badgeContent={item.count} />
                )}
              </>
            }
          />
        </StyledListItemButton>
      </Tooltip>

      {visibleSubItems.length > 1 && (
        <Collapse in={!!isExpanded} timeout="auto" unmountOnExit>
          <SubMenuList data-category-key={itemKey} onMouseEnter={onSubMenuMouseEnter}>
            {visibleSubItems.map((subItem, index) => {
              const subKey = `${itemKey}-${index}`;
              return (
                <HoverMenuItem
                  key={subKey}
                  item={subItem}
                  itemKey={subKey}
                  level={level + 1}
                  titleParent={titleParent}
                  isActive={isActive}
                  sideBarMenuCountLoading={sideBarMenuCountLoading}
                  hoveredCategoryKey={hoveredCategoryKey}
                  onClick={onClick}
                  onMouseEnter={onMouseEnter}
                  onSubMenuMouseEnter={onSubMenuMouseEnter}
                  filterSubItems={filterSubItems}
                />
              );
            })}
          </SubMenuList>
        </Collapse>
      )}
    </React.Fragment>
  );
});
HoverMenuItem.displayName = "HoverMenuItem";

// Component Độc lập cho Menu chính (MenuPanel)
const MainMenuItem = React.memo(({
  item,
  itemKey,
  level,
  titleParent,
  isActive,
  effectiveIsOpen,
  sideBarMenuCountLoading,
  openMenu,
  onClick,
}) => {
  const handleClick = useCallback(() => {
    onClick(item, itemKey, level);
  }, [item, itemKey, level, onClick]);

  const isParentActive = isActive(item);

  return (
    <React.Fragment>
      <Tooltip title={!effectiveIsOpen ? item.title : ""} placement="right">
        <StyledListItemButton
          component={
            item.path && (!item.subItems || item.subItems.length === 0)
              ? Link
              : "div"
          }
          onClick={handleClick}
          to={item.path}
          $level={level}
          $isActive={isParentActive || titleParent === item.title}
          itemPath={item.path}
        >
          <StyledListItemIcon>
            {item.settingIcon ? (
              <StyledContainerSvg styledColor={"#d32a2aff"}>
                <SvgIconFromApi rawSvg={item.settingIcon} size={24} />
              </StyledContainerSvg>
            ) : (
              item.icon
            )}
          </StyledListItemIcon>

          {effectiveIsOpen && (
            <StyledListItemText
              primary={
                <>
                  {item.title}
                  {!sideBarMenuCountLoading && item.count > 0 && (
                    <CountBadge badgeContent={item.count} />
                  )}
                </>
              }
            />
          )}
        </StyledListItemButton>
      </Tooltip>

      {item.subItems && item.subItems.length > 0 && effectiveIsOpen && (
        <Collapse in={openMenu[itemKey]} timeout="auto" unmountOnExit>
          <SubMenuList>
            {item.subItems.map((subItem, index) => {
              const subKey = `${itemKey}-${index}`;
              return (
                <MainMenuItem
                  key={subKey}
                  item={subItem}
                  itemKey={subKey}
                  level={level + 1}
                  titleParent={titleParent}
                  isActive={isActive}
                  effectiveIsOpen={effectiveIsOpen}
                  sideBarMenuCountLoading={sideBarMenuCountLoading}
                  openMenu={openMenu}
                  onClick={onClick}
                />
              );
            })}
          </SubMenuList>
        </Collapse>
      )}
    </React.Fragment>
  );
});
MainMenuItem.displayName = "MainMenuItem";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [openMenu, setOpenMenu] = useState({});
  const [titleParent, setTitleParent] = useState("");
  const [isModuleNamesOpen, setIsModuleNamesOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isTemporarilyDisabled, setIsTemporarilyDisabled] = useState(false);
  const [hoveredModule, setHoveredModule] = useState(null);
  const [hoveredCategoryKey, setHoveredCategoryKey] = useState(null);
  const [isMenuPinned, setIsMenuPinned] = useState(false);

  const sidebarRef = useRef(null);
  const railScrollRef = useRef(null);
  const panelScrollRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(426));

  const handleMouseEnter = useCallback(() => {
    if (!isTemporarilyDisabled) {
      setIsModuleNamesOpen(true);
      setIsSidebarHovered(true);
    }
  }, [isTemporarilyDisabled]);

  const handleMouseLeave = useCallback(() => {
    if (isMenuPinned) return;
    setIsModuleNamesOpen(false);
    setHoveredModule(null);
    setHoveredCategoryKey(null);
  }, [isMenuPinned]);

  const handleRailMouseEnter = useCallback(() => {
    if (isMenuPinned) return;
    setHoveredModule(null);
    setHoveredCategoryKey(null);
  }, [isMenuPinned]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (isMenuPinned) return;
    setIsSidebarHovered(false);
    setIsModuleNamesOpen(false);
    setIsTemporarilyDisabled(false);
    setHoveredModule(null);
    setHoveredCategoryKey(null);
  }, [isMenuPinned]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsMenuPinned(false);
        setIsSidebarHovered(false);
        setIsModuleNamesOpen(false);
        setHoveredModule(null);
        setHoveredCategoryKey(null);
      }
    };

    if (isMenuPinned) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuPinned]);

  const handleRailScroll = useCallback((e) => {
    if (panelScrollRef.current) {
      panelScrollRef.current.scrollTop = e.target.scrollTop;
    }
  }, []);

  const dispatch = useDispatch();
  const toast = useToast();
  const { userPermissions, isSuperAdmin } = useSelector((state) => state.users);
  const { selectedModuleCode } = useSelector((state) => state.layout);
  const { sideBarMenuCountLoading } = useSelector((state) => state.menu);
  const allDynamicMenuRoutes = useDynamicMenuRoutes();

  const filterSubItems = useCallback((subItems) => {
    return subItems.some((item) => {
      if (item.hidden || hasSlug(item.path)) return false;
      if (item.subItems && item.subItems.length > 0) {
        return filterSubItems(item.subItems);
      }
      return true;
    });
  }, []);

  const moduleRoutes = useMemo(() => {
    return allDynamicMenuRoutes.filter((route) => {
      if (hasSlug(route.path) || route.hidden) return false;
      if (route.subItems && !route.path) return filterSubItems(route.subItems);
      return true;
    });
  }, [allDynamicMenuRoutes, filterSubItems]);

  const selectedModule = useMemo(() => {
    return (
      moduleRoutes.find(
        (route) =>
          route.codeRouter === selectedModuleCode ||
          route.title === selectedModuleCode
      ) ||
      moduleRoutes[0] ||
      null
    );
  }, [moduleRoutes, selectedModuleCode]);

  const dynamicMenuRoutes = useMemo(() => {
    return selectedModule?.subItems || [];
  }, [selectedModule]);

  const filteredRoutes = useMemo(() => {
    return dynamicMenuRoutes.filter((route) => {
      if (hasSlug(route.path) || route.hidden) return false;
      if (route.subItems && !route.path) return filterSubItems(route.subItems);
      return true;
    });
  }, [dynamicMenuRoutes, filterSubItems]);

  const isActive = useCallback(
    (route) => {
      if (route.path && route.path === location.pathname) return true;
      if (route.subItems) {
        return route.subItems.some(
          (subItem) => subItem.path === location.pathname || isActive(subItem)
        );
      }
      return false;
    },
    [location.pathname]
  );

  useEffect(() => {
    if (isSuperAdmin) return;

    if (userPermissions) {
      const hasStaticPermissions =
        (userPermissions.staticPermissions || []).length > 0;
      const hasRoles = (userPermissions.roles || []).length > 0;
      const hasReportPermission =
        (userPermissions.reportPermission || []).length > 0;

      if (!hasStaticPermissions && !hasRoles && !hasReportPermission) {
        toast("Bạn không có quyền truy cập vào hệ thống.", "error");
      }
    }
  }, [userPermissions, isSuperAdmin, toast]);

  useEffect(() => {
    if (!selectedModuleCode && moduleRoutes.length > 0) {
      dispatch(
        setSelectedModule(moduleRoutes[0].codeRouter || moduleRoutes[0].title)
      );
    }
  }, [dispatch, moduleRoutes, selectedModuleCode]);

  useEffect(() => {
    setOpenMenu({});
    setTitleParent("");
  }, [selectedModuleCode]);

  useEffect(() => {
    const newOpenMenu = {};

    const findAndOpenParent = (items, parentKey = "") => {
      items.forEach((item, index) => {
        const key = parentKey ? `${parentKey}-${index}` : `${index}`;
        if (item.subItems && item.subItems.length > 0) {
          const checkActive = (route) => {
            if (route.path && route.path === location.pathname) return true;
            if (route.subItems) {
              return route.subItems.some(
                (subItem) =>
                  subItem.path === location.pathname || checkActive(subItem)
              );
            }
            return false;
          };

          if (checkActive(item)) {
            newOpenMenu[key] = true;
            findAndOpenParent(item.subItems, key);
          }
        }
      });
    };

    findAndOpenParent(filteredRoutes);
    setOpenMenu(newOpenMenu);
  }, [location.pathname, filteredRoutes]);

  const buildBreadcrumb = useCallback((routes, targetPath, ancestors = []) => {
    for (const item of routes) {
      const crumb = { 
        title: item.title, 
        path: item.path || findFirstNavigablePath(item) 
      };
      
      if (item.path === targetPath) {
        return [...ancestors, crumb];
      }

      if (item.subItems?.length) {
        const found = buildBreadcrumb(item.subItems, targetPath, [...ancestors, crumb]);
        if (found) return found;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const findParent = (routes) => {
      for (const item of routes) {
        if (item.path === location.pathname) return item;
        if (item.subItems) {
          const found = findParent(item.subItems);
          if (found) return item;
        }
      }
      return null;
    };

    const parentRoute = findParent(filteredRoutes);
    setTitleParent(parentRoute?.title || "");
  }, [location.pathname, filteredRoutes]);

  useEffect(() => {
    const findItemByPath = (routes, path, currentLevel = 0) => {
      for (const item of routes) {
        if (item.path === path) return { item, level: currentLevel };
        if (item.subItems) {
          const found = findItemByPath(item.subItems, path, currentLevel + 1);
          if (found) return found;
        }
      }
      return null;
    };

    const foundData = findItemByPath(filteredRoutes, location.pathname);
    if (foundData) {
      const { item, level } = foundData;
      dispatch(setCurrentPageTitle(item.title));

      const moduleCrumb = selectedModule ? { 
        title: selectedModule.title, 
        path: findFirstNavigablePath(selectedModule) 
      } : null;

      const chain = buildBreadcrumb(filteredRoutes, location.pathname, moduleCrumb ? [moduleCrumb] : []);
      if (chain) {
        dispatch(setCurrentPageBreadcrumb(chain));
      }
      
      if (item.collapsed) {
        dispatch(setSidebarOpen(false));
      } else if (
        level === 0 &&
        filteredRoutes.length === 1 &&
        (!item.subItems || item.subItems.length === 0)
      ) {
        dispatch(setSidebarOpen(false));
      } else if (!isMobile) {
        dispatch(setSidebarOpen(false));
      }
    }
  }, [location.pathname, filteredRoutes, dispatch, isMobile, buildBreadcrumb, selectedModule]);

  const toggleSubMenu = useCallback((key) => {
    setOpenMenu((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const actionClickItem = useCallback(
    (item, key, level) => {
      if (item.subItems && item.subItems.length > 0) {
        toggleSubMenu(key);
      } else {
        dispatch(setCurrentPageTitle(item.title));
        dispatch(setCodeGlobal(0));
        closeGlobalDialog();
        if (level === 0 && filteredRoutes.length === 1) {
          dispatch(setSidebarOpen(false));
        }
      }

      if (item.subItems && item.subItems.length > 0) {
        if (item.collapsed) {
          dispatch(setSidebarOpen(false));
        } else {
          dispatch(setSidebarOpen(isMobile));
        }
      }

      if (isMobile && (!item.subItems || item.subItems.length === 0)) {
        dispatch(setSidebarOpen(false));
      }
    },
    [isMobile, dispatch, toggleSubMenu, filteredRoutes]
  );

  const handleModuleSelect = useCallback(
    (moduleItem) => {
      const visibleSubItems = moduleItem.subItems ? moduleItem.subItems.filter(sub => {
        if (sub.hidden || hasSlug(sub.path)) return false;
        if (sub.subItems && !sub.path) return filterSubItems(sub.subItems);
        return true;
      }) : [];

      if (visibleSubItems.length === 1) {
        const targetPath = findFirstNavigablePath(visibleSubItems[0]);
        if (targetPath) {
          const moduleCode = moduleItem.codeRouter || moduleItem.title;
          dispatch(setSelectedModule(moduleCode));
          
          setIsMenuPinned(false);
          setIsModuleNamesOpen(false);
          setHoveredModule(null);
          setIsSidebarHovered(false);
          if (isMobile) dispatch(setSidebarOpen(false));
          closeGlobalDialog();
          navigate(targetPath);
          return;
        }
      }

      const moduleCode = moduleItem.codeRouter || moduleItem.title;
      dispatch(setSelectedModule(moduleCode));
      
      setIsMenuPinned(true);
      setIsModuleNamesOpen(true);
      setHoveredModule(moduleItem);

      if (moduleItem.collapsed) {
        dispatch(setSidebarOpen(false));
      } else if (!isMobile) {
        dispatch(setSidebarOpen(false));
      }
    },
    [dispatch, isMobile, filterSubItems, navigate]
  );

  const handleHoverClickItem = useCallback(
    (item, key) => {
      if (hoveredModule) {
        dispatch(setSelectedModule(hoveredModule.codeRouter || hoveredModule.title));
      }

      if (item.subItems && item.subItems.length > 0) {
        const targetPath = findFirstNavigablePath(item);
        if (targetPath) {
          // Đã tìm thấy đường dẫn con đầu tiên và điều hướng -> tiến hành đóng bảng hover
          dispatch(setCodeGlobal(0));

          setIsMenuPinned(false);
          setIsModuleNamesOpen(false);
          setHoveredModule(null);
          setIsSidebarHovered(false);
          setHoveredCategoryKey(null);
          closeGlobalDialog();
        } else {
          // Trường hợp dự phòng nếu không tìm thấy đường dẫn
          toggleSubMenu(key);
          setIsMenuPinned(true);
        }
      } else {
        dispatch(setCurrentPageTitle(item.title));
        dispatch(setCodeGlobal(0));

        setIsMenuPinned(false);
        setIsModuleNamesOpen(false);
        setHoveredModule(null);
        setIsSidebarHovered(false);
        setHoveredCategoryKey(null);
        closeGlobalDialog();
      }
    },
    [hoveredModule, dispatch, toggleSubMenu]
  );

  const handleCategoryMouseEnter = useCallback((key) => {
    setHoveredCategoryKey(key);
  }, []);

  const handleSubMenuMouseEnter = useCallback((e) => {
    e.stopPropagation();
    const categoryKey = e.currentTarget.getAttribute("data-category-key");
    if (categoryKey) {
      setHoveredCategoryKey(categoryKey);
    }
  }, []);

  const isHoverSubMenuOpen = useMemo(() => {
    if (!isModuleNamesOpen || !hoveredModule || !hoveredModule.subItems) return false;
    const visibleSubItems = hoveredModule.subItems.filter((item) => {
      if (item.hidden || hasSlug(item.path)) return false;
      if (item.subItems && !item.path) return filterSubItems(item.subItems);
      return true;
    });
    return visibleSubItems.length > 1;
  }, [isModuleNamesOpen, hoveredModule, filterSubItems]);

  const effectiveIsOpen = (isMobile ? isOpen : false) || isSidebarHovered;

  return (
    <StyledDrawer
      ref={sidebarRef}
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? isOpen : false}
      onClose={isMobile ? toggleSidebar : undefined}
      ModalProps={{ keepMounted: true }}
      $isOpen={isMobile ? isOpen : false}
      $isHoverOpen={isSidebarHovered}
      $isHoverSubMenuOpen={isHoverSubMenuOpen}
    >
      <DrawerContentBox 
        $isOpen={isMobile ? isOpen : false} 
        $isHoverOpen={isSidebarHovered}
        $isHoverSubMenuOpen={isHoverSubMenuOpen}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <ModuleRailWrapper onMouseLeave={handleMouseLeave}>
          <ModuleRail onMouseEnter={handleRailMouseEnter}>
            <ModuleRailContent ref={railScrollRef} onScroll={handleRailScroll}>
              <ModuleRailList onMouseEnter={handleMouseEnter}>
                {moduleRoutes.map((item, index) => {
                  const moduleCode = item.codeRouter || item.title;
                  const isModuleActive =
                    (selectedModule?.codeRouter || selectedModule?.title) === moduleCode;

                  return (
                    <ModuleRailItemAction
                      key={moduleCode || index}
                      item={item}
                      onSelect={handleModuleSelect}
                      isActive={isModuleActive}
                    />
                  );
                })}
              </ModuleRailList>
            </ModuleRailContent>
          </ModuleRail>

          <ModuleNamesPanel $isOpen={isModuleNamesOpen} ref={panelScrollRef}>
            <ModuleNamesList>
              {moduleRoutes.map((item, index) => {
                const moduleCode = item.codeRouter || item.title;
                const isModuleActive =
                  (selectedModule?.codeRouter || selectedModule?.title) === moduleCode;
                const isModuleHovered = hoveredModule && (hoveredModule.codeRouter || hoveredModule.title) === moduleCode;

                return (
                  <ModuleNameItemAction
                    key={moduleCode || index}
                    item={item}
                    isActive={isModuleActive || isModuleHovered}
                    onSelect={handleModuleSelect}
                  />
                );
              })}
            </ModuleNamesList>
          </ModuleNamesPanel>

          <HoverSubMenuPanel $isOpen={isHoverSubMenuOpen}>
            <BoxST>
              <List>
                {hoveredModule && hoveredModule.subItems.map((item, index) => {
                  const key = `hover-${index}`;
                  return (
                    <HoverMenuItem
                      key={key}
                      item={item}
                      itemKey={key}
                      level={0}
                      titleParent={titleParent}
                      isActive={isActive}
                      sideBarMenuCountLoading={sideBarMenuCountLoading}
                      hoveredCategoryKey={hoveredCategoryKey}
                      onClick={handleHoverClickItem}
                      onMouseEnter={handleCategoryMouseEnter}
                      onSubMenuMouseEnter={handleSubMenuMouseEnter}
                      filterSubItems={filterSubItems}
                    />
                  );
                })}
              </List>
            </BoxST>
          </HoverSubMenuPanel>
        </ModuleRailWrapper>

        <MenuPanel $isOpen={isMobile ? isOpen : false} $isHoverOpen={isMobile ? isSidebarHovered : false}>
          <BoxST>
            <List>
              {filteredRoutes.map((item, index) => {
                const key = `${index}`;
                return (
                  <MainMenuItem
                    key={key}
                    item={item}
                    itemKey={key}
                    level={0}
                    titleParent={titleParent}
                    isActive={isActive}
                    effectiveIsOpen={effectiveIsOpen}
                    sideBarMenuCountLoading={sideBarMenuCountLoading}
                    openMenu={openMenu}
                    onClick={actionClickItem}
                  />
                );
              })}
            </List>
          </BoxST>
        </MenuPanel>
      </DrawerContentBox>
    </StyledDrawer>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
};

export default Sidebar;