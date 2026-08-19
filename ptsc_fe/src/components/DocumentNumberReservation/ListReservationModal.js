import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import PropTypes from "prop-types";
import { CustomDialog } from "@components/CustomDialog";
import {
  Box,
  Button,
  IconButton,
  TableBody,
  Checkbox,
  Chip,
  CircularProgress,
  Popover,
  FormControlLabel,
  Typography,
  MenuItem,
  Select,
  PaginationItem,
  styled,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import ClearIcon from "@mui/icons-material/Clear";
import AsyncAutoComplete from "@components/CustomAsyncAutoCompleted";
import axiosInstance from "@utils/axiosInstance";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import {
  PaginationContainer as BeautifulPaginationContainer,
  InfoBox as BeautifulInfoBox,
  StyledPagination as BeautifulStyledPagination,
  RowsPerPageBox as BeautifulRowsPerPageBox,
  DisplayTypography as BeautifulDisplayTypography,
  RowsPerPageSelect as BeautifulRowsPerPageSelect,
  RowsPerPageStack as BeautifulRowsPerPageStack,
} from "@builder-table/components/PaginationSection.styles";
import {
  StyledPaper,
  StyledTableContainer,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
  StyledTableCell,
  StyledTableHeaderCell,
  StyledBoxBoderBuilder,
  HeaderCellContainer,
} from "@styles/CustomTable.styles";
import AddEditReservationModal from "./AddEditReservationModal";

// --- Styled components matching Driver/index.js & CustomTableBorderTreeJob.js ---
const SearchBox = styled(Box)({
  display: "flex",
  alignItems: "center",
  height: "40px",
  gap: "8px",
});

const SearchBarWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  height: "40px",
  border: "1px solid #e0e0e0",
  borderRadius: "12px",
  backgroundColor: "#fff",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
});

const FilterLabel = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "0 12px",
  height: "100%",
  borderRight: "1px solid #e0e0e0",
  color: "#151618ff",
  fontSize: "0.875rem",
  fontWeight: 500,
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",
  flexShrink: 0,
  transition: "background 0.15s",
  "&:hover": {
    background: "#f5f8ff",
  },
});

const SearchInput = styled("input")({
  flex: 1,
  border: "none",
  outline: "none",
  padding: "0 12px",
  fontSize: "0.9375rem",
  fontFamily: "inherit",
  color: "#333",
  background: "transparent",
  minWidth: "200px",
  "&::placeholder": {
    color: "#aaa",
  },
});

const SearchBarDivider = styled("div")({
  width: "1px",
  height: "22px",
  backgroundColor: "#e0e0e0",
  flexShrink: 0,
});

const SearchBarIconButton = styled(IconButton)({
  borderRadius: 0,
  height: "40px",
  width: "38px",
  padding: "8px",
  color: "rgb(99, 115, 129)",
  flexShrink: 0,
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
});

const CustomSearchButton = styled(Button)({
  minWidth: "44px",
  height: "40px",
  borderRadius: "12px",
  backgroundColor: "#1976d2",
  color: "#fff",
  padding: 0,
  boxShadow: "none",
  border: "1px solid #1976d2",
  "&:hover": {
    backgroundColor: "#1565c0",
    borderColor: "#1565c0",
    boxShadow: "none",
  },
});

const PrimaryAddButton = styled(IconButton)({
  minWidth: "44px",
  height: "40px",
  borderRadius: "12px",
  backgroundColor: "#1976d2",
  color: "#ffffff",
  padding: 0,
  border: "1px solid #1976d2",
  boxShadow: "none",
  "&:hover": {
    backgroundColor: "#1565c0",
    borderColor: "#1565c0",
    boxShadow: "none",
  },
});

const PopoverHeader = styled(Box)({
  backgroundColor: "#edf4fb",
  padding: "10px 16px",
  color: "#1976d2",
  fontWeight: 700,
  fontSize: "0.95rem",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  borderBottom: "1px solid #e0e0e0",
});

