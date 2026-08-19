
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRegistry } from '@builder-table/context/RegistryContext';
import { PageTitleContext } from '@builder-table/context/PageTitleContext';
import { Tooltip, useMediaQuery, useTheme, Popover, Checkbox, Button, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import ElementWrapper from '@builder-table/components/ElementWrapper';
import PropTypes from 'prop-types';
import { useDragAndDrop } from '@builder-table/hooks/useDragAndDrop';
import { useToast } from '@components/common/ToastProvider';
import { setGlobalTableState } from '@utils/GlobalTableState';
import { BoxML, StyledButton } from "@styles/CustomTable.styles";
import FormButton from "@components/FormButton";
// import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenOutlinedIcon from '@mui/icons-material/FullscreenOutlined';
import FullscreenExitOutlinedIcon from '@mui/icons-material/FullscreenExitOutlined';

import { ColumnActionsV4, DraggableItemBox, DropZoneBox, EmptyColumnBox, FlexBox, IconBox, PaginationWrapper, SearchChildrenBox, SubtabChildrenBox, TabLayoutStyle, TableDropZoneBox, TableContentCard, SubtabRowWrapper } from './TableLayout.styles';
import {
  StyleBoxCH,
  StyleBoxDropDown,
  StyleTyprographyDropDown,
  StyleIconDropDown,
  StyleBoxDrop,
  StyleFomControl,
  StyleBoxDrown,
  StyleBoxButton,
  StyleButtonH,
  StyleButtonAD,
} from "@styles/customTableBorder.style";
import axiosInstance from '@utils/axiosInstance';
import { API_CONFIG_TABLE, FUNCTIONMANAGEMANT } from '@EnvironmentFile/constants/urlConfig';
import { StyleBoxTittle, StyleTittleBox, StyleBreadcrumb, StyleBreadcrumbItem, BreadcrumbSeparator } from '@builder-table/components/SearchSection.styles';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
// import { addHiddenDialogKey } from '@redux/slices/CustomTable/TableConfigSlice';

const allowMore = ['action', 'columnConfig']
const inheritedSubtabFetchCache = new Map();

const DeleteMultiButton = styled(StyledButton)(({ theme }) => ({
  height: 40,
  width: 40,
  minWidth: 40,
  marginLeft: theme.spacing(1.5),
  backgroundColor: '#fff',
  border: `1.5px solid ${theme.palette.error.light}`,
  borderRadius: '12px',
  '&:hover': {
    backgroundColor: theme.palette.error.light + '22',
    borderColor: theme.palette.error.main,
  },
}));

const ColumnConfigButton = styled(Button)(({ theme }) => ({
  height: 40,
  width: 40,
  minWidth: '40px !important',
  padding: 0,
  marginLeft: theme.spacing(1.5),
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
  borderRadius: "12px",
  color: theme.palette.mode === 'light' ? '#64748b' : '#fff',
  boxShadow: "none",
  '&:hover': {
    backgroundColor: theme.palette.mode === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.1)',
    borderColor: theme.palette.mode === 'light' ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)',
    boxShadow: "none",
  },
  "& .MuiSvgIcon-root": {
    fontSize: "22px",
  },
}));

