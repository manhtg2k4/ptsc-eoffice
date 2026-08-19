import React, { useCallback, useContext, useEffect, useState, useMemo } from "react";
import {
  TableBody,
  Box,
  FormControlLabel,
  Checkbox,
  ClickAwayListener,
  Tooltip,
  MenuItem,
  useTheme,
  useMediaQuery,
  Popover,
  IconButton,
  Skeleton,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  Add,
  DeleteOutline,
  Menu as MenuIcon,
  RemoveRedEyeOutlined,
  DeleteOutlineOutlined,
  LoopOutlined,
  AddBoxOutlined,
  PersonAddAlt1Outlined,
  Settings as SettingsIcon,
  GetApp as GetAppIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from "@mui/icons-material";
import {
  API_CONFIG_TABLE,
} from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import PropTypes from "prop-types";
import {
  FilterBox,
  HeaderCellContainer,
  StyledFilterButton,
  StyledPaper,
  StyledSearchButton,
  StyledSearchField,
  StyledTable,
  StyledTableCell,
  StyledTableCellActions,
  SearchContainer,
  StyledTableContainer,
  StyledTableHead,
  ActionIconButton,
  ActionsContainer,
  ActionsBox,
  SynchronizeButton,
  StyledTableRow,
  StyledToolbar,
  DeleteSelectedButton,
  AddButton,
  ToolbarContent,
  StyleBoxInTableTree,
  PopoverContainer,
  ActionsContainerFooter,
  PaginationStack,
  RowsPerPageBox,
  PaginationWrapper,
  PaginationContainerStyled,
  StyleIcon,
  StyleIconArrow,
  StyleDropDown,
  StyleBoxActionDropDown,
  StyleActionCheckBox,
  StyleActionCellCheckBox,
  StyleActionButton,
  StyleActionButtonCancel,
  StyleActionButtonApply,
  StylePageButton,
  StylePageDots,
  StyleActionPage,
  ExportButton,
  ConfigButton,
} from "@styles/CustomTable.styles";
import {
  TreeTableCell,
  NodeName,
  PaginationContainer,
  StyledPagination,
  RowsPerPageSelect,
  TreeToggleWrapper,
  TreeToggleButton,
  StyledCollapseIcon,
  TreeCheckbox,
  FlagIcon,
  StyledPopoverActionButton,
  StyledExpandIcon,
  TreeRowBoxLevel,
  SkeletonLoadingBox,
} from "@styles/CustomTableTree.styles";
import { styled } from "@mui/material/styles";

const ConfigFilterBox = styled(FilterBox)({
  position: "static",
  boxShadow: "none",
});

const HeaderSpacer = styled('div')({
  width: 24,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: '4px'
});

const HeaderLabel = styled('span')({
  fontWeight: 'bold'
});

const TreeSkeleton = styled(Skeleton, {
  shouldForwardProp: (prop) => !['w', 'h'].includes(prop)
})(({ w, h }) => ({
  width: w || '100%',
  height: h || '25px'
}));

const LoadMoreBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$level',
})(({ theme, $level }) => ({
  marginLeft: ($level * 16 + 16) + 'px',
  padding: theme.spacing(1),
}));

const LoadMoreChildButton = ({ parentId, currentCount, total, level, onLoadMore }) => {
  const nextStep = Math.floor(currentCount / 100) + 1;
  const handleClick = useCallback(() => {
    onLoadMore(parentId, nextStep);
  }, [onLoadMore, parentId, nextStep]);

  return (
    <LoadMoreBox $level={level}>
      <Button
        size="small"
        variant="text"
        onClick={handleClick}
        startIcon={<Add />}
      >
        Xem thêm ({total - currentCount} công việc con)
      </Button>
    </LoadMoreBox>
  );
};

const LoadMoreButtonRoot = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1, 0),
}));
import "./CustomCss.css";
import { useToast } from "../common/ToastProvider";
import { clearWidthSpace } from "@utils/Common/Common";
import { AuthContext } from "../../AuthContext/AuthProvider";
import { find } from "lodash";
import TuneIcon from "@builder-table/components/TuneIcon";
import { useSelector } from "react-redux";
import { StyleBoxTittle, StyleTittleBox, StyleTittleTyprography } from "@builder-table/components/SearchSection.styles";

// Helper functions cho pagination
    const createPageButton = (pageNumber, currentPage, handlePageChange) => {
      const isActive = currentPage === pageNumber;
      
      const handleClick = function() {
        handlePageChange(null, pageNumber);
      };
      
      return (
        <StylePageButton
          key={pageNumber}
          size="small"
          onClick={handleClick}
          isActive={isActive}
        >
          {pageNumber}
        </StylePageButton>
      );
    };

    const createPageDots = (key) => {
      return <StylePageDots key={key}>...</StylePageDots>;
    };

    const generatePaginationPages = (page, totalPages, handlePageChange) => {
      const pages = [];
      const currentPage = page + 1;

      if (totalPages === 0) return pages;

      pages.push(createPageButton(1, currentPage, handlePageChange));

      if (totalPages === 1) return pages;

      if (currentPage > 4) {
        pages.push(createPageDots('dots-start'));
      }

      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        endPage = Math.min(totalPages - 1, 4);
      }
      
      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(createPageButton(i, currentPage, handlePageChange));
      }

      if (currentPage < totalPages - 2 && totalPages > 5) {
        pages.push(createPageDots('dots-end'));
      }

      if (totalPages > 1) {
        pages.push(createPageButton(totalPages, currentPage, handlePageChange));
      }

      return pages;
    };

