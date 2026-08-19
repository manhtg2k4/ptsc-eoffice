import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { List } from "react-window";
import {
  CircularProgress,
  Checkbox,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import PropTypes from "prop-types";
import {
  StyledPaper,
  StyledTable,
  StyledTableCell,
  StyledTableContainer,
  StyledTableHead,
  StyledTableRow,
  StyleBoxInTableTree,
  StyledTableCellLoadMore,
  HeaderCellContainer,
} from "@styles/CustomTable.styles";
import "@components/CustomTable/CustomCss.css";
import { useToast } from "@components/common/ToastProvider";
import { AuthContext } from "@AuthContext/AuthProvider";
import {
  // useDispatch,
  useSelector,
} from "react-redux";
import {
  StyleBoxTittle,
  StyleTittleBox,
  StyleTittleTyprography,
} from "@builder-table/components/SearchSection.styles";
import {

  TreeTableWithIconToggleButton,
  StyleIconFolder,
  StyleIconInsertDriveFile,
} from "@styles/CustomTableTreeWithIcon.styles";
import {
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
} from "@pages/RecordExploitation/components/RecipientInfoTable.styles";
import { 
  InheritedTableCell, 
  InheritedTableCellActions, 
  InheritedCheckboxHeaderCell,
  InheritedTableRow,
  InheritedToolbar,
  InheritedSearchContainer,
  InheritedToolbarContent
} from "@styles/PopupTableMembersProject/PopupTableMembersProject.style";

import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import CustomInput from "@components/CustomInput/CustomInputBase";
import { SkyTableBody } from "@styles/SkyStyles";

const VIRTUAL_ROW_HEIGHT = 48;
const VIRTUAL_SENTINEL_ROW_HEIGHT = 40;
 
const normalizeColWidth = (w) => {
  if (!w) return undefined;
  if (typeof w === "number") return `${w}px`;
  if (typeof w === "string") {
    if (/(%|rem|px|vw)/.test(w)) return w;
    const num = parseFloat(w);
    return isNaN(num) ? undefined : `${num}px`;
  }
  return undefined;
};

const CustomTableTreeLoadmore = ({
  children,
  data: propData,
  fetchData,
  fetchChildren,

  columns,

  disableCheckbox = false,
  disableHeaderTable = false,

  reload,
  disableAction,
  autoHeight = false,
  selection,
  onSelectionChange,
  rowKey = "_id",
  onSelectRow,
  disableSearch = false,
  autoFilter = false,
  noneTitle = false,
  mainLimits,
  childrenLimits,
  unsetStyledMaxHeight,
  disableIcon,

}) => {
  // const dispatch = useDispatch();
  const [internalSelected, setInternalSelected] = useState([]);
  const currentPageTitle = useSelector(
    (state) => state.layout.currentPageTitle
  );

  const [inputValue, setInputValue] = useState(""); // State để nhập liệu mượt hơn
  const [committedSearchText, setCommittedSearchText] = useState(""); // State cho tìm kiếm thực tế
  const [isLoading, setIsLoading] = useState(false);
  const mainLimit = mainLimits || 30;
  const childrenLimit = childrenLimits || 20;
  const [isParentLoading, setIsParentLoading] = useState(false);
  const [hasMoreParents, setHasMoreParents] = useState(true);


  // ===== THAY ĐỔI MỚI: Quản lý dữ liệu theo trang (PARENT) =====
  const [loadedPages, setLoadedPages] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

 

  const [data, setData] = useState(propData || []);
  const toast = useToast();
  const { systemParams } = useContext(AuthContext);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  const isControlled =
    selection !== undefined && onSelectionChange !== undefined;
  const selected = isControlled ? selection : internalSelected;
  const setSelected = isControlled ? onSelectionChange : setInternalSelected;

  /**
   * nodeChildren[parentId] = {
   *   children: [],
   *   lowestPage: 1,
   *   highestPage: 1,
   *   loadedPages: Set([1]),
   *   hasMoreDown: true,
   *   loading: false,
   * }
   */
  const [nodeChildren, setNodeChildren] = useState({});
  const tableContainerRef = useRef(null);
  const loadDataMainRef = useRef(null);
  const virtualListWrapperRef = useRef(null);
  const isSearchActionRef = useRef(false);
  const [virtualScrollbarWidth, setVirtualScrollbarWidth] = useState(0);

  const [lowestPage, setLowestPage] = useState(1);

  // Refs to store latest state for async guards and avoiding stale closures
  const dataRef = useRef(data);
  const nodeChildrenRef = useRef(nodeChildren);
  const isParentLoadingRef = useRef(isParentLoading);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { nodeChildrenRef.current = nodeChildren; }, [nodeChildren]);
  useEffect(() => { isParentLoadingRef.current = isParentLoading; }, [isParentLoading]);
  useEffect(() => {
    if (propData) setData(propData);
  }, [propData, systemParams]);


  useEffect(() => {
    const measureScrollbar = () => {
      const wrapperEl = virtualListWrapperRef.current;
      const scrollerEl = wrapperEl?.firstElementChild;
      if (!scrollerEl) {
        setVirtualScrollbarWidth(0);
        return;
      }
      const width = Math.max(0, scrollerEl.offsetWidth - scrollerEl.clientWidth);
      setVirtualScrollbarWidth(width);
    };

    const rafId = requestAnimationFrame(measureScrollbar);
    window.addEventListener("resize", measureScrollbar);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measureScrollbar);
    };
  }, [autoHeight, data.length, currentPage, lowestPage, hasMoreParents]);
  // ===== LOAD DATA MAIN - CÓ XỬ LÝ XÓA TRANG CŨ =====
  const loadDataMain = useCallback(
    async (newPage, isNewSearch = false, customLimit = mainLimit) => {
      if (!fetchData) return;

      const shouldShowSearchLoading =
        isNewSearch && isSearchActionRef.current;
      const shouldShowLoadMoreLoading = !isNewSearch;
      const shouldShowGlobalLoading =
        shouldShowSearchLoading || shouldShowLoadMoreLoading;
      if (shouldShowSearchLoading) {
        // chỉ tiêu thụ 1 lần cho đúng lượt search vừa trigger
        isSearchActionRef.current = false;
      }

      // Khi isNewSearch, bỏ qua các guard để đảm bảo tìm kiếm mới luôn được thực hiện
      if (!isNewSearch) {
        if (isParentLoadingRef.current) return;
        if (loadedPages.has(newPage)) return;
        if (newPage !== currentPage + 1 && newPage !== lowestPage - 1) return;
      }

      if (shouldShowGlobalLoading) {
        setIsLoading(true);
      }

      isParentLoadingRef.current = true;
      setIsParentLoading(true);
      try {

        // Build filter params giống CustomTableStatic
        const filterParams = {};
        if (committedSearchText) {
          filterParams.name = committedSearchText;
        }

        // Tính toán limit theo công thức: nếu số bản ghi còn lại < 10 thì chỉ lấy phần còn thiếu
        let effectiveLimit = customLimit;
        if (!isNewSearch && totalRecords > 0) {
          const currentLoaded = (newPage - 1) * customLimit;
          const remaining = totalRecords - currentLoaded;
          if (remaining > 0 && remaining < customLimit) {
            effectiveLimit = remaining;
          }
        }

        const result = await fetchData({
          page: newPage,
          limit: effectiveLimit,
          ...filterParams,
        });

        const newData = result.data || [];
        const newTotal = result.total || 0;

        if (newPage === 1) {
          setTotalRecords(newTotal);
        }

        if (isNewSearch || newPage === 1) {
          setData(newData);
          setLoadedPages(new Set([newPage]));
          setCurrentPage(newPage);
          setLowestPage(newPage);
          nodeChildrenRef.current = {};
          setNodeChildren({});
          setExpanded({});
          setHasMoreParents(
            newData.length === effectiveLimit && newData.length < newTotal
          );
          
          if (result.ancestorsToExpand && result.ancestorsToExpand.length > 0) {
            setExpanded((prev) => {
              const next = { ...prev };
              result.ancestorsToExpand.forEach((id) => { next[id] = true; });
              return next;
            });
            result.ancestorsToExpand.forEach((id) => {
              loadChildren(id, 1, false);
            });
          }

          // Explicit reset loading trước return để spinner tắt ngay
          if (shouldShowGlobalLoading) {
            setIsLoading(false);
          }
          setIsParentLoading(false);
          return;
        }

        if (newPage === currentPage + 1) {
          if (newData.length === 0) {
            setHasMoreParents(false);
            setLoadedPages((prev) => new Set([...prev, newPage]));
            setIsParentLoading(false);
            return;
          }
          setData((prev) => [...prev, ...newData]);
          setCurrentPage(newPage);
        } else if (newPage === lowestPage - 1) {
          if (newData.length === 0) {
            // Đánh dấu page rỗng để không gọi lặp lại khi sentinel vẫn còn trong viewport
            setLoadedPages((prev) => new Set([...prev, newPage]));
            setIsParentLoading(false);
            return;
          }
          setData((prev) => [...newData, ...prev]);
          setLowestPage(newPage);
        }

        setLoadedPages((prev) => new Set([...prev, newPage]));

        setHasMoreParents(data.length + newData.length < totalRecords);

        if (newData.length === 0) {
          setHasMoreParents(false);
        }
      } catch (error) {
        toast("Có lỗi khi gọi dữ liệu!", "error");
      } finally {
        if (shouldShowGlobalLoading) {
          setIsLoading(false);
        }
        isParentLoadingRef.current = false;
        setIsParentLoading(false);
      }
    },
    [
      fetchData,
      committedSearchText,

      mainLimit,
      loadedPages,
      currentPage,
      lowestPage,
      data.length,
      totalRecords,
      toast,

    ]
  );

  // Cập nhật ref để luôn trỏ tới loadDataMain mới nhất
  loadDataMainRef.current = loadDataMain;

  // Trigger load data khi các tiêu chí tìm kiếm/lọc thay đổi
  // KHÔNG đưa loadDataMain vào deps để tránh vòng lặp vô hạn
  const lastFetchParamsRef = useRef(null);
  useEffect(() => {
    if (
      lastFetchParamsRef.current &&
      lastFetchParamsRef.current.text === committedSearchText &&
      lastFetchParamsRef.current.reload === reload &&
      lastFetchParamsRef.current.mainLimit === mainLimit
    ) {
      return;
    }
    lastFetchParamsRef.current = {
      text: committedSearchText,
      reload,
      mainLimit,
    };
    loadDataMainRef.current(1, true, mainLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedSearchText, reload, mainLimit]);

  const totalColumns =
    (columns?.length || 0) + (!disableCheckbox ? 1 : 0) + (!disableAction ? 1 : 0);

  const headerColGroupEl = useMemo(() => {
    const cols = [];
    if (!disableCheckbox) cols.push({ key: "col-cb", width: "50px" });
    // Removed col-exp
    (columns || []).forEach((col) => {
      const w = isSmallScreen && col.mobileWidth ? col.mobileWidth : col.width;
      cols.push({ key: `col-${col.row || col.name}`, width: normalizeColWidth(w) });
    });
    if (!disableAction) cols.push({ key: "col-act", width: "100px" });
    return (
      <colgroup>
        {cols.map(({ key, width }) => (
          <col key={key} style={width ? { width } : undefined} />
        ))}
      </colgroup>
    );
  }, [columns, disableCheckbox, disableAction, isSmallScreen]);

  const rowColGroupEl = useMemo(() => {
    const cols = [];
    if (!disableCheckbox) cols.push({ key: "col-cb", width: "50px" });
    // Removed col-exp
    (columns || []).forEach((col) => {
      const w = isSmallScreen && col.mobileWidth ? col.mobileWidth : col.width;
      cols.push({ key: `col-${col.row || col.name}`, width: normalizeColWidth(w) });
    });
    if (!disableAction) cols.push({ key: "col-act", width: "100px" });
    return (
      <colgroup>
        {cols.map(({ key, width }) => (
          <col key={key} style={width ? { width } : undefined} />
        ))}
      </colgroup>
    );
  }, [columns, disableCheckbox, disableAction, isSmallScreen]);

  const handleSearchFilter = (e) => {
    const inputVal = e.target.value;
    setInputValue(inputVal); // Update inputValue for real-time typing

    // Khi xóa search text, reset expanded state
    if (!inputVal || inputVal.trim() === "") {
      setExpanded({});
    }
  };

  const handleSearchClick = useCallback(
    (query) => {
      isSearchActionRef.current = true;
      setCommittedSearchText(query.trim());
    },
    []
  );

  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    setNodeChildren({});
  }, [reload]);

  /**
   * LOAD CHILDREN 2 CHIỀU (DOWN/UP) + WINDOWING (xoá trang xa nhất)
   * Yêu cầu:
   * - mở node: load page 1
   * - cuộn xuống: load page 2, page 3...
   * - đến page 3 thì xoá page 1
   * - cuộn ngược lên: call lại page 1 và xoá page 3 (giữ [1,2])
   */
  const loadChildren = useCallback(
    async (
      parentId,
      pageNum,
      showGlobalLoading = false
      // direction = "down"
    ) => {
      if (!fetchChildren) return;

      const node = nodeChildrenRef.current[parentId];

      // Chặn nếu đang loading
      if (node?.loading) return;

      // Nếu page đã có trong memory thì bỏ qua
      if (node?.loadedPages?.has?.(pageNum)) return;

      // Chặn "nhảy cóc" page (chỉ cho phép load liên tiếp)
      if (node && node.loadedPages && node.loadedPages.size > 0) {
        const expectedDown = (node.highestPage || 0) + 1;
        const expectedUp = (node.lowestPage || 1) - 1;

        const isValid =
          pageNum === 1 || pageNum === expectedDown || pageNum === expectedUp;

        if (!isValid) return;
      }

      if (showGlobalLoading) {
        setIsLoading(true);
      }

      // set loading đồng bộ vào Ref để guard hoạt động ngay lập tức
      setNodeChildren((prev) => {
        const newState = {
          ...prev,
          [parentId]: {
            ...(prev[parentId] || {
              children: [],
              lowestPage: 1,
              highestPage: 0,
              loadedPages: new Set(),
              hasMoreDown: true,
            }),
            loading: true,
          },
        };
        nodeChildrenRef.current = newState;
        return newState;
      });

      try {
        // Build filter params giống loadDataMain
        const filterParams = {};
        if (committedSearchText) {
          filterParams.name = committedSearchText;
        }

        const res = await fetchChildren({
          parentId,
          page: pageNum,
          limit: childrenLimit,
          ...filterParams,
        });

        const newChildren = res?.data || res || [];
        const hasMoreDown = newChildren.length === childrenLimit;

        if (res && res.ancestorsToExpand && res.ancestorsToExpand.length > 0) {
          setExpanded((prev) => {
            const next = { ...prev };
            res.ancestorsToExpand.forEach((id) => {
              next[id] = true;
            });
            return next;
          });
          // KHÔNG gọi loadChildren đệ quy ở đây
          // vì fetchChildrenLazy với search term sẽ lại trả về ancestorsToExpand
          // gây cascade vô hạn: loadChildren → fetchChildren → ancestorsToExpand → loadChildren → ...
        }

        setNodeChildren((prev) => {
          const current = prev[parentId] || {
            children: [],
            lowestPage: 1,
            highestPage: 0,
            loadedPages: new Set(),
            hasMoreDown: true,
          };

          let newState;

          // Nếu là lần đầu (node chưa có trang nào) => nhận page 1
          if (current.loadedPages.size === 0) {
            newState = {
              ...prev,
              [parentId]: {
                children: newChildren,
                lowestPage: pageNum,
                highestPage: pageNum,
                loadedPages: new Set([pageNum]),
                hasMoreDown,
                loading: false,
              },
            };
            nodeChildrenRef.current = newState;
            return newState;
          }

          let childrenArr = current.children;
          let lowestP = current.lowestPage;
          let highestP = current.highestPage;
          const loaded = new Set(current.loadedPages);

          const isLoadDown = pageNum === highestP + 1;
          const isLoadUp = pageNum === lowestP - 1;

          if (newChildren.length === 0) {
            const loadedEmpty = new Set(current.loadedPages);
            loadedEmpty.add(pageNum);

            if (isLoadDown) {
              newState = {
                ...prev,
                [parentId]: {
                  ...current,
                  hasMoreDown: false,
                  loadedPages: loadedEmpty,
                  loading: false,
                },
              };
              nodeChildrenRef.current = newState;
              return newState;
            }

            if (isLoadUp || (pageNum === 1 && lowestP > 1)) {
              newState = {
                ...prev,
                [parentId]: {
                  ...current,
                  loadedPages: loadedEmpty,
                  loading: false,
                },
              };
              nodeChildrenRef.current = newState;
              return newState;
            }
          }

          if (isLoadDown) {
            childrenArr = [...childrenArr, ...newChildren];
            highestP = pageNum;
          } else if (isLoadUp) {
            childrenArr = [...newChildren, ...childrenArr];
            lowestP = pageNum;
          } else if (pageNum === 1 && lowestP > 1) {
            // case đặc biệt: đang giữ [2,3] rồi gọi lại page 1
            childrenArr = [...newChildren, ...childrenArr];
            lowestP = 1;
          } else {
            newState = {
              ...prev,
              [parentId]: { ...current, loading: false },
            };
            nodeChildrenRef.current = newState;
            return newState;
          }

          loaded.add(pageNum);

          // Đoạn code xoá page cũ gây lỗi infinite scroll do List bị shrink, nên đã được xoá đi.

          newState = {
            ...prev,
            [parentId]: {
              ...current,
              children: childrenArr,
              lowestPage: lowestP,
              highestPage: highestP,
              loadedPages: loaded,
              hasMoreDown: isLoadDown ? hasMoreDown : current.hasMoreDown,
              loading: false,
            },
          };
          nodeChildrenRef.current = newState;
          
          // ancestorsToExpand trong loadChildren chỉ expand state, không gọi loadChildren lại
          // (đã xử lý ở trên, trước setNodeChildren)
          
          return newState;
        });
      } catch (e) {
        setNodeChildren((prev) => {
          const newState = {
            ...prev,
            [parentId]: { ...(prev[parentId] || {}), loading: false },
          };
          nodeChildrenRef.current = newState;
          return newState;
        });
      } finally {
        if (showGlobalLoading) {
          setIsLoading(false);
        }
      }
    },
    [fetchChildren, childrenLimit, committedSearchText]
  );

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = data.map((n) => n[rowKey] || n._id || n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const getDescendantIds = useCallback(
    (parentId, ancestors = new Set()) => {
      let descendants = [];
      const children = nodeChildren[parentId]?.children || [];
      
      ancestors.add(parentId);
      
      children.forEach((child) => {
        const childId = child[rowKey] || child._id || child.id;
        if (ancestors.has(childId)) return;
        
        descendants.push(childId);
        descendants = [...descendants, ...getDescendantIds(childId, ancestors)];
      });
      
      ancestors.delete(parentId);
      
      return descendants;
    },
    [nodeChildren, rowKey]
  );

  const handleClickCheckbox = useCallback(
    (event, id) => {
      event.stopPropagation();
      const selectedIndex = selected.indexOf(id);
      const isSelecting = selectedIndex === -1;
      const descendants = getDescendantIds(id);
      const idsToToggle = [id, ...descendants];
      let newSelected;

      if (isSelecting) {
        const toAdd = idsToToggle.filter(
          (itemId) => !selected.includes(itemId)
        );
        newSelected = [...selected, ...toAdd];
      } else {
        newSelected = selected.filter(
          (itemId) => !idsToToggle.includes(itemId)
        );
      }
      setSelected(newSelected);

      if (onSelectRow) {
        const rows = data.filter((item) => {
          const itemId = item[rowKey] || item._id || item.id;
          return newSelected.includes(itemId);
        });
        onSelectRow(rows, isSelecting);
      }
    },
    [data, onSelectRow, rowKey, getDescendantIds, selected, setSelected]
  );

  const handleCheckboxClick = useCallback(
    (event) => {
      const rowId = event.currentTarget.dataset.rowId;
      handleClickCheckbox(event, rowId);
    },
    [handleClickCheckbox]
  );

  const rootRows = useMemo(() => {
    const roots = data.filter((item) => !item.parent);
    const orphanRoots = data.filter((item) => {
      if (!item.parent) return false;
      return !data.some((d) => {
        const parentId = d[rowKey] || d._id || d.id;
        return parentId === item.parent;
      });
    });
    return [...roots, ...orphanRoots];
  }, [data, rowKey]);

  const flatRows = useMemo(() => {
    const rows = [];

    if (lowestPage > 1) {
      rows.push({ type: "parent-up", id: "parent-up" });
    }

    const walk = (inputRows, level = 0, ancestors = new Set()) => {
      inputRows.forEach((row) => {
        const id = row[rowKey] || row._id || row.id;
        
        if (ancestors.has(id)) {
          logger.warn(`Circular reference detected for row id: ${id}`);
          return;
        }

        const nodeData = nodeChildren[id] || {};
        const isExpanded = !!expanded[id];

        rows.push({ type: "data", id, row, level, nodeData, isExpanded });

        if (isExpanded) {
          if ((nodeData.lowestPage || 1) > 1) {
            rows.push({ type: "child-up", id: `child-up-${id}`, parentId: id });
          }

          ancestors.add(id);
          const childrenRows = nodeData.children || [];
          walk(childrenRows, level + 1, ancestors);
          ancestors.delete(id);

          if (nodeData.hasMoreDown) {
            rows.push({ type: "child-down", id: `child-down-${id}`, parentId: id });
          }
        }
      });
    };

    walk(rootRows, 0);

    if (hasMoreParents) {
      rows.push({ type: "parent-down", id: "parent-down" });
    }

    return rows;
  }, [rootRows, rowKey, nodeChildren, expanded, lowestPage, hasMoreParents]);

  const getVirtualRowHeight = useCallback(
    (index) => {
      const row = flatRows[index];
      if (!row || row.type === "data") return VIRTUAL_ROW_HEIGHT;
      return VIRTUAL_SENTINEL_ROW_HEIGHT;
    },
    [flatRows]
  );



  const handleVirtualRowsRendered = useCallback(
    ({ startIndex = 0, stopIndex, endIndex }) => {
      const visibleEndIndex = typeof stopIndex === "number" ? stopIndex : endIndex;
      if (typeof visibleEndIndex !== "number") return;

      for (let i = startIndex; i <= visibleEndIndex; i += 1) {
        const item = flatRows[i];
        if (!item) continue;

        if (item.type === "parent-down" && hasMoreParents && !isParentLoadingRef.current) {
          loadDataMainRef.current?.(currentPage + 1, false, mainLimit);
        }

        if (item.type === "parent-up" && lowestPage > 1 && !isParentLoadingRef.current) {
          loadDataMainRef.current?.(lowestPage - 1, false, mainLimit);
        }

        if (item.type === "child-down") {
          const nodeData = nodeChildren[item.parentId];
          const next = (nodeData?.highestPage || 1) + 1;
          loadChildren(item.parentId, next, true);
        }

        if (item.type === "child-up") {
          const nodeData = nodeChildren[item.parentId];
          const prev = (nodeData?.lowestPage || 1) - 1;
          if (prev >= 1) loadChildren(item.parentId, prev, true);
        }
      }
    },
    [
      flatRows,
      hasMoreParents,
      currentPage,
      mainLimit,
      lowestPage,
      nodeChildren,
      loadChildren,
    ]
  );

  // Fallback scroll listener: bắt scroll từ bất kỳ ancestor scrollable nào (window, DialogContent,
  // StyledTableContainer...) để trigger loadmore khi đáy virtual list đi vào vùng hiển thị.
  // Không phụ thuộc vào autoHeight – hoạt động cho cả full-page và dialog context.
  useEffect(() => {
    const wrapperEl = virtualListWrapperRef.current;
    if (!wrapperEl) return;

    // Thu thập tất cả scrollable ancestor (bao gồm tableContainerRef)
    const scrollTargets = new Set();
    if (tableContainerRef.current) scrollTargets.add(tableContainerRef.current);

    let el = wrapperEl.parentElement;
    while (el && el !== document.documentElement) {
      const { overflowY } = window.getComputedStyle(el);
      if (overflowY === 'auto' || overflowY === 'scroll') scrollTargets.add(el);
      el = el.parentElement;
    }
    scrollTargets.add(window);

    const check = () => {
      if (!hasMoreParents || isParentLoadingRef.current) return;

      const wrapperRect = wrapperEl.getBoundingClientRect();

      // Kiểm tra với từng scroll container
      for (const target of scrollTargets) {
        let viewportBottom;
        if (target === window) {
          viewportBottom = window.innerHeight;
        } else {
          const targetRect = target.getBoundingClientRect();
          viewportBottom = targetRect.bottom;
        }
        if (wrapperRect.bottom <= viewportBottom + 150) {
          loadDataMainRef.current?.(currentPage + 1, false, mainLimit);
          return;
        }
      }
    };

    scrollTargets.forEach(t => t.addEventListener('scroll', check, { passive: true }));
    window.addEventListener('resize', check);

    return () => {
      scrollTargets.forEach(t => t.removeEventListener('scroll', check));
      window.removeEventListener('resize', check);
    };
  }, [
    hasMoreParents,
    currentPage,
    mainLimit,
    data.length,
  ]);

  const VirtualRow = ({ index, style, flatRows: rowFlatRows }) => {
    const item = rowFlatRows?.[index];
    if (!item) return null;

    if (item.type !== "data") {
      return (
        <div style={style}>
          <table
            className="custom-table-tree-virtual-row-table"
            style={{ width: `calc(100% + ${virtualScrollbarWidth}px)`, borderCollapse: 'collapse' }}
          >
            {rowColGroupEl}
            <tbody>
              <StyledTableRow>
                <StyledTableCell colSpan={totalColumns} styleTextAlign="center">
                  {(isParentLoading || (item.parentId && nodeChildren[item.parentId]?.loading)) ? (
                    <CircularProgress size={20} />
                  ) : (
                    ""
                  )}
                </StyledTableCell>
              </StyledTableRow>
            </tbody>
          </table>
        </div>
      );
    }

    const { row, level, isExpanded } = item;
    const rowId = row[rowKey] || row.id || row._id;
    const isSelected = selected.indexOf(rowId) !== -1;
    const isUser = row.types === "user" || row.type === "file";


    const handleToggleExpand = async () => {
      if (!expanded[rowId] && !nodeChildren[rowId]) {
        await loadChildren(rowId, 1, true);
      }
      toggleExpand(rowId);
    };




    const renderIcon = () => {
      switch (row?.type) {
        case "groupFile":
          return <span>Nhóm tài liệu:</span>;
        case "folder":
          return <StyleIconFolder isExpanded={isExpanded} />;
        case "file":
        default:
          return <StyleIconInsertDriveFile />;
      }
    };

    return (
      <div style={style}>
        <table
          className="custom-table-tree-virtual-row-table"
          style={{ width: `calc(100% + ${virtualScrollbarWidth}px)`, borderCollapse: 'collapse' }}
        >
          {rowColGroupEl}
          <tbody>
            <InheritedTableRow selected={isSelected}>
              {!disableCheckbox && (
                <InheritedCheckboxHeaderCell>
                  <Checkbox
                    checked={isSelected}
                    data-row-id={rowId}
                    onClick={handleCheckboxClick}
                  />
                </InheritedCheckboxHeaderCell>
              )}

              {/* Removed separate TreeTableWithIconCell */}

              {columns?.map((column) => (
                <InheritedTableCell
                  key={`${rowId}-${column.row}`}
                  styleWidth={
                    isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width
                  }
                  styleTextAlign={column.align || "left"}
                  stylePosition="relative"
                  styleZIndex={0}
                  styledColor={isUser ? "primary" : "inherit"}
                  hideBorderBottom={column.row === 'receive'}
                >
                  {column.isIcon ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "fit-content", paddingLeft: `${level * 30 + 10}px` }}>
                      {disableIcon ? null : renderIcon()}
                      <StyleBoxInTableTree 
                        styleWidth="auto"
                        styledColor={isUser ? "primary" : "inherit"}
                      >
                        {column.accessor ? column.accessor(row) : row[column?.row]}
                      </StyleBoxInTableTree>
                      {(row?.type === "folder" || row?.type === "groupFile" || row?.types === "company") && (
                        <TreeTableWithIconToggleButton size="small" onClick={handleToggleExpand}>
                          {nodeChildren[rowId]?.loading && !nodeChildren[rowId]?.children?.length ? (
                            <CircularProgress size={16} />
                          ) : isExpanded ? (
                            <KeyboardArrowUpIcon />
                          ) : (
                            <KeyboardArrowDownIcon />
                          )}
                        </TreeTableWithIconToggleButton>
                      )}
                    </div>
                  ) : (
                    <StyleBoxInTableTree 
                      styleWidth="auto"
                      styledColor={isUser ? "primary" : "inherit"}
                    >
                      {column.accessor ? column.accessor(row) : row[column?.row]}
                    </StyleBoxInTableTree>
                  )}
                </InheritedTableCell>
              ))}

            </InheritedTableRow>
          </tbody>
        </table>
      </div>
    );
  };


  // Auto search with debounce when autoFilter is enabled
  useEffect(() => {
    if (!autoFilter || disableSearch) return;

    const timeoutId = setTimeout(() => {
      handleSearchClick(inputValue);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [autoFilter, disableSearch, inputValue, handleSearchClick]);

  // Hỗ trợ nhấn Enter để tìm kiếm
  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      handleSearchClick(inputValue);
    }
  }, [inputValue, handleSearchClick]);





  return (
    <StyleBoxTittle>
      {!noneTitle && currentPageTitle && (
        <StyleTittleBox>
          <StyleTittleTyprography variant="h5">
            {currentPageTitle}
          </StyleTittleTyprography>
        </StyleTittleBox>
      )}

      <StyledPaper autoHeight={autoHeight} styledMaxHeight={unsetStyledMaxHeight || 140}>
        <InheritedToolbar>
          <InheritedToolbarContent>
            {!disableSearch && (
              <InheritedSearchContainer>
                <CustomInput
                  variant="outlined"
                  size="small"
                  placeholder="Tìm kiếm thành viên..."
                  value={inputValue}
                  onChange={handleSearchFilter}
                  onKeyDown={handleSearchKeyDown}
                  fullWidth
                />
              </InheritedSearchContainer>
            )}
          </InheritedToolbarContent>
        </InheritedToolbar>

        <StyledTableContainer ref={tableContainerRef}>
          {isLoading && (
            <StyledLoadingPopupSignDigital>
              <CircularProgress />
            </StyledLoadingPopupSignDigital>
          )}
          <StyledTable styleTableLayout="fixed" styleBorderCollapse="collapse">
            {headerColGroupEl}
            {!disableHeaderTable && (
              <StyledTableHead>
                <InheritedTableRow>
                  {!disableCheckbox && (
                    <InheritedCheckboxHeaderCell>
                      {!disableHeaderTable && (
                        <Checkbox
                          indeterminate={
                            selected.length > 0 && selected.length < data.length
                          }
                          checked={
                            data.length > 0 && selected.length === data.length
                          }
                          onChange={handleSelectAllClick}
                        />
                      )}
                    </InheritedCheckboxHeaderCell>
                  )}

                  {/* Header cell cho cột expand button */}
                  {/* Removed separate toggle column header */}

                  {columns?.map((column) => (
                    <InheritedTableCell
                      key={column.row}
                      styleWidth={
                        isSmallScreen && column.mobileWidth
                          ? column.mobileWidth
                          : column.width
                      }
                      hideBorderBottom={column.row === 'receive'}
                    >
                      <HeaderCellContainer align={column.align || "left"}>
                        {column.name}
                      </HeaderCellContainer>
                    </InheritedTableCell>
                  ))}

                  {!disableAction && (
                    <InheritedTableCellActions 
                      index={0}
                    >
                      {!isSmallScreen && <span>Hành động</span>}
                    </InheritedTableCellActions>
                  )}
                </InheritedTableRow>
              </StyledTableHead>
            )}
            <SkyTableBody>
              {flatRows.length === 0 && !isParentLoading ? (
                <StyledTableRow>
                  <StyledTableCell colSpan={totalColumns} align="center" styleTextAlign>
                    Không có dữ liệu
                  </StyledTableCell>
                </StyledTableRow>
              ) : (
                <StyledTableRow disableHover>
                  <StyledTableCellLoadMore colSpan={totalColumns}>
                    {autoHeight ? (
                      <div
                        ref={virtualListWrapperRef}
                        className="custom-table-tree-virtual-list-wrapper auto-height"
                        style={{ height: "420px" }}
                      >
                        <List
                          rowCount={flatRows.length}
                          rowHeight={getVirtualRowHeight}
                          rowComponent={VirtualRow}
                          rowProps={{ flatRows }}
                          onRowsRendered={handleVirtualRowsRendered}
                        />
                      </div>
                    ) : (
                      <div
                        ref={virtualListWrapperRef}
                        className="custom-table-tree-virtual-list-wrapper"
                        style={{ height: "420px" }}
                      >
                        <List
                          rowCount={flatRows.length}
                          rowHeight={getVirtualRowHeight}
                          rowComponent={VirtualRow}
                          rowProps={{ flatRows }}
                          onRowsRendered={handleVirtualRowsRendered}
                        />
                      </div>
                    )}
                  </StyledTableCellLoadMore>
                </StyledTableRow>
              )}
            </SkyTableBody>
          </StyledTable>
        </StyledTableContainer>


        {children}
      </StyledPaper>
    </StyleBoxTittle>
  );
};

CustomTableTreeLoadmore.propTypes = {
  children: PropTypes.node,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  filter: PropTypes.string,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      row: PropTypes.string.isRequired,
    })
  ),
  fetchData: PropTypes.func,
  fetchChildren: PropTypes.func,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onView: PropTypes.func,
  optionMore: PropTypes.func,

  disableCheckbox: PropTypes.bool,
  disableHeaderTable: PropTypes.bool,
  disableEdit: PropTypes.bool,
  disableDetail: PropTypes.bool,
  disableDelete: PropTypes.bool,
  disableMore: PropTypes.bool,
  disableAdd: PropTypes.bool,
  disableSynchronize: PropTypes.bool,
  reload: PropTypes.bool,
  disableAction: PropTypes.bool,
  disablePagination: PropTypes.bool,
  onSelectRow: PropTypes.func,
  disableSearch: PropTypes.bool,
  autoFilter: PropTypes.bool,
  noneTitle: PropTypes.bool,
  disableIcon: PropTypes.bool,
};

export default CustomTableTreeLoadmore;