const PopoverBody = styled(Box)({
  padding: "16px",
  minWidth: "340px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

const PopoverFooter = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 16px",
  borderTop: "1px solid #e0e0e0",
  gap: "8px",
});

const PopoverRightButtons = styled(Box)({
  display: "flex",
  gap: "8px",
});

const FieldLabelText = styled(Typography)({
  fontSize: "13px",
  fontWeight: 600,
  color: "#444444",
  marginBottom: "4px",
});

const StyledClearIcon = styled(ClearIcon)({
  fontSize: "16px",
});

const StyledTuneIcon = styled(TuneIcon)({
  fontSize: "20px",
});

const StyledSearchIcon = styled(SearchIcon)({
  fontSize: "20px",
});

const StyledEditIcon = styled(EditIcon)({
  fontSize: "18px",
});

const FilterIconSvg = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 2H14.5L9.5 8.5V13.5L6.5 15V8.5L1.5 2Z" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CircleIconButton = styled(IconButton)({
  backgroundColor: "#1976d2",
  color: "#ffffff",
  width: "32px",
  height: "32px",
  "&:hover": {
    backgroundColor: "#1565c0",
  },
});

const GreenStatusChip = styled(Chip)({
  backgroundColor: "#e8f5e9",
  color: "#2e7d32",
  fontWeight: 600,
  fontSize: "12px",
  borderRadius: "4px",
});

const ToolbarContainer = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
});

const ModalContentWrapper = styled(Box)({
  padding: "16px",
});

const LoadingTableCell = styled(StyledTableCell)({
  paddingTop: "24px",
  paddingBottom: "24px",
  textAlign: "center",
});

const EmptyTableCell = styled(StyledTableCell)({
  paddingTop: "24px",
  paddingBottom: "24px",
  textAlign: "center",
  color: "#888888",
});

const DEFAULT_COLUMNS = [
  { key: "bookCode", name: "Mã sổ văn bản đi", width: 180 },
  { key: "bookName", name: "Tên sổ văn bản", width: 220 },
  { key: "reservedNumber", name: "Số giữ", width: 180 },
  { key: "subscriberNames", name: "Người đăng ký giữ số", width: 200 },
  { key: "status", name: "Trạng thái", width: 120, align: "center" },
  { key: "note", name: "Ghi chú", width: 200 },
];

const EllipsisText = styled("span")({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "block",
  width: "100%",
});