const CustomTableTree = ({
  children,
  data: dataProp = [],
  fetchData,
  filter,
  dataColumn: columns = [],
  onAdd,
  onDelete,
  onView,
  onAddChild,
  onAssign,
  // onApprove,
  // onSearch,
  // latestUpdatedId,
  fetchChildren, // ✅ Mới: Hàm fetch con
  lazyLoad = false, // ✅ Mới: Flag bật/tắt lazy loading
  disableCheckbox = false,
  disableDetail = false,
  disableDelete = false,
  disableMore = false,
  disableAdd = false,
  disableSynchronize = false,
  disableTitle = false,
  isInsideDialog = false,
  autoHeight = false,
  optionMore,
  reload,
  renderAfterSearch,
  onExport,
  enableViewConfig,
  codeModule,
}) => {
  const [selected, setSelected] = useState([]);
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle);
  // Biến xác định có đang tìm kiếm không
  const [searchText, setSearchText] = useState("");
  // const isSearching = searchText && searchText.trim() !== "";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState([
    25, 50, 100, 500,
  ]);
  const [openFilter, setOpenFilter] = useState(false);
  const firstSortWithCode = columns?.[0]?.row;
  const [order] = useState("asc");
  const [orderBy] = useState(firstSortWithCode);
  const [selectedColumns, setSelectedColumns] = useState(
    filter?.map((col) => col.name)
  );
  const [data, setData] = useState(dataProp); // Dữ liệu từ API
  const [total, setTotal] = useState(dataProp.length); // Tổng số bản ghi từ API
  
  // ✅ Đồng bộ dũ liệu từ props vào state nội bộ
  useEffect(() => {
    setData(dataProp || []);
    setTotal(dataProp?.length || 0);
  }, [dataProp]);
  const allIds = useMemo(() => data.map(item => item.id || item._id), [data]);
  const isAllSelected = useMemo(() => data.length > 0 && allIds.every(id => selected.includes(id)), [selected, allIds, data.length]);
  const isIndeterminate = useMemo(() => selected.length > 0 && !isAllSelected, [selected.length, isAllSelected]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(allIds);
    } else {
      setSelected([]);
    }
  };
  
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [configAnchorEl, setConfigAnchorEl] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const initial = [];
    columns.forEach(col => {
      if (col.isShow !== false) {
        initial.push(col.key || col.row);
      }
    });
    // Ensure tree_name is in initial if it's in columns and isShow is true
    // If not in columns, we might default it to visible
    if (!columns.some(c => c.key === "tree_name") || columns.find(c => c.key === "tree_name")?.isShow !== false) {
       if (!initial.includes("tree_name")) initial.unshift("tree_name");
    }
    return initial;
  });
  const [tempVisibleColumns, setTempVisibleColumns] = useState(visibleColumns);

  const openExport = Boolean(exportAnchorEl);
  const openConfig = Boolean(configAnchorEl);

  const handleOpenExport = (event) => setExportAnchorEl(event.currentTarget);
  const handleCloseExport = () => setExportAnchorEl(null);

  const handleOpenConfig = (event) => {
    setConfigAnchorEl(event.currentTarget);
    setTempVisibleColumns(visibleColumns);
  };
  const handleCloseConfig = () => setConfigAnchorEl(null);

  const handleToggleVisibleColumn = (columnKey) => () => {
    setTempVisibleColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((val) => val !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSelectAllVisibleColumns = (e) => {
    if (e.target.checked) {
      setTempVisibleColumns(["tree_name", ...columns.map(col => col.key || col.row)]);
    } else {
      setTempVisibleColumns([]);
    }
  };

  const handleApplyConfig = async () => {
    setVisibleColumns(tempVisibleColumns);
    
    if (enableViewConfig && codeModule) {
      const updatedColumns = columns.map(col => {
        const isVisible = tempVisibleColumns.includes(col.key || col.row);
        return {
          ...(col.originalField || {}),
          isShow: isVisible,
          showInList: isVisible
        };
      });

      try {
        await axiosInstance.put(API_CONFIG_TABLE, { module: codeModule, columns: updatedColumns });
        
        // Cập nhật localStorage để đồng bộ ngay lập tức
        const viewConfigStr = localStorage.getItem("viewConfig");
        if (viewConfigStr) {
          const viewConfigData = JSON.parse(viewConfigStr);
          const configArray = Array.isArray(viewConfigData) ? viewConfigData : viewConfigData?.data;
          const targetConfig = configArray.find(c => c.code === codeModule);
          if (targetConfig) {
            targetConfig.field = updatedColumns;
            localStorage.setItem("viewConfig", JSON.stringify(viewConfigData));
          }
        }
        
        toast("Cấu hình bảng đã được lưu!", "success");
      } catch (error) {
        toast("Không thể lưu cấu hình bảng", "error");
      }
    }
    handleCloseConfig();
  };

  const handleExportClick = (format) => () => {
    if (onExport) onExport(format);
    handleCloseExport();
  };

  const activeColumns = useMemo(() => {
    return columns.filter(col => col.key !== "tree_name" && visibleColumns.includes(col.key || col.row));
  }, [columns, visibleColumns]);
  
  const toast = useToast();
  const { systemParams } = useContext(AuthContext);
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [tempSelectedColumns, setTempSelectedColumns] = useState(selectedColumns);
  useEffect(() => {
    if (systemParams?.data) {
      // Tìm cấu hình cho pagination từ systemParams
      const paginationConfig = find(systemParams.data, { type: "pagination" });

      if (paginationConfig && paginationConfig.value) {
        // Chuyển đổi chuỗi giá trị (ví dụ: "25,50,100") thành mảng số
        const options = String(paginationConfig.value)
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0); // Lọc các giá trị hợp lệ

        if (options.length > 0) {
          setRowsPerPageOptions(options);

          // Kiểm tra xem giá trị rowsPerPage hiện tại có trong danh sách options mới không
          if (!options.includes(rowsPerPage)) {
            // Nếu không, cập nhật nó thành giá trị đầu tiên trong options
            setRowsPerPage(options[0]);
            setPage(0); // Reset về trang đầu
          }
        }
      }
    }
  }, [systemParams, rowsPerPage]);

  // Gọi hàm fetchData từ prop khi page hoặc rowsPerPage thay đổi
  // Hàm gọi fetchData chung
  const fetchTableData = useCallback((query = "", code = [], sort, isAppend = false) => {
    if (fetchData) {
      const targetPage = isAppend ? page + 2 : page + 1; 
      fetchData({
        page: targetPage,
        limit: rowsPerPage,
        query,
        code,
        sort,
      })
        .then((result) => {
          const newData = result.data || [];
          if (isAppend) {
            setData((prev) => [...prev, ...newData]);
            setPage((prev) => prev + 1);
          } else {
            setData(newData);
            setPage(0);
          }
          setTotal(result.total || 0);
        })
        .catch((error) => {
          toast("Có lỗi khi gọi dữ liệu!", error);
          // logger.log("Error fetching data:", error);
        });
    }
  }, [fetchData, page, rowsPerPage, toast]);

  const handleLoadMoreRoots = () => {
    if (data.length < total) {
      const sort = orderBy
        ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
        : JSON.stringify({ [firstSortWithCode]: order === "asc" ? 1 : -1 });

      const codeValues = filter
        ?.filter((col) => selectedColumns.includes(col.name))
        .map((col) => col.code);

      fetchTableData(searchText, codeValues, sort, true);
    }
  };

  // Gọi fetchData khi searchText, filter, hoặc reload thay đổi
  useEffect(() => {
    setPage(0);
  }, [searchText, filter, rowsPerPage]);

  useEffect(() => {
    const sort = orderBy
      ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
      : JSON.stringify({ [firstSortWithCode]: order === "asc" ? 1 : -1 });

    const codeValues = filter
      ?.filter((col) => selectedColumns.includes(col.name))
      .map((col) => col.code);

    fetchTableData(searchText, codeValues, sort);
  }, [fetchTableData, searchText, filter, selectedColumns, orderBy, order, firstSortWithCode, reload, page, rowsPerPage]);

  // Đồng bộ selected với data
  useEffect(() => {
    if (!data || data.length === 0) {
      if (selected.length > 0) {
        // Chỉ reset nếu selected không rỗng
        setSelected([]);
      }
      return;
    }

    const validSelected = selected.filter((id) =>
      data.some((row) => row._id === id || row.id === id)
    );
    if (validSelected.length !== selected.length) {
      setSelected(validSelected);
    }
  }, [data, selected]);

  // Xử lý tìm kiếm
  const handleSearchClick = (query, code) => {
    const sort = orderBy
      ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
      : JSON.stringify({ [firstSortWithCode]: order === "asc" ? 1 : -1 });
    fetchTableData(query, code, sort);
    setPage(0); // Reset về trang 1 khi tìm kiếm
  };
  const totalPages = Math.ceil(total / rowsPerPage);
  //
  const handleSearchFilter = (e) => {
    const inputValue = e.target.value;
    const normalized = inputValue.normalize("NFC");

    // Regex chặn ký tự đặc biệt cụ thể, KHÔNG chặn tiếng Việt
    const forbiddenCharsRegex = /[~!@#$%^*.,`]/;
    if (forbiddenCharsRegex.test(normalized)) {
      e.preventDefault(); // Không cho nhập
      return;
    }

    setSearchText(clearWidthSpace(inputValue).trimStart());
  };

  // const handleSort = (column) => {
  //   const matchedColumns = filter?.filter((col) =>
  //     selectedColumns.includes(col.name)
  //   );
  //   const codeValues = matchedColumns.map((col) => col.code);
  //   const isCurrentColumn = orderBy === column;
  //   const newOrder = isCurrentColumn
  //     ? order === "asc"
  //       ? "desc"
  //       : "asc"
  //     : "asc";
  //   const sort = orderBy
  //     ? JSON.stringify({ [column]: newOrder === "asc" ? 1 : -1 })
  //     : JSON.stringify({ [firstSortWithCode]: newOrder === "asc" ? 1 : -1 });
  //   fetchTableData(searchText, codeValues, sort); //Hàm để vừa tìm kiếm vừa sắp xếp đc
  //   // fetchTableData("", [], sort)
  //   setOrder(newOrder);
  //   setOrderBy(column);
  // };


  const [expanded, setExpanded] = useState({});
  const [nodeChildren, setNodeChildren] = useState({}); // ✅ State lưu con của từng parent
  const [nodeTotal, setNodeTotal] = useState({}); // ✅ State lưu tổng số con của từng parent
  const [childLoading, setChildLoading] = useState({}); // ✅ State lưu trạng thái loading của từng node con

  // Reset nodeChildren khi reload trigger
  useEffect(() => {
    if (reload !== undefined) {
      setNodeChildren({});
      setNodeTotal({});
    }
  }, [reload, fetchData]);

  // ✅ Hàm load con (lazy load)
  const handleLoadMoreChildren = useCallback(
    async (parentId, pageNum = 1) => {
      if (!fetchChildren) return;

      setChildLoading((prev) => ({ ...prev, [parentId]: true }));
      try {
        const limit = 100;
        const res = await fetchChildren(parentId, pageNum, limit);
        const newChildren = res?.data || res || [];
        const total = res?.total || (res?.data ? res.data.length : (res.length || 0));

        setNodeTotal((prev) => ({ ...prev, [parentId]: total }));
        setNodeChildren((prev) => ({
          ...prev,
          [parentId]:
            pageNum === 1
              ? newChildren
              : [...(prev[parentId] || []), ...newChildren],
        }));
      } catch (e) {
        toast("Lỗi khi tải dữ liệu con!", "error");
      } finally {
        setChildLoading((prev) => ({ ...prev, [parentId]: false }));
      }
    },
    [fetchChildren, toast]
  );

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleClick = useCallback((event, rowId) => {
    setAnchorEl(event.currentTarget);
    setOpenPopoverId(rowId);
  }, []);
  const createRowHandlers = useCallback(
    (row) => {
      const rowId = row.id || row._id;
      return {
        onPopoverClick: (e) => handleClick(e, rowId, row),
      };
    },
    [handleClick]
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setOpenPopoverId(null);
  }, []);

  const handlePopoverItemClick = useCallback(
    (item) => () => {
      if (item.onClick) {
        item.onClick(); 
      }
      handleClose();
    },
    [handleClose]
  );

  const handleSelectRows = (id) => (e) => {
    const isChecked = e.target.checked;
    setSelected((prev) => 
      isChecked ? [...prev, id] : prev.filter(item => item !== id)
    );
  };

  // Hàm render cây, có xử lý các node "mồ côi"
  const renderRows = (nodes, level = 0, parentRow = null) => {
    const parentId = parentRow ? (parentRow.id || parentRow._id) : null;
    
    const rendered = nodes.map((row, index) => {
      const rowId = row.id || row._id;
      const isExpanded = expanded[rowId];
      const isLoading = childLoading[rowId];

      const childNodes = lazyLoad
        ? nodeChildren[rowId] || []
        : data.filter((item) => {
            const itemParentId = item?.parent?._id || item?.parent;
            const currentRowId = row?._id || row?.id;
            return (
              itemParentId &&
              currentRowId &&
              String(itemParentId) === String(currentRowId) &&
              String(item?._id || item?.id) !== String(currentRowId)
            );
          });

      // ✅ Kiểm tra hasChildren: Nếu lazyLoad dùng flag từ backend, ngược lại check độ dài list con
      const hasChildren = lazyLoad
        ? Boolean(row?.flags?.hasChildren || row?.hasChildren)
        : childNodes.length > 0;

      const itemParentIdForOrphan = row?.parent?._id || row?.parent;
      if (
        level === 0 &&
        itemParentIdForOrphan &&
        !data.some(
          (d) => String(d?._id || d?.id) === String(itemParentIdForOrphan)
        )
      ) {
        // Bỏ qua không render ở đây, vì nó sẽ được render trong vòng lặp "mồ côi"
        return null;
      }

      const handlers = createRowHandlers(row);
      const handleToggleExpand = async () => {
        // ✅ Nếu là lazyLoad và chưa có dữ liệu con, thực hiện call API
        if (
          lazyLoad &&
          !isExpanded &&
          (!nodeChildren[rowId] || nodeChildren[rowId].length === 0)
        ) {
          await handleLoadMoreChildren(rowId, 1);
        }
        toggleExpand(rowId);
      };
      const isPopoverOpen = openPopoverId === rowId && Boolean(anchorEl);
      // Trả về hàm onClick cho từng row
      const handleView = (rowId) => () => {
        onView(rowId);
      };

      const handleDelete = (rowId) => () => {
        onDelete([rowId]);
      };

      return (
        <React.Fragment key={row?._id}>
          <StyledTableRow index={index}>
            {visibleColumns.includes("tree_name") && (
              <TreeTableCell $level={level}>
                <TreeRowBoxLevel>
                  {/* Nút mở rộng nếu có con */}
                  <TreeToggleWrapper>
                    {hasChildren && (
                      <TreeToggleButton size="small" onClick={handleToggleExpand}>
                        {isLoading ? (
                           <CircularProgress size={16} />
                        ) : (
                           isExpanded ? <StyledCollapseIcon /> : <StyledExpandIcon />
                        )}
                      </TreeToggleButton>
                    )}
                  </TreeToggleWrapper>

                  {/* Checkbox */}
                  {!disableCheckbox && (
                      <TreeCheckbox
                          size="small"
                          checked={selected.includes(rowId)}
                          onChange={handleSelectRows(rowId)}
                      />
                  )}

                  {/* Flag Icon */}
                  <FlagIcon 
                    priority={row?.priority} 
                    iscompleted={(row?.progress === 100).toString()} 
                  />

                  {/* Tên node */}
                  <NodeName onClick={handleToggleExpand}>{row?.name}</NodeName>
                </TreeRowBoxLevel>
              </TreeTableCell>
            )}

            {/* Các cột khác */}
            {activeColumns.map((column) => (
              <StyledTableCell
                key={column.key || column.row}
                styleWidth={isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width}
                styleMinWidth={column.minWidth}
                stylePosition="relative"
                styleZIndex={0}
                align={
                  (column.name || column.label || column.title)
                    ?.toLowerCase()
                    .includes("trạng thái") ||
                  (column.name || column.label || column.title)
                    ?.toLowerCase()
                    .includes("tình trạng") ||
                  (column.name || column.label || column.title)
                    ?.toLowerCase()
                    .includes("hành động")
                    ? column.margin || "center"
                    : "left"
                }
              >
                <StyleBoxInTableTree>
                  {column.accessor ? column.accessor(row) : row[column?.row]}
                </StyleBoxInTableTree>
              </StyledTableCell>
            ))}

            <StyledTableCellActions index={index} isAction>
              {/* {!disableEdit && (
                                <Tooltip title="Chỉnh sửa">
                                    <ActionIconButton onClick={handleEdit(row._id)}>
                                        <EditOutlined />
                                    </ActionIconButton>
                                </Tooltip>
                            )}
                            {!disableDetail && row.dynamicMenu && (
                                <Tooltip title="Xem chi tiết">
                                    <ActionIconButton onClick={handleView(row._id)}>
                                        <RemoveRedEyeOutlined />
                                    </ActionIconButton>
                                </Tooltip>
                            )}
                            {!disableDelete && row.dynamicMenu && (
                                <Tooltip title="Xóa">
                                    <ActionIconButton colorType="error" onClick={handleDelete(row._id)}>
                                        <DeleteOutlineOutlined />
                                    </ActionIconButton>
                                </Tooltip>
                            )}
                            {!disableMore && (
                                <Tooltip title="Thêm tùy chọn">
                                    <ActionIconButton>
                                        <MoreVertIcon />
                                    </ActionIconButton>
                                </Tooltip>
                            )} */}
              {(() => {
                const items = [];
                if (onAddChild) {
                  items.push({
                    key: "add-child",
                    title: "Tạo công việc con",
                    icon: <AddBoxOutlined />,
                    onClick: () => onAddChild(rowId, row.name),
                  });
                }

                if (onAssign) {
                  items.push({
                    key: "assign",
                    title: "Giao việc",
                    icon: <PersonAddAlt1Outlined />,
                    onClick: () => onAssign(rowId),
                  });
                }

                // items.push({
                //   key: "approve",
                //   title: "Phê duyệt",
                //   icon: <CheckCircleOutline />,
                //   onClick: () => onApprove && onApprove(rowId),
                // });

                if (!disableDetail) {
                  items.push({
                    key: "view",
                    title: "Xem chi tiết",
                    icon: <RemoveRedEyeOutlined />,
                    onClick: handleView(rowId),
                  });
                }

                if (!disableDelete) {
                  items.push({
                    key: "delete",
                    title: "Xóa công việc",
                    icon: <DeleteOutlineOutlined />,
                    onClick: handleDelete(rowId),
                    colorType: "error",
                  });
                }

                // append optionMore custom items
                if (!disableMore && optionMore?.length > 0) {
                  optionMore.forEach((it, i) => {
                    items.push({
                      key: `opt-${i}`,
                      title: it.title,
                      icon: it.icon ? React.createElement(it.icon) : undefined,
                      onClick: () =>
                        handlePopoverOptionClick(it.onClick, rowId),
                    });
                  });
                }
                return (
                  <>
                    <Tooltip title="Thêm tùy chọn">
                      <ActionIconButton onClick={handlers.onPopoverClick}>
                        <MenuIcon />
                      </ActionIconButton>
                    </Tooltip>

                    <Popover
                      id={`popover-${rowId}`}
                      open={isPopoverOpen}
                      anchorEl={anchorEl}
                      onClose={handleClose}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                    >
                      <PopoverContainer>
                        {items.map((it) => (
                          <StyledPopoverActionButton
                            key={it.key}
                            fullWidth
                            startIcon={it.icon}
                            onClick={handlePopoverItemClick(it)}
                            colortype={it.colorType}
                          >
                            {it.title}
                          </StyledPopoverActionButton>
                        ))}
                      </PopoverContainer>
                    </Popover>
                  </>
                );
              })()}
            </StyledTableCellActions>
          </StyledTableRow>

          {/* Render node con nếu đang mở */}
          {isExpanded && renderRows(childNodes, level + 1, row)}

          {/* Skeleton loading cho node con */}
          {isExpanded && isLoading && (
            <StyledTableRow>
              <TreeTableCell $level={level + 1} colSpan={activeColumns.length + 2}>
                <SkeletonLoadingBox>
                   <TreeSkeleton variant="rectangular" w={20} h={20} />
                   <TreeSkeleton variant="text" w="60%" h={25} />
                </SkeletonLoadingBox>
              </TreeTableCell>
            </StyledTableRow>
          )}
        </React.Fragment>
      );
    });

    // ✅ Nút "Xem thêm" cho con nếu lazyLoad và còn dữ liệu
    if (lazyLoad && parentId && nodeChildren[parentId]) {
      const currentCount = nodeChildren[parentId].length;
      const total = nodeTotal[parentId] || 0;
      if (currentCount < total) {
         rendered.push(
           <StyledTableRow key={`load-more-${parentId}`}>
             <TreeTableCell $level={level} colSpan={activeColumns.length + 2}>
                <LoadMoreChildButton 
                  parentId={parentId}
                  currentCount={currentCount}
                  total={total}
                  level={level}
                  onLoadMore={handleLoadMoreChildren}
                />
             </TreeTableCell>
           </StyledTableRow>
         );
      }
    }

    return rendered;
  };

  // Click ra ngoài để đóng filter
  const handleClickAway = () => {
    setOpenFilter(false);
  };

  // Toggle mở/đóng filter
  const handleToggleFilter = () => {
    setOpenFilter((prev) => !prev);
  };

  // Checkbox toggle từng cột
  const handleToggleColumn = (columnName) => () => {
    setTempSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((val) => val !== columnName)
        : [...prev, columnName]
    );
  };

  const handleSearchButtonClick = () => {
    const matchedColumns = filter?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns?.map((col) => col.code);
    handleSearchClick(searchText, codeValues);
  };

  const handleClickDelete = () => {
    onDelete(selected);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage - 1); // Pagination Material-UI là 1-based, state là 0-based
  };

  const handleRowsPerPageChange = (event) => {
    const newValue = parseInt(event.target.value, 10);
    setRowsPerPage(newValue);
    setPage(0); // reset page về 0 khi đổi rowsPerPage
  };

  const handlePopoverOptionClick = useCallback((onClick, rowId) => {
    onClick(rowId);
  }, []);

  const handlePrevPageClick = (e) => {
    handlePageChange(e, page);
  };

  const handleNextPageClick = (e) => {
    handlePageChange(e, page + 2);
  };

  const handleSelectAllColumns = (e) => {
  if (e.target.checked) {
    setTempSelectedColumns(filter?.map((col) => col.name) || []);
  } else {
    setTempSelectedColumns([]);
  }
};

