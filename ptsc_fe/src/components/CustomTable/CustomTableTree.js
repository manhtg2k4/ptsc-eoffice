import React, { useCallback, useContext, useEffect, useState } from "react";
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
  Button,
  IconButton,
} from "@mui/material";
import {
  Search,
  Add,
  DeleteOutline,
  MoreVert as MoreVertIcon,
  RemoveRedEyeOutlined,
  EditOutlined,
  DeleteOutlineOutlined,
  // Remove,
  LoopOutlined,
  KeyboardArrowRight,
  KeyboardArrowDown,
} from "@mui/icons-material";
import PropTypes from "prop-types";
import {
  FilterBox,
  HeaderCellContainer,
  StyledFilterButtonNoBorder,
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
  ModernPaginationLayout,
  ModernPaginationSummary,
  ModernPaginationControls,
  StylePageNavButton,
  SortIconContainer,
  StyledArrowUp,
  StyledArrowDown,
} from "@styles/CustomTable.styles"; // Giữ lại các style chung
import {
  TreeTableCell,
  // VerticalLine,
  // HorizontalLine,
  ToggleButton,
  NodeName,
  TreeSpacer,
  PaginationContainer,
  StyledPagination,
  RowsPerPageSelect,
} from "@styles/CustomTableTree.styles";
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

const HeaderCell = ({ column, isSmallScreen, orderBy, sortOrder, handleSort }) => {
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
  const columnAlign = isSpecialColumn ? column.margin || "center" : "left";

  const handleClick = useCallback(() => {
    handleSort(column.row || column.name);
  }, [column.row, column.name, handleSort]);

  return (
    <StyledTableCell
      align={columnAlign}
      styleWidth={isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width}
      onClick={column.sortable !== false ? handleClick : undefined}
      styleCursor={column.sortable !== false ? "pointer" : "default"}
    >
      <HeaderCellContainer align={columnAlign}>
        {column.name}
        {column.sortable !== false && (
          <SortIconContainer>
            <StyledArrowUp
              isActive={orderBy === (column.row || column.name) && sortOrder === "asc"}
            />
            <StyledArrowDown
              isActive={orderBy === (column.row || column.name) && sortOrder === "desc"}
            />
          </SortIconContainer>
        )}
      </HeaderCellContainer>
    </StyledTableCell>
  );
};