const ReservationRowItem = memo(({ row, isSelected, columnWidths, visibleColumns, onSelectRow, onEditRow }) => {
  const handleCheckboxChange = useCallback(() => {
    onSelectRow(row.id);
  }, [row.id, onSelectRow]);

  const handleEditClick = useCallback(() => {
    onEditRow(row);
  }, [row, onEditRow]);

  const bookCode =
    row.bookDocument?.toBookCode ||
    row.bookDocument?.to_book_code ||
    row.bookDocument?.code ||
    row.bookDocument?.order ||
    "-";
  const bookName = row.bookDocument?.name || "-";
  const subscriberNames =
    row.subscribers
      ?.map((s) => s.user?.fullName || s.user?.name || s.user?.username)
      .filter(Boolean)
      .join(", ") || "-";

  return (
    <StyledTableRow hover selected={isSelected}>
      <StyledTableCell stylePaddingLeft="8px" styleWidth="40px">
        <Checkbox size="small" checked={isSelected} onChange={handleCheckboxChange} />
      </StyledTableCell>

      {visibleColumns.includes("bookCode") && (
        <StyledTableCell
          styleWidth={`${columnWidths.bookCode}px`}
          styleMinWidth={`${columnWidths.bookCode}px`}
          styleMaxWidth={`${columnWidths.bookCode}px`}
        >
          <Tooltip title={bookCode} enterDelay={300}>
            <EllipsisText>{bookCode}</EllipsisText>
          </Tooltip>
        </StyledTableCell>
      )}

      {visibleColumns.includes("bookName") && (
        <StyledTableCell
          styleWidth={`${columnWidths.bookName}px`}
          styleMinWidth={`${columnWidths.bookName}px`}
          styleMaxWidth={`${columnWidths.bookName}px`}
        >
          <Tooltip title={bookName} enterDelay={300}>
            <EllipsisText>{bookName}</EllipsisText>
          </Tooltip>
        </StyledTableCell>
      )}

      {visibleColumns.includes("reservedNumber") && (
        <StyledTableCell
          styleWidth={`${columnWidths.reservedNumber}px`}
          styleMinWidth={`${columnWidths.reservedNumber}px`}
          styleMaxWidth={`${columnWidths.reservedNumber}px`}
        >
          {row.reservedNumber}
        </StyledTableCell>
      )}

      {visibleColumns.includes("subscriberNames") && (
        <StyledTableCell
          styleWidth={`${columnWidths.subscriberNames}px`}
          styleMinWidth={`${columnWidths.subscriberNames}px`}
          styleMaxWidth={`${columnWidths.subscriberNames}px`}
        >
          <Tooltip title={subscriberNames} enterDelay={300}>
            <EllipsisText>{subscriberNames}</EllipsisText>
          </Tooltip>
        </StyledTableCell>
      )}

      {visibleColumns.includes("status") && (
        <StyledTableCell
          align="center"
          styleWidth={`${columnWidths.status}px`}
          styleMinWidth={`${columnWidths.status}px`}
          styleMaxWidth={`${columnWidths.status}px`}
        >
          <GreenStatusChip
            label={row.status === 1 ? "Đang giữ số" : "Đã cấp số"}
            size="small"
          />
        </StyledTableCell>
      )}

      {visibleColumns.includes("note") && (
        <StyledTableCell
          styleWidth={`${columnWidths.note}px`}
          styleMinWidth={`${columnWidths.note}px`}
          styleMaxWidth={`${columnWidths.note}px`}
        >
          <Tooltip title={row.note || "-"} enterDelay={300}>
            <EllipsisText>{row.note || "-"}</EllipsisText>
          </Tooltip>
        </StyledTableCell>
      )}

      <StyledTableCell align="center" styleWidth="100px" styleMinWidth="100px" styleMaxWidth="100px">
        <CircleIconButton
          size="small"
          onClick={handleEditClick}
          title="Sửa ghi chú / cá nhân"
        >
          <StyledEditIcon />
        </CircleIconButton>
      </StyledTableCell>
    </StyledTableRow>
  );
});

ReservationRowItem.displayName = "ReservationRowItem";

ReservationRowItem.propTypes = {
  row: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  columnWidths: PropTypes.object.isRequired,
  visibleColumns: PropTypes.array.isRequired,
  onSelectRow: PropTypes.func.isRequired,
  onEditRow: PropTypes.func.isRequired,
};