const handleApplyFilter = () => {
  setSelectedColumns(tempSelectedColumns); // Áp dụng thay đổi
  handleSearchButtonClick(); // Tìm kiếm lại
  handleClickAway(); // Đóng dropdown
};
  return (
   <StyleBoxTittle>
     {/* ✅ TITLE - DÒNG RIÊNG */}
          {currentPageTitle && !disableTitle && (
            <StyleTittleBox>
              <StyleTittleTyprography
                variant="h5" >
                {currentPageTitle}
              </StyleTittleTyprography>
            </StyleTittleBox>
          )}
      <StyledPaper isInsideDialog={isInsideDialog} autoHeight={autoHeight}>
      <StyledToolbar>
        <ToolbarContent>
          <SearchContainer>
            <StyledSearchField
              variant="outlined"
              size="small"
              placeholder="Tìm kiếm..."
              value={searchText}
              onChange={handleSearchFilter}
            />

            {/* <ClickAwayListener onClickAway={() => setOpenFilter(false)}> */}
            <ClickAwayListener onClickAway={handleClickAway}>
              <Box>
                {/* <StyledFilterButton
                                    onClick={() => setOpenFilter((prev) => !prev)}
                                > */}
                <StyledFilterButton onClick={handleToggleFilter}>
                  <TuneIcon/>
                </StyledFilterButton>
                {openFilter && (
                   <FilterBox>
                    {/* Header */}
                    <StyleBoxActionDropDown>
                      <span>Lọc tìm kiếm</span>
                      <Search />
                    </StyleBoxActionDropDown>

                    {/* Checkbox "Tất cả" */}
                    <StyleActionCheckBox>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={tempSelectedColumns?.length === filter?.length}
                            indeterminate={
                              tempSelectedColumns?.length > 0 &&
                              tempSelectedColumns?.length < filter?.length
                            }
                            onChange={handleSelectAllColumns}
                            size="small"
                          />
                        }
                        label="Tất cả"
                      />
                    </StyleActionCheckBox>

                    {/* Grid 3 cột cho các checkbox */}
                    <StyleActionCellCheckBox>
                      {filter?.map((column) => (
                        <FormControlLabel
                          key={column.code}
                          control={
                            <Checkbox
                              checked={tempSelectedColumns.includes(column.name)}
                              onChange={handleToggleColumn(column.name)}
                              size="small"
                            />
                          }
                          label={column.name}
                        />
                      ))}
                    </StyleActionCellCheckBox>

                    {/* Nút Hủy và Áp dụng */}
                    <StyleActionButton>
                      <StyleActionButtonCancel
                        onClick={handleClickAway}
                      >
                        Hủy
                      </StyleActionButtonCancel>
                      <StyleActionButtonApply
                        variant="contained"
                        onClick={handleApplyFilter}
                      >
                        Áp dụng
                      </StyleActionButtonApply>
                    </StyleActionButton>
                  </FilterBox>
                )}
              </Box>
            </ClickAwayListener>
          </SearchContainer>

          {/* Nút tìm kiếm */}
          {/* <StyledSearchButton
                        onClick={() => {
                            const matchedColumns = filter?.filter((col) =>
                                selectedColumns.includes(col.name)
                            );
                            const codeValues = matchedColumns.map((col) => col.code);
                            handleSearchClick(searchText, codeValues);
                        }}
                    > */}
          <StyledSearchButton onClick={handleSearchButtonClick}>
            <Tooltip title="Tìm kiếm">
              <Search />
            </Tooltip>
          </StyledSearchButton>

          {renderAfterSearch && renderAfterSearch()}
        </ToolbarContent>

        <ActionsContainer>
          <ActionsBox>
            {selected.length > 0 && !disableCheckbox && !disableDelete && (
              <DeleteSelectedButton onClick={handleClickDelete}>
                <Tooltip title="Xóa">
                  <DeleteOutline />
                </Tooltip>
              </DeleteSelectedButton>
            )}
            {!disableAdd && (
              <AddButton onClick={onAdd}>
                <Tooltip title="Thêm mới">
                  <Add />
                </Tooltip>
              </AddButton>
            )}
            {!disableSynchronize && (
              <SynchronizeButton>
                <Tooltip title="Đồng bộ">
                  <LoopOutlined />
                </Tooltip>
              </SynchronizeButton>
            )}
  
            {/* Nút Xuất */}
            <ExportButton onClick={handleOpenExport}>
              <Tooltip title="Xuất">
                <GetAppIcon />
              </Tooltip>
            </ExportButton>
            <Popover
              open={openExport}
              anchorEl={exportAnchorEl}
              onClose={handleCloseExport}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <PopoverContainer>
                <StyledPopoverActionButton 
                  fullWidth 
                  startIcon={<ExcelIcon />} 
                  onClick={handleExportClick("excel")}
                >
                  Xuất Excel
                </StyledPopoverActionButton>
                <StyledPopoverActionButton 
                  fullWidth 
                  startIcon={<PdfIcon />} 
                  onClick={handleExportClick("pdf")}
                >
                  Xuất PDF
                </StyledPopoverActionButton>
              </PopoverContainer>
            </Popover>
  
            {/* Nút Cấu hình bảng */}
            <ConfigButton onClick={handleOpenConfig}>
              <Tooltip title="Cấu hình bảng">
                <SettingsIcon />
              </Tooltip>
            </ConfigButton>
            <Popover
              open={openConfig}
              anchorEl={configAnchorEl}
              onClose={handleCloseConfig}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <ConfigFilterBox>
                <StyleBoxActionDropDown>
                  <span>Cấu hình bảng</span>
                  <SettingsIcon size="small" />
                </StyleBoxActionDropDown>
  
                <StyleActionCheckBox>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tempVisibleColumns.length === columns.length}
                        indeterminate={
                          tempVisibleColumns.length > 0 &&
                          tempVisibleColumns.length < columns.length
                        }
                        onChange={handleSelectAllVisibleColumns}
                        size="small"
                      />
                    }
                    label="Tất cả"
                  />
                </StyleActionCheckBox>
  
                <StyleActionCellCheckBox>
                  {columns.map((column) => (
                    <FormControlLabel
                      key={column.key || column.row}
                      control={
                        <Checkbox
                          checked={tempVisibleColumns.includes(column.key || column.row)}
                          onChange={handleToggleVisibleColumn(column.key || column.row)}
                          size="small"
                        />
                      }
                      label={column.name}
                    />
                  ))}
                </StyleActionCellCheckBox>
  
                <StyleActionButton>
                  <StyleActionButtonCancel onClick={handleCloseConfig}>
                    Hủy
                  </StyleActionButtonCancel>
                  <StyleActionButtonApply variant="contained" onClick={handleApplyConfig}>
                    Áp dụng
                  </StyleActionButtonApply>
                </StyleActionButton>
              </ConfigFilterBox>
            </Popover>
          </ActionsBox>
        </ActionsContainer>
      </StyledToolbar>

      <StyledTableContainer>
        <StyledTable>
          <StyledTableHead>
            <StyledTableRow>
              {visibleColumns.includes("tree_name") && (
                <StyledTableCell stylePadding="0px 16px 0px 20px">
                  <TreeRowBoxLevel>
                    <TreeToggleWrapper />
                    {!disableCheckbox && (
                      <TreeCheckbox
                        size="small"
                        checked={isAllSelected}
                        indeterminate={isIndeterminate}
                        onChange={handleSelectAll}
                      />
                    )}
                    <HeaderSpacer>
                      {/* Spacer for Flag icon */}
                    </HeaderSpacer>
                    <HeaderLabel>
                      {columns.find(c => c.key === "tree_name")?.label || "Tên công việc"}
                    </HeaderLabel>
                  </TreeRowBoxLevel>
                </StyledTableCell>
              )}
              {activeColumns.map((column) => {
                const isSpecialColumn =
                  (column.name || column.label || column.title)
                    ?.toLowerCase()
                    .includes("trạng thái") ||
                  (column.name || column.label || column.title)
                    ?.toLowerCase()
                    .includes("tình trạng") ||
                  (column.name || column.label || column.title)
                    ?.toLowerCase()
                    .includes("hành động");
                const columnAlign = isSpecialColumn
                  ? column.margin || "center"
                  : "left";
                return (
                  <StyledTableCell key={column.key || column.row} align={columnAlign} styleWidth={isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width}>
                    <HeaderCellContainer align={columnAlign}>
                      {column.name}
                    </HeaderCellContainer>
                  </StyledTableCell>
                );
              })}
              <StyledTableCellActions index={0}>
                {!isSmallScreen && <span>Hành động</span>}
                {/* <HeaderCellContainer>Hành động</HeaderCellContainer> */}
              </StyledTableCellActions>
            </StyledTableRow>
          </StyledTableHead>

          <TableBody>
            {data.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={activeColumns.length + (visibleColumns.includes("tree_name") ? 1 : 0) + 1} align="center">
                  Không có dữ liệu
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              <>
                {/* Render các node gốc (không có parent) */}
                {renderRows(data.filter((item) => !item.parent))}

                {/* 
                  Render các node "mồ côi" (có parent nhưng parent không nằm trong trang dữ liệu hiện tại).
                  Điều này đảm bảo dữ liệu luôn được hiển thị khi phân trang.
                */}
                {renderRows(
                  data.filter((item) => {
                    const itemParentId = item?.parent?._id || item?.parent;
                    return (
                      itemParentId &&
                      !data.some((d) => String(d._id || d.id) === String(itemParentId))
                    );
                  })
                )}

                {/* ✅ Nút "Tải thêm" cho cấp gốc (Roots) */}
                {lazyLoad && data.length < total && (
                   <StyledTableRow>
                     <StyledTableCell colSpan={activeColumns.length + (visibleColumns.includes("tree_name") ? 1 : 0) + 1} align="center">
                        <LoadMoreButtonRoot 
                          onClick={handleLoadMoreRoots} 
                          variant="outlined" 
                          size="small" 
                        >
                          Tải thêm nội dung... ({total - data.length})
                        </LoadMoreButtonRoot>
                     </StyledTableCell>
                   </StyledTableRow>
                )}
              </>
            )
            }
          </TableBody>
        </StyledTable>
      </StyledTableContainer>
       {!isSmallScreen && (
        <PaginationWrapper>
          <PaginationContainerStyled>
            {/* Tổng số bản ghi */}
            <span>
              Tổng {total} {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, total)} bản ghi
            </span>

            {/* Nút Previous */}
            <IconButton
              size="small"
              onClick={handlePrevPageClick}
              disabled={page === 0}
            >
              <StyleIcon />
            </IconButton>

            {/* Hiển thị các số trang */}
            <StyleActionPage>
              {generatePaginationPages(page, totalPages, handlePageChange)}
            </StyleActionPage>

            {/* Nút Next */}
            <IconButton
              size="small"
              onClick={handleNextPageClick}
              disabled={page >= totalPages - 1}
            >
              <StyleIconArrow />
            </IconButton>

            {/* Dropdown Hiển thị */}
            <StyleDropDown>
              <span>Hiển thị</span>
              <RowsPerPageSelect
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                size="small"
              >
                {rowsPerPageOptions.map(function(option) {
                  return (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  );
                })}
              </RowsPerPageSelect>
            </StyleDropDown>
          </PaginationContainerStyled>
        </PaginationWrapper>
      )}
      {children}
      {isSmallScreen && (
        <ActionsContainerFooter>
          <PaginationContainer>
            {/* <span>{total}</span> */}
            {/* <span>{`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, total)}`}</span> */}
            <PaginationStack>
              <StyledPagination
                count={totalPages}
                page={page + 1}
                onChange={handlePageChange}
                shape="rounded"
                variant="outlined"
                // siblingCount={1}
                // boundaryCount={1}
                showFirstButton={false}
                showLastButton={false}
                siblingCount={0}
                boundaryCount={0}
              />
            </PaginationStack>

            <RowsPerPageBox>
              {!isSmallScreen && <span>Hiển thị</span>}
              <RowsPerPageSelect
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                size="small"
              >
                {rowsPerPageOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </RowsPerPageSelect>
            </RowsPerPageBox>
          </PaginationContainer>
        </ActionsContainerFooter>
      )}
    </StyledPaper>
   </StyleBoxTittle>
  );
};