const CustomTable = ({
  children,
  data: dataProp = [],
  fetchData,
  filter,
  columns,
  onAdd,
  onDelete,
  onEdit,
  onView,
  // onSearch,
  // latestUpdatedId,
  disableCheckbox = false,
  disableEdit = false,
  disableDetail = false,
  disableDelete = false,
  disableMore = false,
  disableAdd = false,
  disableSynchronize = false,
  disableTitle = false,
  addButtonLabel = "",
  actionIconSize = "medium",
  useModernActionColors = false,
  useModernPagination = false,
  optionMore,
	reload,
	filterPopupAlignLeft = false,
}) => {
  const [selected, setSelected] = useState([]);
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle);
  // Biến xác định có đang tìm kiếm không
  const [searchText, setSearchText] = useState("");
  // const isSearching = searchText && searchText.trim() !== "";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(500);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState([
    25, 50, 100, 500,
  ]);
  const [openFilter, setOpenFilter] = useState(false);
  const firstSortWithCode = columns[0]?.row;
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState(firstSortWithCode);
  const [selectedColumns, setSelectedColumns] = useState(
    filter?.map((col) => col.name)
  );
  const [data, setData] = useState(dataProp); // Dữ liệu từ API
  const [total, setTotal] = useState(dataProp.length); // Tổng số bản ghi từ API
  
  // Đồng bộ dataProp với state data nếu dataProp thay đổi
  useEffect(() => {
    if (dataProp && dataProp.length > 0) {
      setData(dataProp);
      setTotal(dataProp.length);
    }
  }, [dataProp]);
  const toast = useToast();
  const { systemParams } = useContext(AuthContext);
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [tempSelectedColumns, setTempSelectedColumns] = useState(selectedColumns);
  const hasAddButtonLabel =
    typeof addButtonLabel === "string" && addButtonLabel.trim().length > 0;
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
  const fetchTableData = useCallback((query = "", code = [], sort) => {
    if (fetchData) {
      fetchData({
        page: page + 1,
        limit: rowsPerPage,
        query,
        code,
        sort,
      })
        .then((result) => {
          setData(result.data || []);
          setTotal(result.total || 0);
        })
        .catch((error) => {
          toast("Có lỗi khi gọi dữ liệu!", error);
          // logger.log("Error fetching data:", error);
        });
    }
  }, [fetchData, page, rowsPerPage, toast]);

  // Gọi fetchData khi component mount hoặc page/rowsPerPage thay đổi
  useEffect(() => {
    const sort = orderBy
      ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
      : JSON.stringify({ [firstSortWithCode]: order === "asc" ? 1 : -1 });

    const codeValues = filter
      ?.filter((col) => selectedColumns.includes(col.name))
      .map((col) => col.code);

    fetchTableData(searchText, codeValues, sort);
  }, [page, rowsPerPage, fetchTableData, filter, reload, searchText, selectedColumns, orderBy, order, firstSortWithCode]);

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
      data.some((row) => row._id === id)
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
  const startRecord = total > 0 ? page * rowsPerPage + 1 : 0;
  const endRecord = total > 0 ? Math.min((page + 1) * rowsPerPage, total) : 0;
  const formattedTotal = total.toLocaleString("en-US");
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

  const handleSort = useCallback((column) => {
    const matchedColumns = filter?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns?.map((col) => col.code) || [];
    const isCurrentColumn = orderBy === column;
    const newOrder = isCurrentColumn
      ? order === "asc"
        ? "desc"
        : "asc"
      : "asc";
    const sort = orderBy
      ? JSON.stringify({ [column]: newOrder === "asc" ? 1 : -1 })
      : JSON.stringify({ [firstSortWithCode]: newOrder === "asc" ? 1 : -1 });
    fetchTableData(searchText, codeValues, sort);
    setOrder(newOrder);
    setOrderBy(column);
  }, [filter, selectedColumns, orderBy, order, firstSortWithCode, searchText, fetchTableData]);

  const handleSortByName = useCallback(() => {
    handleSort("name");
  }, [handleSort]);

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

  // Đồng bộ selected với data
  useEffect(() => {
    if (!data || data?.length === 0) {
      setSelected([]); // Reset selected nếu data rỗng
      return;
    }
    // Lọc selected để chỉ giữ lại các _id còn tồn tại trong data
    const validSelected = selected.filter((id) =>
      data?.some((row) => row._id === id)
    );
    if (validSelected?.length !== selected?.length) {
      setSelected(validSelected);
    }
  }, [data, selected]);
  const [expanded, setExpanded] = useState({});

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

  // Hàm render cây, có xử lý các node "mồ côi"
  const renderRows = (rows, level = 0,  parentLines = []) => {
    return rows.map((row, index) => {
      const rowId = row.id || row._id;
      const rawRowParent = row.parent || row.parentId;
      const rowParentId = rawRowParent && typeof rawRowParent === 'object' ? rawRowParent.id : rawRowParent;

      const childNodes = data.filter((item) => {
        const rawItemParent = item.parent || item.parentId;
        const itemParentId = rawItemParent && typeof rawItemParent === 'object' ? rawItemParent.id : rawItemParent;
        const itemId = item.id || item._id;
        return itemParentId === rowId && itemId !== rowId;
      });
      const hasChildren = childNodes.length > 0;
      const isExpanded = expanded[rowId];
      
      if (level === 0 && rowParentId && !data.some(d => (d.id || d._id) === rowParentId)) {
        // Bỏ qua không render ở đây, vì nó sẽ được render trong vòng lặp "mồ côi"
      }

      const handlers = createRowHandlers(row);
      const handleToggleExpand = () => {
        toggleExpand(rowId);
      };
      const isPopoverOpen = openPopoverId === rowId && Boolean(anchorEl);
      // Trả về hàm onClick cho từng row
      const handleEdit = (rowId) => () => {
        onEdit(rowId);
      };

      const handleView = (rowId) => () => {
        onView(rowId);
      };

      const handleDelete = (rowId) => () => {
        onDelete([rowId]);
      };

      return (
        <React.Fragment key={row?._id}>
          <StyledTableRow index={index}>
            <TreeTableCell $level={level}>
              {/* Nút mở rộng nếu có con */}
              {hasChildren ? (
                <ToggleButton size="small" onClick={handleToggleExpand}>
                  {isExpanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                </ToggleButton>
              ) : (
                <TreeSpacer />
              )}

              {/* Tên node */}
              <NodeName>{row?.name}</NodeName>
            </TreeTableCell>

            {/* Các cột khác */}
            {columns.map((column) => (
              <StyledTableCell
                key={column.row}
                styleWidth={isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width}
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
                if (!disableEdit) {
                  items.push({
                    key: "edit",
                    title: "Cập nhật",
                    icon: <EditOutlined />,
                    colorType: useModernActionColors ? "edit" : undefined,
                    onClick: handleEdit(row._id),
                  });
                }

                if (!disableDetail) {
                  items.push({
                    key: "view",
                    title: "Xem chi tiết",
                    icon: <RemoveRedEyeOutlined />,
                    colorType: useModernActionColors ? "view" : undefined,
                    onClick: handleView(row._id),
                  });
                }

                if (!disableDelete) {
                  items.push({
                    key: "delete",
                    title: "Xóa",
                    icon: <DeleteOutlineOutlined />,
                    onClick: handleDelete(row._id),
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
                        handlePopoverOptionClick(it.onClick, row._id),
                    });
                  });
                }
                return (
                  <>
                    {!isSmallScreen ? (
                      items.map((it) => (
                        <Tooltip key={it.key} title={it.title}>
                          <ActionIconButton
                            colorType={it.colorType}
                            iconSize={actionIconSize}
                            onClick={it.onClick}
                          >
                            {it.icon}
                          </ActionIconButton>
                        </Tooltip>
                      ))
                    ) : (
                      <Tooltip title="Thêm tùy chọn">
                        <ActionIconButton onClick={handlers.onPopoverClick}>
                          <MoreVertIcon />
                        </ActionIconButton>
                      </Tooltip>
                    )}

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
                          <Button
                            key={it.key}
                            fullWidth
                            startIcon={it.icon}
                            onClick={handlePopoverItemClick(it)}
                          >
                            {it.title}
                          </Button>
                        ))}
                      </PopoverContainer>
                    </Popover>
                  </>
                );
              })()}
            </StyledTableCellActions>
          </StyledTableRow>

          {/* Render node con nếu đang mở */}
          {isExpanded &&
            renderRows(childNodes, level + 1, rowId, [...parentLines, true])}
        </React.Fragment>
      );
    });
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

  const handleClickDelete = useCallback(() => {
    onDelete(selected);
  }, [onDelete, selected]);

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

  const handlePrevPageClick = () => {
    setPage((prev) => Math.max(prev - 1, 0));
  };

  const handleNextPageClick = () => {
    setPage((prev) => Math.min(prev + 1, Math.max(totalPages - 1, 0)));
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
     <StyledPaper>
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
                {/* <StyledFilterButtonNoBorder
									onClick={() => setOpenFilter((prev) => !prev)}
								> */}
                <StyledFilterButtonNoBorder onClick={handleToggleFilter}>
                  <TuneIcon/>
                </StyledFilterButtonNoBorder>
                {openFilter && (
                   <FilterBox alignRight={!filterPopupAlignLeft}>
                    {/* Header */}
                    <StyleBoxActionDropDown>
                      <span>Lọc tìm kiếm</span>
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

          <ActionsBox>
            {selected.length > 0 && !disableCheckbox && (
              <DeleteSelectedButton onClick={handleClickDelete}>
                <Tooltip title="Xóa">
                  <DeleteOutline />
                </Tooltip>
              </DeleteSelectedButton>
            )}
          </ActionsBox>
        </ToolbarContent>

        <ActionsContainer>
          <ActionsBox>
          {!disableAdd && (
            <AddButton
              onClick={onAdd}
              $hasLabel={hasAddButtonLabel}
            >
              <Tooltip title="Thêm mới">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: hasAddButtonLabel ? "6px" : "0px",
                    lineHeight: 1,
                    fontWeight: hasAddButtonLabel ? 500 : "inherit",
                  }}
                >
                  <span style={{ display: "inline-flex", fontSize: "1.125rem" }}>
                    <Add />
                  </span>
                  {hasAddButtonLabel && <span>{addButtonLabel}</span>}
                </span>
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
          </ActionsBox>
        </ActionsContainer>
      </StyledToolbar>

      <StyledTableContainer>
        <StyledTable>
          <StyledTableHead>
            <StyledTableRow>
              <StyledTableCell
                onClick={handleSortByName}
                styleCursor="pointer"
              >
                <HeaderCellContainer align="left">
                  Tên
                  <SortIconContainer>
                    <StyledArrowUp
                      isActive={orderBy === "name" && order === "asc"}
                    />
                    <StyledArrowDown
                      isActive={orderBy === "name" && order === "desc"}
                    />
                  </SortIconContainer>
                </HeaderCellContainer>
              </StyledTableCell>
              {columns.map((column) => (
                <HeaderCell
                  key={column.row}
                  column={column}
                  isSmallScreen={isSmallScreen}
                  orderBy={orderBy}
                  sortOrder={order}
                  handleSort={handleSort}
                />
              ))}
              <StyledTableCellActions index={0}>
                {!isSmallScreen && <span>Hành động</span>}
                {/* <HeaderCellContainer>Hành động</HeaderCellContainer> */}
              </StyledTableCellActions>
            </StyledTableRow>
          </StyledTableHead>

          <TableBody>
            {data.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={columns.length + 2} align="center" styleTextAlign>
                  Không có dữ liệu
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              <>
                {/* Render các node gốc (không có parent) */}
                {renderRows(data.filter((item) => {
                  const rawItemParent = item.parent || item.parentId;
                  const itemParentId = rawItemParent && typeof rawItemParent === 'object' ? rawItemParent.id : rawItemParent;
                  return !itemParentId;
                }))}
              </>
            )
            }
          </TableBody>
        </StyledTable>
      </StyledTableContainer>
       {!isSmallScreen && (
        <PaginationWrapper>
          <PaginationContainerStyled
            $hideBorder
            $isModern={useModernPagination}
          >
            {useModernPagination ? (
              <ModernPaginationLayout>
                <ModernPaginationSummary>
                  Hiển thị{" "}
                  <span style={{ fontWeight: 700, color: theme.palette.text.primary }}>
                    {startRecord}-{endRecord}
                  </span>{" "}
                  trong tổng số{" "}
                  <span style={{ fontWeight: 700, color: theme.palette.text.primary }}>
                    {formattedTotal}
                  </span>{" "}
                  bản ghi
                </ModernPaginationSummary>
                <ModernPaginationControls>
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
                  <StylePageNavButton onClick={handlePrevPageClick} disabled={page === 0}>
                    Trước
                  </StylePageNavButton>
                  <StyleActionPage>
                    {generatePaginationPages(page, totalPages, handlePageChange)}
                  </StyleActionPage>
                  <StylePageNavButton
                    onClick={handleNextPageClick}
                    disabled={page >= totalPages - 1 || totalPages === 0}
                  >
                    Sau
                  </StylePageNavButton>
                </ModernPaginationControls>
              </ModernPaginationLayout>
            ) : (
              <>
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
              </>
            )}
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

CustomTable.propTypes = {
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
  onAdd: PropTypes.func, // Hàm, không bắt buộc
  onDelete: PropTypes.func, // Hàm với tham số ID
  onEdit: PropTypes.func, // Hàm với tham số ID
  onView: PropTypes.func, // Hàm với tham số ID
  optionMore: PropTypes.func,
  // latestUpdatedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // ID có thể là chuỗi hoặc số

  disableCheckbox: PropTypes.bool,
  disableEdit: PropTypes.bool,
  disableDetail: PropTypes.bool,
  disableDelete: PropTypes.bool,
  disableMore: PropTypes.bool,
  disableAdd: PropTypes.bool,
  disableSynchronize: PropTypes.bool,
  addButtonLabel: PropTypes.string,
  actionIconSize: PropTypes.oneOf(["small", "medium"]),
  useModernActionColors: PropTypes.bool,
  useModernPagination: PropTypes.bool,
  reload: PropTypes.bool,
};
CustomTable.defaultProps = {
  disableCheckbox: false,
  disableEdit: false,
  disableDetail: false,
  disableDelete: false,
  disableMore: false,
  disableAdd: false,
  disableSynchronize: false,
  addButtonLabel: "",
  actionIconSize: "medium",
  useModernActionColors: false,
  useModernPagination: false,
};

export default CustomTable;