const ListReservationModal = ({ open, onClose }) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Tách biệt giữa text nhập trong ô (searchInput) và từ khóa đã áp dụng tìm kiếm (appliedSearch)
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  // Column Resizing & Visibility States (Giống 100% CustomTableBorderTreeJob)
  const [columnWidths, setColumnWidths] = useState({
    bookCode: 180,
    bookName: 220,
    reservedNumber: 180,
    subscriberNames: 200,
    status: 120,
    note: 200,
  });

  const [visibleColumns] = useState([
    "bookCode",
    "bookName",
    "reservedNumber",
    "subscriberNames",
    "status",
    "note",
  ]);

  const [resizingCol, setResizingCol] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Popover States
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [searchOptionAnchorEl, setSearchOptionAnchorEl] = useState(null);

  // Filter & Search Criteria States
  const [filterBook, setFilterBook] = useState(null);
  const [appliedFilterBook, setAppliedFilterBook] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [appliedFilterStatus, setAppliedFilterStatus] = useState("");

  const [searchCriteria, setSearchCriteria] = useState({
    all: true,
    code: true,
    name: true,
    note: true,
    subscriber: true,
  });

  const [openAddModal, setOpenAddModal] = useState(false);
  const [editData, setEditData] = useState(null);

  // Drag-to-resize column width handlers (Logic chuẩn giống CustomTableBorderTreeJob)
  const handleResizeMouseDown = useCallback((colKey) => (e) => {
    e.preventDefault();
    const el = document.getElementById(`col-border-${colKey}`);
    const curWidth = el ? el.offsetWidth : (columnWidths[colKey] || 150);
    setResizingCol(colKey);
    setStartX(e.clientX);
    setStartWidth(curWidth);
  }, [columnWidths]);

  useEffect(() => {
    if (!resizingCol) return undefined;
    const onMove = (e) => {
      const dx = e.clientX - startX;
      const newWidth = Math.max(20, startWidth + dx);
      setColumnWidths((prev) => ({ ...prev, [resizingCol]: newWidth }));
    };
    const onUp = () => {
      setResizingCol(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizingCol, startX, startWidth]);

  const fetchReservations = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: appliedSearch || undefined,
      };

      if (appliedFilterBook) {
        params.bookDocumentId =
          appliedFilterBook.bookDocumentId ||
          appliedFilterBook.book_document_id ||
          appliedFilterBook.id;
      }
      
      if (appliedFilterStatus) {
        params.status = appliedFilterStatus;
      }

      const res = await axiosInstance.get("/api/document-number-reservations", {
        params,
        skipUnwrap: true,
      });

      const resData = res?.data || res;
      let list = [];
      let totalCount = 0;

      if (resData && Array.isArray(resData.data)) {
        list = resData.data;
        totalCount = resData.total ?? resData.data.length;
      } else if (Array.isArray(resData)) {
        list = resData;
        totalCount = resData.length;
      } else if (resData && Array.isArray(resData.items)) {
        list = resData.items;
        totalCount = resData.total ?? resData.items.length;
      }

      setData(list);
      setTotal(totalCount);
    } catch (error) {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [open, page, rowsPerPage, appliedSearch, appliedFilterBook, appliedFilterStatus]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Nhập dữ liệu trong ô tìm kiếm (Không tự gọi API khi gõ)
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  // Thực hiện tìm kiếm (chỉ khi bấm nút Tìm kiếm hoặc nhấn Enter)
  const handleTriggerSearch = useCallback(() => {
    setPage(0);
    setAppliedSearch(searchInput.trim());
  }, [searchInput]);

  const handleKeyDownSearch = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleTriggerSearch();
      }
    },
    [handleTriggerSearch]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setAppliedSearch("");
    setPage(0);
  }, []);

  // --- Popover Handlers ---
  const handleOpenFilterPopover = useCallback((e) => {
    setFilterAnchorEl(e.currentTarget);
  }, []);

  const handleCloseFilterPopover = useCallback(() => {
    setFilterAnchorEl(null);
  }, []);

  const handleFilterStatusChange = useCallback((e) => {
    setFilterStatus(e.target.value);
  }, []);

  const handleResetFilter = useCallback(() => {
    setFilterBook(null);
    setAppliedFilterBook(null);
    setFilterStatus("");
    setAppliedFilterStatus("");
    setFilterAnchorEl(null);
  }, []);

  const handleApplyFilter = useCallback(() => {
    setAppliedFilterBook(filterBook);
    setAppliedFilterStatus(filterStatus);
    setFilterAnchorEl(null);
  }, [filterBook, filterStatus]);

  const handleOpenSearchOptionPopover = useCallback((e) => {
    setSearchOptionAnchorEl(e.currentTarget);
  }, []);

  const handleCloseSearchOptionPopover = useCallback(() => {
    setSearchOptionAnchorEl(null);
  }, []);

  const handleSearchCriteriaChange = useCallback(
    (key) => (e) => {
      const checked = e.target.checked;
      if (key === "all") {
        setSearchCriteria({
          all: checked,
          code: checked,
          name: checked,
          note: checked,
          subscriber: checked,
        });
      } else {
        setSearchCriteria((prev) => {
          const next = { ...prev, [key]: checked };
          const allChecked = next.code && next.name && next.note && next.subscriber;
          return { ...next, all: allChecked };
        });
      }
    },
    []
  );

  const handleApplySearchOption = useCallback(() => {
    setSearchOptionAnchorEl(null);
    handleTriggerSearch();
  }, [handleTriggerSearch]);

  // --- Actions & Pagination ---
  const handleOpenAdd = useCallback(() => {
    setEditData(null);
    setOpenAddModal(true);
  }, []);

  const handleOpenEdit = useCallback((item) => {
    setEditData(item);
    setOpenAddModal(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setOpenAddModal(false);
  }, []);

  const handleSelectAll = useCallback(
    (e) => {
      if (e.target.checked) {
        setSelectedIds(data.map((item) => item.id));
      } else {
        setSelectedIds([]);
      }
    },
    [data]
  );

  const handleSelectRow = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handlePageChangeBeautiful = useCallback((event, newPage) => {
    setPage(newPage - 1);
  }, []);

  const handleRowsPerPageChangeSelect = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const renderPreviousSlot = useCallback(() => "Trước", []);
  const renderNextSlot = useCallback(() => "Sau", []);
  const paginationSlots = useMemo(
    () => ({ previous: renderPreviousSlot, next: renderNextSlot }),
    [renderPreviousSlot, renderNextSlot]
  );

  const renderPaginationItem = useCallback(
    (item) => <PaginationItem slots={paginationSlots} {...item} />,
    [paginationSlots]
  );

  const bookDocumentUrl = `${APP_BASE}/api/book-documents/list?processFn=SoVBDi&type_document=OutGoingDocument`;

  const activeColumns = useMemo(
    () => DEFAULT_COLUMNS.filter((col) => visibleColumns.includes(col.key)),
    [visibleColumns]
  );

  return (
    <>
      <CustomDialog
        open={open}
        onClose={onClose}
        title="DANH SÁCH SỐ VĂN BẢN ĐANG GIỮ"
        fullWidth
        size="xl"
        disableSave
        cancelButtonText="ĐÓNG"
      >
        <ModalContentWrapper>
          <ToolbarContainer>
            {/* SearchBox styled matching Driver/index.js */}
            <SearchBox>
              <SearchBarWrapper>
                <FilterLabel onClick={handleOpenFilterPopover}>
                  <FilterIconSvg />
                  Bộ lọc
                </FilterLabel>
                <SearchInput
                  placeholder="Tìm kiếm..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDownSearch}
                />
                {searchInput && (
                  <SearchBarIconButton size="small" onClick={handleClearSearch}>
                    <StyledClearIcon />
                  </SearchBarIconButton>
                )}
                <SearchBarDivider />
                <SearchBarIconButton onClick={handleOpenSearchOptionPopover}>
                  <StyledTuneIcon />
                </SearchBarIconButton>
              </SearchBarWrapper>
              <CustomSearchButton variant="contained" onClick={handleTriggerSearch}>
                <StyledSearchIcon />
              </CustomSearchButton>
            </SearchBox>

            {/* Nút Thêm mới cùng màu (#1976d2) và size với Nút Search */}
            <PrimaryAddButton onClick={handleOpenAdd} title="Thêm mới giữ số">
              <AddIcon />
            </PrimaryAddButton>
          </ToolbarContainer>

          {/* Popover BỘ LỌC (Lọc theo Loại sổ) */}
          <Popover
            open={Boolean(filterAnchorEl)}
            anchorEl={filterAnchorEl}
            onClose={handleCloseFilterPopover}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <PopoverHeader>
              <FilterIconSvg /> BỘ LỌC
            </PopoverHeader>
            <PopoverBody>
              <FieldLabelText>Loại sổ</FieldLabelText>
              <AsyncAutoComplete
                fullWidth
                placeholder="Chọn loại sổ..."
                url={bookDocumentUrl}
                method="GET"
                queryParam="filter[name]"
                optionLabel="name"
                optionValue="bookDocumentId"
                value={filterBook}
                onChange={setFilterBook}
                returnObject
                size="small"
              />
              <Box mt={1}>
                <FieldLabelText>Trạng thái</FieldLabelText>
                <Select
                  fullWidth
                  size="small"
                  value={filterStatus}
                  onChange={handleFilterStatusChange}
                  displayEmpty
                >
                  <MenuItem value="">Chọn trạng thái...</MenuItem>
                  <MenuItem value={1}>Đang giữ số</MenuItem>
                  <MenuItem value={2}>Đã cấp số</MenuItem>
                </Select>
              </Box>
            </PopoverBody>
            <PopoverFooter>
              <Button size="small" variant="outlined" onClick={handleResetFilter}>
                Đặt lại
              </Button>
              <PopoverRightButtons>
                <Button size="small" variant="outlined" onClick={handleCloseFilterPopover}>
                  Hủy
                </Button>
                <Button size="small" variant="contained" onClick={handleApplyFilter}>
                  Áp dụng lọc
                </Button>
              </PopoverRightButtons>
            </PopoverFooter>
          </Popover>

          {/* Popover LỌC TÌM KIẾM (Chọn các trường cần tìm kiếm) */}
          <Popover
            open={Boolean(searchOptionAnchorEl)}
            anchorEl={searchOptionAnchorEl}
            onClose={handleCloseSearchOptionPopover}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <PopoverHeader>
              <StyledSearchIcon /> LỌC TÌM KIẾM
            </PopoverHeader>
            <PopoverBody>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={searchCriteria.all}
                    onChange={handleSearchCriteriaChange("all")}
                    size="small"
                  />
                }
                label="Tất cả"
              />
              <GridWrapCheckboxes>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={searchCriteria.code}
                      onChange={handleSearchCriteriaChange("code")}
                      size="small"
                    />
                  }
                  label="Mã số văn bản đi"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={searchCriteria.name}
                      onChange={handleSearchCriteriaChange("name")}
                      size="small"
                    />
                  }
                  label="Tên số văn bản"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={searchCriteria.note}
                      onChange={handleSearchCriteriaChange("note")}
                      size="small"
                    />
                  }
                  label="Ghi chú"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={searchCriteria.subscriber}
                      onChange={handleSearchCriteriaChange("subscriber")}
                      size="small"
                    />
                  }
                  label="Người đăng ký"
                />
              </GridWrapCheckboxes>
            </PopoverBody>
            <PopoverFooter>
              <Box />
              <PopoverRightButtons>
                <Button size="small" variant="outlined" onClick={handleCloseSearchOptionPopover}>
                  Hủy
                </Button>
                <Button size="small" variant="contained" onClick={handleApplySearchOption}>
                  Áp dụng
                </Button>
              </PopoverRightButtons>
            </PopoverFooter>
          </Popover>

          {/* Cấu trúc Bảng tương thích 100% với CustomTableBorderTreeJob.js hỗ trợ kéo thu nhỏ/mở rộng cột */}
          <StyledPaper isInsideDialog>
            <StyledTableContainer>
              <StyledTable size="small">
                <StyledTableHead>
                  <StyledTableRow>
                    <StyledTableCell stylePaddingLeft="8px" styleWidth="40px">
                      <Checkbox
                        size="small"
                        indeterminate={selectedIds.length > 0 && selectedIds.length < data.length}
                        checked={data.length > 0 && selectedIds.length === data.length}
                        onChange={handleSelectAll}
                      />
                    </StyledTableCell>
                    {activeColumns.map((col) => (
                      <StyledTableHeaderCell
                        key={col.key}
                        id={`col-border-${col.key}`}
                        isBold
                        align={col.align || "left"}
                        styleWidth={`${columnWidths[col.key]}px`}
                        styleMinWidth={`${columnWidths[col.key]}px`}
                        styleMaxWidth={`${columnWidths[col.key]}px`}
                      >
                        <HeaderCellContainer align={col.align || "left"}>
                          {col.name}
                        </HeaderCellContainer>
                        <StyledBoxBoderBuilder onMouseDown={handleResizeMouseDown(col.key)} />
                      </StyledTableHeaderCell>
                    ))}
                    <StyledTableHeaderCell isBold align="center" styleWidth="100px" styleMinWidth="100px" styleMaxWidth="100px">
                      Hành động
                    </StyledTableHeaderCell>
                  </StyledTableRow>
                </StyledTableHead>
                <TableBody>
                  {loading ? (
                    <StyledTableRow>
                      <LoadingTableCell colSpan={activeColumns.length + 2}>
                        <CircularProgress size={28} />
                      </LoadingTableCell>
                    </StyledTableRow>
                  ) : data.length === 0 ? (
                    <StyledTableRow>
                      <EmptyTableCell colSpan={activeColumns.length + 2}>
                        Không có dữ liệu giữ số văn bản
                      </EmptyTableCell>
                    </StyledTableRow>
                  ) : (
                    data.map((row) => (
                      <ReservationRowItem
                        key={row.id}
                        row={row}
                        isSelected={selectedIds.includes(row.id)}
                        columnWidths={columnWidths}
                        visibleColumns={visibleColumns}
                        onSelectRow={handleSelectRow}
                        onEditRow={handleOpenEdit}
                      />
                    ))
                  )}
                </TableBody>
              </StyledTable>
            </StyledTableContainer>

            {/* Phân trang đồng bộ từ CustomTableBorderTreeJob.js */}
            <BeautifulPaginationContainer isCentered={false}>
              <BeautifulInfoBox isCentered={false}>
                <Typography variant="body2">
                  Hiển thị{" "}
                  <strong>
                    {total > 0 ? page * rowsPerPage + 1 : 0}-
                    {Math.min((page + 1) * rowsPerPage, total)}
                  </strong>{" "}
                  trong tổng số <strong>{total?.toLocaleString()}</strong> bản ghi
                </Typography>
              </BeautifulInfoBox>

              <BeautifulRowsPerPageStack>
                <BeautifulRowsPerPageBox>
                  <BeautifulDisplayTypography>Hiển thị</BeautifulDisplayTypography>
                  <BeautifulRowsPerPageSelect
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChangeSelect}
                    size="small"
                  >
                    {[25, 50, 100, 500].map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </BeautifulRowsPerPageSelect>
                </BeautifulRowsPerPageBox>

                <BeautifulStyledPagination
                  count={Math.ceil(total / rowsPerPage) || 1}
                  page={page + 1}
                  onChange={handlePageChangeBeautiful}
                  renderItem={renderPaginationItem}
                  shape="rounded"
                  variant="text"
                  showFirstButton={false}
                  showLastButton={false}
                  siblingCount={1}
                  boundaryCount={1}
                />
              </BeautifulRowsPerPageStack>
            </BeautifulPaginationContainer>
          </StyledPaper>
        </ModalContentWrapper>
      </CustomDialog>

      {/* Modal Thêm mới / Cập nhật Giữ số văn bản */}
      <AddEditReservationModal
        open={openAddModal}
        onClose={handleCloseAddModal}
        onSuccess={fetchReservations}
        initialData={editData}
      />
    </>
  );
};

const GridWrapCheckboxes = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "4px",
});

ListReservationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ListReservationModal;