export default function TableLayout({
  item,
  onDropChild,
  onPropChange,
  mode = 'builder',
  data,
  // handleSetColumnConfig,
  fields,
  // onToggleColumn,
  onTabChange,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [dataDetail, setDataDetail] = useState(null);
  const [columnConfigAnchorEl, setColumnConfigAnchorEl] = useState(null);
  const [reloadData, setReloadData] = useState(0);
  const toast = useToast();
  const theme = useTheme();
  const isCustomFeature = data?.featureType === 'custom';
  const [popoverColumns, setPopoverColumns] = useState([]);
  // Sử dụng breakpoint 768px như yêu cầu
  const isSmallScreen = useMediaQuery(theme.breakpoints.down(768));
  const isTabletScreen = useMediaQuery(theme.breakpoints.down(1024));
  const [showPagination, setShowPagination] = useState(true);
  const [showSearchTime, setShowSearchTime] = useState(false);
  const [isTableDisplay, setIsTableDisplay] = useState(false);
  const [isDialogKey, setIsDialogKey] = useState(false);
  const [hideSettingAndExport, setHideSettingAndExport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideTitle, setHideTitle] = useState(false);
  const hiddenDialogKeys = useSelector((state) => state.tableConfig.hiddenDialogKeys);
  const location = useLocation();

  // State mới để quản lý fields ngay trong TableLayout
  const [layoutFields, setLayoutFields] = useState(fields || []);
  // Lưu loại hiển thị hiện tại: list / tree / kanban / calander / grantt
  const [currentDisplayType, setCurrentDisplayType] = useState('list');

  // Callback để DemoTablePage cập nhật fields lên
  const handleSetColumnConfig = useCallback((newFields) => {
    if (JSON.stringify(newFields) !== JSON.stringify(layoutFields)) {
      setLayoutFields(newFields);
    }
  }, [layoutFields]);
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle);
  const currentPageBreadcrumb = useSelector((state) => state.layout.currentPageBreadcrumb);
  const displayedBreadcrumb = currentPageBreadcrumb?.length > 1 ? currentPageBreadcrumb.slice(1) : currentPageBreadcrumb;

  // Ẩn nút "Cấu hình cột" khi đang ở các chế độ Kanban / Lịch / Grantt
  const hideColumnConfigButtonForDisplayType = ['kanban', 'calander', 'grantt'].includes(
    String(currentDisplayType || '').toLowerCase()
  );
  const isLeadershipDutySchedulesRoute = useMemo(
    () => location.pathname.startsWith('/leadershipDutySchedules'),
    [location.pathname]
  );
  const uiVariant = useMemo(() => {
    if (!isLeadershipDutySchedulesRoute) return undefined;
    return String(currentDisplayType || '').toLowerCase() === 'list'
      ? 'leadershipDutySchedule'
      : undefined;
  }, [isLeadershipDutySchedulesRoute, currentDisplayType]);




  useEffect(() => {
    if (reloadData !== null) {
      setSelectedIds([]);
    }
  }, [reloadData]);

  useEffect(() => {
    if (!isFullscreen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (!hideSettingAndExport && isFullscreen) {
      setIsFullscreen(false);
    }
  }, [hideSettingAndExport, isFullscreen]);

  useEffect(() => {
    const findIsHideTitle = (el) => {
      if (el?.props?.isHideTitle) return true;
      if (el?.props?.children && Array.isArray(el.props.children)) {
        return el.props.children.some(child => findIsHideTitle(child));
      }
      return false;
    };

    const isHideTitleValue = data?.isHideTitle || findIsHideTitle(item);

    if (isHideTitleValue !== undefined) {
      setHideTitle(!!isHideTitleValue);
    }
  }, [data?.isHideTitle, item]);


  const registry = useRegistry();
  const rawChildren = item.props?.children || [];
  const rawChildrenRef = useRef(rawChildren);
  rawChildrenRef.current = rawChildren;
  const hasColumnConfigAction = rawChildren.some(ch => ch.type === 'columnConfig');
  const shouldShowColumnConfig = !isDialogKey && !hideSettingAndExport && !hideColumnConfigButtonForDisplayType;

  const children = (shouldShowColumnConfig && !hasColumnConfigAction)
    ? [{ id: 'col-config-auto-id', type: 'columnConfig', props: {} }, ...rawChildren]
    : rawChildren;

  const slotOf = (ch) => ch.type;
  const subtabChildren = children.filter((ch) => slotOf(ch) === 'subtab');
  const functionalPropertiesChildren = children.filter((ch) => slotOf(ch) === 'functionalProperties');
  const searchChildren = children.filter((ch) => slotOf(ch) === 'search');
  const paginationChildren = children.filter((ch) => slotOf(ch) === 'pagination');
  const actionsChildren = children.filter((ch) => slotOf(ch) === 'action' || slotOf(ch) === 'columnConfig');
  const tableChildren = children.filter((ch) => slotOf(ch) === 'table');
  const moreActionChildren = children.filter((ch) => slotOf(ch) === 'moreAction');

  useEffect(() => {
    const hasSpecialTable = tableChildren.some(ch => registry[ch.type]?.dialogKey === 'leadershipDutySchedule');
    const hasHideSettingAndExport = tableChildren.some(ch =>
      registry[ch.type]?.dialogKey && hiddenDialogKeys.includes(registry[ch.type]?.dialogKey)
    );

    if (hasSpecialTable) {
      setIsDialogKey(true);
    }
    if (hasHideSettingAndExport) {
      // Dispatch actions if needed, or rely on local state if sufficient.
      // For now, keep local state logic but we could sync with redux if needed.
      setHideSettingAndExport(true);
    }
  }, [tableChildren, registry, hiddenDialogKeys]);

  const [inheritedSubtab, setInheritedSubtab] = useState(null);

  const findSubtab = useCallback((nodes) => {
    if (!nodes || !Array.isArray(nodes)) return null;
    for (const node of nodes) {
      if (node.type === 'subtab') return node;
      if (node.props?.children) {
        const found = findSubtab(node.props.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const inheritIsInheritSubTab = data && mode === 'builder' && data.isInheritSubTab !== undefined
    ? data.isInheritSubTab
    : tableChildren[0]?.props?.isInheritSubTab;
  const inheritInheritSubTabFunction = data && mode === 'builder' && data.inheritSubTabFunction !== undefined
    ? data.inheritSubTabFunction
    : tableChildren[0]?.props?.inheritSubTabFunction;

  useEffect(() => {
    const fetchInheritedSubtab = async () => {
      const isInherit = inheritIsInheritSubTab;
      const funcCode = inheritInheritSubTabFunction;

      // console.log("Check Inherit Props:", { isInherit, funcCode });

      if (
        isInherit === true &&
        typeof funcCode === 'string' &&
        funcCode.trim() !== ''
      ) {
        try {
          const requestKey = `${mode}:${funcCode}`;
          let inheritedRequest = inheritedSubtabFetchCache.get(requestKey);
          if (!inheritedRequest) {
            inheritedRequest = axiosInstance
              .get(`${FUNCTIONMANAGEMANT}/find-by-code/${funcCode}${mode === 'builder' ? "?checkSubtab=true" : ""}`)
              .then((res) => res.data || res)
              .catch((error) => {
                inheritedSubtabFetchCache.delete(requestKey);
                throw error;
              });
            inheritedSubtabFetchCache.set(requestKey, inheritedRequest);
          }
          const responseData = await inheritedRequest;
          // Hỗ trợ cả hai cấu trúc response (trực tiếp body hoặc qua response object)
          const dataFields = responseData?.data?.fields || responseData?.fields;

          // console.log("API Response:", res);
          // console.log("Extracted Fields:", dataFields);

          if (dataFields) {
            const found = findSubtab(dataFields);
            // console.log("Found Subtab:", found);
            if (found) {
              const existingSubtab = rawChildrenRef.current.find((child) => child.type === 'subtab');
              const inheritedSubtabForCurrentConfig = {
                ...found,
                id: existingSubtab?.id || found.id || crypto.randomUUID(),
                props: {
                  ...(found.props || {}),
                  ...(existingSubtab?.props || {}),
                  isInheritSubTab: true,
                  inheritSubTabFunction: funcCode,
                  subtabs: found.props?.subtabs || [],
                },
              };

              setInheritedSubtab(inheritedSubtabForCurrentConfig);
            } else {
              setInheritedSubtab(null);
            }
          } else {
            setInheritedSubtab(null);
          }
        } catch (error) {
          // console.error("Error fetching inherited subtab:", error);
          setInheritedSubtab(null);
        }
      } else {
        setInheritedSubtab(null);
      }
    };

    fetchInheritedSubtab();
  }, [
    inheritIsInheritSubTab,
    inheritInheritSubTabFunction,
    findSubtab,
    mode
  ]); // tableChildren removed to avoid loop if not needed, or handled carefully

  const effectiveSubtabChildren = inheritedSubtab ? [inheritedSubtab] : subtabChildren;

  const CRefs = useRef({});

  const {
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDropNewItem,
  } = useDragAndDrop(
    children,
    (updatedChildren) => {
      // Khi cập nhật children, nếu có virtual item thì nó sẽ tự động được lưu thành real item
      onPropChange(item.id, 'children', updatedChildren);
    },
    (type, slot) => {
      if (
        (type === 'search' && slot !== 'search') ||
        ((type === 'action' || type === 'columnConfig') && slot !== 'action') ||
        (type === 'table' && slot !== 'table') ||
        (type === 'moreAction' && slot !== 'moreAction')
      ) {
        toast(`Không thể kéo ${type} vào vùng ${slot}`, 'error');
        return;
      }

      if (type === 'search' && children.some((ch) => ch.type === 'search')) {
        toast('Chỉ được phép có một component search', 'error');
        return;
      }
      if (type === 'table' && children.some((ch) => ch.type === 'table')) {
        toast('Chỉ được phép có một component table', 'error');
        return;
      }

      onDropChild(item.id, type, slot);
    }
  );

  const handleDelete = (itemToDelete) => {
    const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
    onPropChange(item.id, 'children', updatedChildren);
  };

  const createDragHandlers = useCallback((item) => ({
    onDragStart: (e) => handleDragStart(e, item),
    onDragOver: (e) => handleDragOver(e, item),
    onDragLeave: handleDragLeave,
    onDrop: (e) => handleDrop(e, item),
  }), [handleDragStart, handleDragOver, handleDragLeave, handleDrop]);

  const handleSearch = useCallback((data) => {
    CRefs?.current?.table?.handleSearch?.(data);
  }, []);

  const handleTabChange = useCallback((data) => {
    CRefs?.current?.table?.handleTabChange?.(data);
  }, []);

  const handleTabChangeProperties = useCallback((data) => {
    const displayType = data?.displayType || (typeof data === 'string' ? data : 'list');
    const isShowPagination = data?.showPagination !== false;
    const isShowSearchTime = data?.showSearch === true;

    setCurrentDisplayType(displayType);
    setShowPagination(isShowPagination);
    setShowSearchTime(isShowSearchTime);

    CRefs?.current?.table?.handleTabChangeProperties?.(displayType);
    if (onTabChange) {
      onTabChange(displayType);
    }
  }, [onTabChange]);

  const handleActionPopup = useCallback((data) => {
    if (data.dialogKey && hiddenDialogKeys.includes(data.dialogKey)) {
      setHideSettingAndExport(true);
      // dispatch(addHiddenDialogKey(data.dialogKey)); // Already in list or managed via state
    } else {
      setHideSettingAndExport(false);
      // We might want to remove key, or verify if other criteria met
      // dispatch(removeHiddenDialogKey(data.dialogKey)); 
    }
    if (data.dialogKey === "leadershipDutySchedule") {
      setIsDialogKey(true);
    } else {
      setIsDialogKey(false);
    }
    if (data?.displayType === 'table') {
      setIsTableDisplay(true);
    } else if (data?.action === 'reset_view') {
      setIsTableDisplay(false);
    }
    CRefs?.current?.table?.handleActionPopup?.(data);
  }, []);

  const handleExport = useCallback((data) => {
    CRefs?.current?.table?.handleExportTableData?.(data);
  }, []);

  const handlePaginationChange = useCallback((data) => {
    CRefs?.current?.table?.handlePageChange?.(data);
  }, []);

  const handleOpenDeleteMultiClick = useCallback(() => {
    CRefs.current.table?.handleOpenDeleteMulti(selectedIds);
  }, [CRefs, selectedIds]);


  const handleColumnConfigClose = useCallback(() => {
    setColumnConfigAnchorEl(null);
  }, []);

  const handleColumnConfigClick = useCallback((event) => {
    setColumnConfigAnchorEl(event.currentTarget);
    // Đồng bộ dữ liệu columns khi mở popover
    if (CRefs.current?.table?.columns) {
      setPopoverColumns(JSON.parse(JSON.stringify(CRefs.current.table.columns)));
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const newValue = !isFullscreen;
    setIsFullscreen(newValue);

    // Lưu vào global state để các component con lấy được
    setGlobalTableState({
      isFullscreen: newValue,
      fullscreen: newValue
    });
  }, [isFullscreen]);

  const handleApplyColumnConfig = useCallback(async () => {
    // Cập nhật state local của table component (giao diện)
    if (CRefs.current?.table?.handleSetColumnConfig) {
      CRefs.current.table.handleSetColumnConfig(popoverColumns);
    }

    // Gọi API để lưu cấu hình
    const tableConfig = tableChildren[0]?.props;
    const moduleCode = tableConfig?.isAuthorized === true && tableConfig?.authorizedFunction
      ? tableConfig.authorizedFunction
      : tableConfig?.fnCode;

    if (moduleCode) {
      try {
        await axiosInstance.put(API_CONFIG_TABLE, { module: moduleCode, columns: popoverColumns });
        
        // Chỉ xóa cache của đúng tab/module hiện tại trong Session Storage
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("FORM_CONFIG_") && key.endsWith(`_${moduleCode}`)) {
            sessionStorage.removeItem(key);
          }
        });

        toast('Lưu cấu hình cột thành công!', 'success');
      } catch (error) {
        toast('Lưu cấu hình cột thất bại!', 'error');
      }
    }
    handleColumnConfigClose();
  }, [popoverColumns, handleColumnConfigClose, toast, tableChildren]);

  const handleToggleAllPopoverColumns = useCallback((e) => {
    const checked = e.target.checked;
    setPopoverColumns((prev) =>
      prev.map((col) => {
        if (col.type === "action" || col.hiddenInFlow) return col;
        return { ...col, isShow: checked };
      })
    );
  }, []);

  // Hàm này nhận columnKey và trả về một hàm xử lý sự kiện onClick
  // Điều này giúp tránh tạo hàm mới trong mỗi lần render của vòng lặp .map()
  const createPopoverColumnToggleHandler = useCallback((columnId) => () => {
    setPopoverColumns((prev) =>
      prev.map((col) =>
        (col.key || col.name || col.code || col.row) === columnId
          ? { ...col, isShow: !(col.isShow ?? true) }
          : col
      )
    );
  }, []);


  // const handleToggleColumn = useCallback(
  //   (columnKey) => () => {
  //     if (onToggleColumn) {
  //       onToggleColumn(columnKey);
  //     }
  //   },
  //   [onToggleColumn]
  // );

  // Lấy cấu hình của table component để kiểm tra điều kiện hiển thị nút xóa nhiều
  // và các cấu hình khác như bộ lọc sao
  const tableConfig = tableChildren[0]?.props;
  // console.log('tableConfig:', tableConfig);


  const renderZone = (zoneChildrenArray, zoneName, isSmall = false) => {
    const Zone = (
      <DropZoneBox
        onDragOver={preventDefaultDragOver}
        onDrop={createDropHandlerForNewItem(zoneName)}
        mode={mode}
      // isSmall={isSmall}
      >
        {mode === 'builder' ? (isSmall ? `Thêm ${zoneName}` : `Kéo ${zoneName} vào vùng`) : null}
      </DropZoneBox>
    );

    return (
      <>
        {zoneChildrenArray.length === 0 &&
          !allowMore.includes(zoneName) &&
          mode === 'builder' &&
          Zone}
        {allowMore.includes(zoneName) && mode === 'builder' && Zone}

        {zoneChildrenArray.map((ch) => {
          const C = registry[ch.type]?.component;
          if (!C) return null;
          const handleTabChangeFn = ch.type === 'functionalProperties' ? handleTabChangeProperties : handleTabChange;
          const content = (
            <C
              ref={(el) => {
                CRefs.current[zoneName] = el;
              }}
              onSearch={handleSearch}
              onTabChange={handleTabChangeFn}
              onActionPopup={handleActionPopup}
              onExport={handleExport}
              pagination={CRefs?.current?.table?.pagination}
              onPaginationChange={handlePaginationChange}
              onColumnConfigClick={handleColumnConfigClick}
              onToggleFullscreen={handleToggleFullscreen}
              isFullscreen={isFullscreen}
              item={ch}
              reloadData={reloadData}
              onDropChild={onDropChild}
              onPropChange={onPropChange}
              mode={mode}
              data={data}
              handleSetColumnConfig={handleSetColumnConfig}
              featureType={tableConfig?.featureType}
              showStarFilter={tableConfig?.showStarFilterConfig}
              hasFunctionalProperties={functionalPropertiesChildren.length > 0}
              showSearchTime={showSearchTime}
              displayType={currentDisplayType}
              uiVariant={uiVariant}
            />
          );

          return (
            <DraggableItemBox
              key={ch.id}
              draggable={mode === "builder"}
              {...createDragHandlers(ch)}
              isDraggingOver={dragOverId === ch.id}
              mode={mode}
            >
              {mode === 'builder' ? (
                <ElementWrapper
                  item={ch}
                  onDelete={handleDelete}
                  {...createDragHandlers(ch)}
                  disabledBorder
                >
                  {content}
                </ElementWrapper>
              ) : (
                content
              )}
            </DraggableItemBox>
          );
        })}
      </>
    );
  };

  const handleSelectedIds = useCallback((ids, rows) => {
    setSelectedIds(ids, rows);
    setDataDetail(rows);
  }, []);
  const preventDefaultDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const createDropHandlerForNewItem = useCallback((zoneName) => (e) => {
    e.preventDefault();
    handleDropNewItem(e, zoneName);
  }, [handleDropNewItem]);


  const selectedDocuments =
    selectedIds?.length > 0
      ? dataDetail?.find(
        (doc) => (doc?.documentId || doc?.id) === selectedIds[selectedIds.length - 1]
      )
      : null;

  // Tính allSelectedData từ selectedIds + dataDetail
  const allSelectedData = useMemo(() => {
    if (!selectedIds?.length || !dataDetail?.length) return [];
    return dataDetail.filter((doc) => {
      const docId = doc?.documentId || doc?.id || doc?._id || doc?.workItem?.id || doc?.bookDocumentId
      return selectedIds.some((id) => String(id) === String(docId));
    });
  }, [selectedIds, dataDetail]);

  // Tính allElectronic / allManual dựa trên isElectronic flag
  const { allElectronic, allManual } = useMemo(() => {
    if (!allSelectedData?.length) return { allElectronic: false, allManual: false };
    return {
      allElectronic: allSelectedData.every(item => item.isElectronic === true),
      allManual: allSelectedData.every(item => !item.isElectronic),
    };
  }, [allSelectedData]);

  // Biến để kiểm tra xem có nên hiển thị thanh hành động phía trên bảng hay không
  const shouldRenderActionsBar = mode === 'builder' ||
    actionsChildren.length > 0 || // Có các nút hành động được cấu hình
    (selectedIds.length > 0 && tableConfig?.featureType === 'automatic' && tableConfig?.multiDelete) || // Có nút xóa nhiều
    (selectedIds.length > 0 && dataDetail); // Có nút FormButton (ví dụ: Chuyển xử lý)

  return (
    <PageTitleContext.Provider value={{ hideTitle, setHideTitle }}>
      <StyleBoxTittle>
        {currentPageBreadcrumb?.length > 0 && !hideTitle && (
          <StyleTittleBox>
            <StyleBreadcrumb>
              {displayedBreadcrumb?.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <StyleBreadcrumbItem
                    isActive={idx === displayedBreadcrumb.length - 1}
                  >
                    {crumb.title}
                  </StyleBreadcrumbItem>
                  {idx < displayedBreadcrumb.length - 1 && (
                    <BreadcrumbSeparator>
                      <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0.19526 0.195157C0.43934 -0.0489226 0.82534 -0.0639828 1.08719 0.149584L1.13797 0.195157L5.13796 4.19517C5.39829 4.4555 5.39829 4.8775 5.13796 5.13784L1.13797 9.13784C0.87762 9.39824 0.455613 9.39824 0.19526 9.13784C-0.0650867 8.8775 -0.0650867 8.4555 0.19526 8.19517L3.72389 4.6665L0.19526 1.13786L0.149687 1.08708C-0.0638796 0.825237 -0.0488133 0.439231 0.19526 0.195157Z" fill="#2364B0" fillOpacity="0.7" />
                      </svg>
                    </BreadcrumbSeparator>
                  )}
                </React.Fragment>
              ))}
            </StyleBreadcrumb>
          </StyleTittleBox>
        )}
        {/* {currentPageTitle && !hideTitle && (
        <StyleTittleBox>
          <StyleTittleTyprography>
            {currentPageTitle}
          </StyleTittleTyprography>
        </StyleTittleBox>
      )} */}
        <TabLayoutStyle mb={2} isFullscreen={isFullscreen} isTitleHidden={!currentPageTitle || hideTitle}>
          {/* Hàng chứa Subtab (luôn nằm trên, căn trái) */}
          {(effectiveSubtabChildren.length > 0 || mode === 'builder' || isFullscreen) && (
            <SubtabRowWrapper>
              {!isFullscreen && <FlexBox>{renderZone(effectiveSubtabChildren, "subtab")}</FlexBox>}
              {isFullscreen && (
                <IconBox isFullscreen={isFullscreen}>
                  <ColumnConfigButton onClick={handleToggleFullscreen}>
                    <Tooltip title="Thoát toàn màn hình">
                      <FullscreenExitOutlinedIcon />
                    </Tooltip>
                  </ColumnConfigButton>
                </IconBox>
              )}
            </SubtabRowWrapper>
          )}

          {/* Hàng chứa FunctionalProperties (nằm dưới, căn phải và sát với card bảng) */}
          <SubtabChildrenBox
            subtabChildrenLength={functionalPropertiesChildren.length}
            mode={mode}
          >
            <BoxML>
              {renderZone(functionalPropertiesChildren, "functionalProperties", mode === 'builder' && functionalPropertiesChildren.length === 0)}
            </BoxML>
          </SubtabChildrenBox>

          <TableContentCard
            hasLeftTabs={false}
            hasRightTabs={functionalPropertiesChildren.length > 0}
            isCustomFeature={isCustomFeature}
          >
            <SearchChildrenBox
              mb={1}
              searchChildrenLength={searchChildren.length}
              mode={mode}
              isDialogKey={isDialogKey}
              isFullscreen={isFullscreen}
            >
              {!isDialogKey && (
                <FlexBox>
                  {renderZone(searchChildren, "search")}
                  {renderZone(moreActionChildren, "moreAction")}
                </FlexBox>
              )}


              {/* Chỉ hiển thị toàn bộ thanh này khi có nội dung */}
              {shouldRenderActionsBar && (
                <IconBox>
                  {selectedIds.length > 0 && (
                    <FormButton
                      dataDetail={selectedDocuments}
                      setReloadData={setReloadData}
                      selectedIds={selectedIds}
                      allSelectedData={allSelectedData}
                      allElectronic={allElectronic}
                      allManual={allManual}
                    />
                  )}
                  &nbsp;
                  {!isDialogKey && !hideSettingAndExport && (
                    selectedIds.length > 0 &&
                    tableConfig?.featureType === 'automatic' &&
                    tableConfig?.multiDelete &&
                    allManual && (
                      <DeleteMultiButton
                        variant="contained"
                        onClick={handleOpenDeleteMultiClick}
                      >
                        <Tooltip title="Xóa nhiều bản ghi">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_3322_4237)">
                              <path fillRule="evenodd" clipRule="evenodd" d="M5.851 2.22509C6.05555 2.02088 6.31086 1.87492 6.59061 1.80227C6.87036 1.72961 7.16443 1.73288 7.44249 1.81175C7.72056 1.89061 7.97256 2.04222 8.17251 2.25093C8.37246 2.45964 8.51312 2.7179 8.58 2.99909H5.42C5.489 2.70909 5.637 2.43909 5.852 2.22509M3.646 2.99909C3.73845 2.17424 4.13161 1.41238 4.75034 0.859118C5.36907 0.305858 6.16998 0 7 0C7.83002 0 8.63093 0.305858 9.24966 0.859118C9.86839 1.41238 10.2616 2.17424 10.354 2.99909H13C13.2321 2.99909 13.4546 3.09128 13.6187 3.25537C13.7828 3.41947 13.875 3.64202 13.875 3.87409C13.875 4.10615 13.7828 4.32871 13.6187 4.49281C13.4546 4.6569 13.2321 4.74909 13 4.74909H12.125V12.3741C12.125 12.5875 12.083 12.7988 12.0013 12.9959C11.9196 13.1931 11.7999 13.3722 11.649 13.5231C11.4982 13.674 11.319 13.7937 11.1219 13.8754C10.9247 13.9571 10.7134 13.9991 10.5 13.9991H3.5C3.2866 13.9991 3.07529 13.9571 2.87814 13.8754C2.68099 13.7937 2.50185 13.674 2.35095 13.5231C2.20006 13.3722 2.08036 13.1931 1.9987 12.9959C1.91703 12.7988 1.875 12.5875 1.875 12.3741V4.74909H1C0.885093 4.74909 0.771312 4.72646 0.665152 4.68248C0.558992 4.63851 0.462533 4.57406 0.381282 4.49281C0.30003 4.41156 0.235578 4.3151 0.191605 4.20894C0.147633 4.10278 0.125 3.989 0.125 3.87409C0.125 3.75918 0.147633 3.6454 0.191605 3.53924C0.235578 3.43308 0.30003 3.33662 0.381282 3.25537C0.462533 3.17412 0.558992 3.10967 0.665152 3.06569C0.771312 3.02172 0.885093 2.99909 1 2.99909H3.646ZM10.875 12.3741V4.74909H3.125V12.3741C3.125 12.4735 3.16451 12.5689 3.23483 12.6393C3.30516 12.7096 3.40054 12.7491 3.5 12.7491H10.5C10.5995 12.7491 10.6948 12.7096 10.7652 12.6393C10.8355 12.5689 10.875 12.4735 10.875 12.3741ZM5.5 6.00009C5.845 6.00009 6.125 6.28009 6.125 6.62509V10.6271C6.125 10.7928 6.05915 10.9518 5.94194 11.069C5.82473 11.1862 5.66576 11.2521 5.5 11.2521C5.33424 11.2521 5.17527 11.1862 5.05806 11.069C4.94085 10.9518 4.875 10.7928 4.875 10.6271V6.62509C4.875 6.28009 5.155 6.00009 5.5 6.00009ZM9.125 6.62509C9.125 6.45933 9.05915 6.30036 8.94194 6.18315C8.82473 6.06594 8.66576 6.00009 8.5 6.00009C8.33424 6.00009 8.17527 6.06594 8.05806 6.18315C7.94085 6.30036 7.875 6.45933 7.875 6.62509V10.6271C7.875 10.7928 7.94085 10.9518 8.05806 11.069C8.17527 11.1862 8.33424 11.2521 8.5 11.2521C8.66576 11.2521 8.82473 11.1862 8.94194 11.069C9.05915 10.9518 9.125 10.7928 9.125 10.6271V6.62509Z" fill="#EF5350" />
                            </g>
                            <defs>
                              <clipPath id="clip0_3322_4237">
                                <rect width="14" height="14" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>

                        </Tooltip>
                      </DeleteMultiButton>
                    )
                  )}

                  {/* Nút Cấu hình cột mặc định */}

                  {/* Nút Cấu hình cột mặc định */}


                  {(isFullscreen ||
                    hideSettingAndExport
                  ) && (
                      <ColumnConfigButton onClick={handleToggleFullscreen}>
                        <Tooltip title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
                          {isFullscreen ? <FullscreenExitOutlinedIcon /> : <FullscreenOutlinedIcon />}
                        </Tooltip>
                      </ColumnConfigButton>
                    )}

                  {renderZone(hideSettingAndExport
                    ? actionsChildren.filter((ac) => !["Export", "Delete"].includes(ac.props?.icon || ac.icon))
                    : actionsChildren, "action")}
                </IconBox>
              )}
            </SearchChildrenBox>
            <TableDropZoneBox
              onDragOver={preventDefaultDragOver}
              onDrop={createDropHandlerForNewItem("table")}
            >
              {tableChildren.length > 0 ? (
                tableChildren.map((ch) => {
                  const C = registry[ch.type]?.component;
                  if (!C) return null;
                  const content = (
                    <C
                      ref={(el) => {
                        CRefs.current["table"] = el;
                      }}
                      // onSelectedIds={(data) => handleSelectedIds(data)}
                      onSelectedIds={handleSelectedIds}
                      item={ch}
                      reloadData={reloadData}
                      setReloadData={setReloadData}
                      onDropChild={onDropChild}
                      onPropChange={onPropChange}
                      mode={mode}
                      data={data}
                      handleSetColumnConfig={handleSetColumnConfig}
                      columns={layoutFields}
                      dataColumn={layoutFields}
                      onColumnToggle={CRefs.current.table?.onColumnToggle}
                      handleToggleAllColumns={CRefs.current.table?.handleToggleAllColumns}
                    />
                  );
                  return (
                    <ColumnActionsV4
                      key={ch.id}
                      isFlex={ch.props?.flex || "0 1 auto"}
                      draggable={mode === "builder"}
                      {...createDragHandlers(ch)}
                      isminHeight="50px"
                      isminWidth="100px"
                      iswidth="100%"
                      isposition="relative"
                      iscursor={mode === "builder" ? "grab" : "default"}
                      istransition="all 0.2s"
                      isborder={dragOverId === ch.id ? "2px dashed #3f51b5" : "none"}
                      isoutline="none"
                    >
                      {mode === "builder" ? (
                        <ElementWrapper
                          item={ch}
                          onDelete={handleDelete}
                          {...createDragHandlers(ch)}
                          disabledBorder
                        >
                          {content}
                        </ElementWrapper>
                      ) : (
                        content
                      )}
                    </ColumnActionsV4>
                  );
                })
              ) : (
                <EmptyColumnBox
                  isborder={mode === "builder" ? "2px dashed #3f51b5" : "none"}
                >
                  {mode === "builder" ? "Kéo component vào vùng bảng" : null}
                </EmptyColumnBox>
              )}
            </TableDropZoneBox>

            {/* Render pagination ở đây cho mọi kích thước màn hình */}
            {(paginationChildren.length > 0 || mode === 'builder') && showPagination && !isTableDisplay && (
              <PaginationWrapper isNoPadding={isSmallScreen}>
                {renderZone(paginationChildren, "pagination")}
              </PaginationWrapper>
            )}
          </TableContentCard>

          <Popover
            open={Boolean(columnConfigAnchorEl)}
            anchorEl={columnConfigAnchorEl}
            onClose={handleColumnConfigClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: isTabletScreen ? "left" : "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: isTabletScreen ? "left" : "right",
            }}
            onBackdropClick={handleColumnConfigClose}
            PaperProps={{
              sx: {
                borderRadius: 2,
                boxShadow: 3,
                minWidth: 340,
                p: 0,
              },
            }}
          >
            <StyleBoxCH>
              <StyleBoxDropDown>
                <StyleTyprographyDropDown variant="subtitle1">
                  Cấu hình bảng
                </StyleTyprographyDropDown>
                <StyleIconDropDown />
              </StyleBoxDropDown>

              {popoverColumns.length > 0 ? (
                <>
                  <StyleBoxDrop>
                    <StyleFomControl
                      control={
                        <Checkbox
                          checked={popoverColumns.filter(c => c.type !== "action" && !c.hiddenInFlow).every((c) => c.isShow)}
                          indeterminate={
                            popoverColumns.filter(c => c.type !== "action" && !c.hiddenInFlow).some((c) => c.isShow) &&
                            !popoverColumns.filter(c => c.type !== "action" && !c.hiddenInFlow).every((c) => c.isShow)
                          }
                          onChange={handleToggleAllPopoverColumns}
                          size="small"
                        />
                      }
                      label="Tất cả"
                    />
                  </StyleBoxDrop>

                  <StyleBoxDrown>
                    {popoverColumns
                      .filter((c) => c.type !== "action" && !c.hiddenInFlow)
                      .map((colConfig) => (
                        <StyleFomControl
                          key={colConfig.key}
                          control={
                            <Checkbox
                              checked={colConfig.isShow ?? true}
                              onChange={createPopoverColumnToggleHandler(colConfig.key || colConfig.name || colConfig.code || colConfig.row)}
                              size="small"
                            />
                          }
                          label={colConfig.label || colConfig.key}
                        />
                      ))}
                  </StyleBoxDrown>

                  <StyleBoxButton>
                    <StyleButtonH
                      variant="text"
                      size="small"
                      onClick={handleColumnConfigClose}
                    >
                      Hủy
                    </StyleButtonH>
                    <StyleButtonAD
                      variant="contained"
                      size="small"
                      onClick={handleApplyColumnConfig}  // ← Quan trọng: gọi hàm apply
                    >
                      Áp dụng
                    </StyleButtonAD>
                  </StyleBoxButton>
                </>
              ) : (
                <Typography variant="body2" >
                  Đang tải cấu hình cột...
                </Typography>
              )}
            </StyleBoxCH>
          </Popover>

        </TabLayoutStyle>
      </StyleBoxTittle>
    </PageTitleContext.Provider>
  );
}

TableLayout.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string.isRequired,
    props: PropTypes.shape({
      direction: PropTypes.string,
      justifyContent: PropTypes.string,
      alignItems: PropTypes.string,
      gap: PropTypes.number,
      flex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      children: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
            .isRequired,
          type: PropTypes.string.isRequired,
          props: PropTypes.object,
        })
      ),
    }),
  }).isRequired,
  onDropChild: PropTypes.func.isRequired,
  onPropChange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["builder", "preview"]),
  data: PropTypes.object,
  handleSetColumnConfig: PropTypes.func,
  fields: PropTypes.array,
  onToggleColumn: PropTypes.func,
  columns: PropTypes.array,
  onTabChange: PropTypes.func,
  onColumnToggle: PropTypes.func,
  handleToggleAllColumns: PropTypes.func,
};

TableLayout.defaultProps = {
  mode: "builder",
};