CustomTableTree.propTypes = {
  children: PropTypes.node, // Có thể là JSX, string, số, v.v.
  data: PropTypes.arrayOf(PropTypes.object).isRequired, // Mảng các object, bắt buộc
  filter: PropTypes.string, // Chuỗi, không bắt buộc
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired, // Bắt buộc có name
      row: PropTypes.string.isRequired, // Bắt buộc có row
    })
  ).isRequired, // Mảng các cột, bắt buộc
  fetchData: PropTypes.func,
  onExport: PropTypes.func,
  onAdd: PropTypes.func, // Hàm, không bắt buộc
  onDelete: PropTypes.func, // Hàm với tham số ID
  onView: PropTypes.func, // Hàm với tham số ID
  onAddChild: PropTypes.func,
  onAssign: PropTypes.func,
  onApprove: PropTypes.func,
  optionMore: PropTypes.func,
  // latestUpdatedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // ID có thể là chuỗi hoặc số

  disableCheckbox: PropTypes.bool,
  disableDetail: PropTypes.bool,
  disableDelete: PropTypes.bool,
  enableViewConfig: PropTypes.bool,
  codeModule: PropTypes.string,
  reload: PropTypes.bool,
  isInsideDialog: PropTypes.bool,
  autoHeight: PropTypes.bool,
};
CustomTableTree.defaultProps = {
  disableCheckbox: false,
  disableDetail: false,
  disableDelete: false,
  disableMore: false,
  disableAdd: false,
  disableSynchronize: false,
  enableViewConfig: false,
  codeModule: "",
};

export default CustomTableTree;
