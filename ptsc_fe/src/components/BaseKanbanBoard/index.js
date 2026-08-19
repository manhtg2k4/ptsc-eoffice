import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  // Grid,
  useTheme,
  Checkbox,
  FormControlLabel,
  ClickAwayListener,
  Tooltip,
  Popover,
  // MenuItem,
  styled,
  Avatar,
  Box,
} from "@mui/material";
import {
  Search as SearchIcon,
  GetApp as GetAppIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
} from "@mui/icons-material";
import TuneIcon from "@builder-table/components/TuneIcon";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  StyledKanbanStack,
  StyledColumnWrapper,
  StyledColumnPaper,
  // StyledColumnHeader,
  // StyledColumnTitle,
  StyledCardList,
  StyledKanbanCard,
  StyledCardContent,
  StyledCardContentBox,
  StyledCardTextBox,
  // StyledCardTitleRow,
  // StyledCardTitle,
  // StyledInfoText,
  // StyledCountBadge,
  // StyledColumnHeaderCount,
  CalendarHeader,
  CalendarTitle,
  CalendarButtonGroup,
  CalendarGroupButton,
  CalendarTodayButton,
  CalendarGroupDivider,
  SegmentedButtonGroup,
  SegmentedButton,
} from "./BaseKanbanBoard.styles";
import {
  ToolbarContent,
  FilterBox,
  StyleBoxActionDropDown,
  StyleActionCheckBox,
  StyleActionCellCheckBox,
  StyleActionButton,
  StyleActionButtonCancel,
  StyleActionButtonApply,
  ActionsBox,
  AddButton,
  ExportButton,
  PopoverContainer,
  StyledToolbarkanba,
} from "@styles/CustomTable.styles";
import { StyledPopoverActionButton } from "@styles/CustomTableTree.styles";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import ViewJobToMeeting from "@pages/WorkManagement/components/ViewJobToMeeting";
import ViewJob from "@pages/WorkManagement/components/ViewJob";
import { clearWidthSpace } from "@utils/Common/Common";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { SkyTooltip, SkyTypography } from "@styles/SkyStyles";
import DOMPurify from "dompurify";

// ===== Pill Search UI (giống CustomTableBorderTreeJob) =====
const UnifiedSearchContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '12px',
  backgroundColor: theme.palette.background.paper,
  height: '40px',
  minWidth: '400px',
  maxWidth: '600px',
  overflow: 'visible',
  transition: 'border-color 0.2s',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
  },
}));

const PillFilterTrigger = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '0 12px',
  height: '100%',
  cursor: 'pointer',
  borderRight: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary,
  whiteSpace: 'nowrap',
  '&:hover': {
    // backgroundColor: theme.palette.action.hover,
    borderTopLeftRadius: '6px',
    borderBottomLeftRadius: '6px',
  },
  '& span': {
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  '& svg': {
    fontSize: '1rem',
  },
}));

const SearchInputWrapper = styled('div')({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
  padding: '0 8px 0 12px',
  height: '100%',
  overflow: 'hidden',
});

const StyledPillInput = styled('input')(({ theme }) => ({
  border: 'none',
  outline: 'none',
  width: '100%',
  minWidth: 0,
  height: '100%',
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
  '&::placeholder': {
    color: theme.palette.text.disabled,
  },
}));

const PillClearButton = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
  },
  '& svg': {
    fontSize: '14px',
  },
}));

const PillTuneButton = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 12,
  background: 'transparent',
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  padding: '0 10px',
  height: '100%',
  '&:hover': {
    backgroundColor: "#F8F9FA",
    borderColor:"#0062AD",
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.1rem',
  },
}));

const BlueSearchButton = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  cursor: 'pointer',
  flexShrink: 0,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.2rem',
  },
}));

const SearchRowWrapper = styled('div')({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
});

const FilterRelativeWrapper = styled('div')({
  position: 'relative',
  height: '100%',
});

const TaskViewToggleWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: 11,
  marginLeft: 4,
  alignItems: "center",
  [theme.breakpoints.down("md")]: {
    flexWrap: "wrap",
  },
}));

const TaskViewToggleButton = styled('button')(({ active }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 40,
  padding: "0 20px",
  borderRadius: "12px",
  border: active ? "1.5px solid #1976d2" : "1.5px solid #e0e0e0",
  backgroundColor: active ? "#f7f7f7ff" : "#F9FAFB",
  color: active ? "#1976d2" : "#1a1a1a",
  fontWeight: 600,
  fontSize: "15px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  whiteSpace: "nowrap",
  boxShadow: active
    ? "0px 8px 20px rgba(25, 118, 210, 0.25)"
    : "0px 1px 3px rgba(0,0,0,0.08)",
  "&:hover": {
    backgroundColor: active ? "#d2e3fc" : "#ececec",
    borderColor: active ? "#1976d2" : "#bdbdbd",
  },
}));
const SkyStyledTypography = styled(SkyTypography)(({ theme }) => ({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  wordBreak: "break-word",
  fontSize: "18px",
  fontWeight: "700",
  color: theme.palette.mode === "dark" ? "#ffffff" : "#1e293b",
  lineHeight: "1.4",
  marginBottom: "12px",
}));

const StyledAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "avatarcolor",
})(({ avatarcolor }) => ({
  width: 32,
  height: 32,
  fontSize: "14px",
  fontWeight: "700",
  backgroundColor: avatarcolor,
  color: "#ffffff",
}));

const StyledCheckIcon = styled(CheckCircleOutlineIcon)(({ theme }) => ({
  fontSize: "18px",
  color: theme.palette.text.disabled,
}));

const StyledCalendarIcon = styled(CalendarIcon)(() => ({
  fontSize: "16px",
  color: "#353940",
}));

dayjs.extend(customParseFormat);

const getAccentColor = (statusId) => {
  const mapping = {
    1: "#94a3b8", // Công việc mới (Gray)
    6: "#f97316", // Điều chỉnh (Orange)
    2: "#2563eb", // Đang thực hiện (Blue)
    3: "#eab308", // Chờ phê duyệt (Yellow)
    4: "#22c55e", // Hoàn thành (Green)
    5: "#ef4444", // Hủy (Red)
  };
  return mapping[statusId] || "#94a3b8";
};

const getAvatarInitials = (name) => {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const getAvatarColor = (name) => {
  if (!name) return "#cbd5e1";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Green
    "#f59e0b", // Yellow
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#f97316", // Orange
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const renderPriorityBadge = (flag) => {
  if (!flag) return null;
  const cleanText = flag.replace(/<[^>]*>/g, "").trim();
  if (!cleanText) return null;
  
  const lowerText = cleanText.toLowerCase();
  if (lowerText === "high" || lowerText === "gấp") {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "500",
        backgroundColor: "#fee2e2",
        color: "#ef4444",
        marginBottom: "25px",
        marginTop:"8px",
      }}>
        {cleanText}
      </span>
    );
  }
  if (lowerText === "low" || lowerText === "bình thường") {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "700",
        backgroundColor: "#ffffff",
        color: "#17191C",
        border: "1px solid #e2e8f0",
        marginBottom: "25px",
        marginTop:"8px",
      }}>
        {cleanText}
      </span>
    );
  }
  if (lowerText === "medium" || lowerText === "trung bình") {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "500",
        backgroundColor: "#fef3c7",
        color: "#d97706",
        marginBottom: "25px",
        marginTop:"8px",
      }}>
        {cleanText}
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "500",
      backgroundColor: "#f1f5f9",
      color: "#64748b",
      marginBottom: "12px",
    }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(flag) }} />
  );
};

const isTaskInDateRange = (task, rangeStart, rangeEnd) => {
  const taskStart = task.startDate ? dayjs(task.startDate, "DD/MM/YYYY") : null;
  const taskEnd = task.endDate ? dayjs(task.endDate, "DD/MM/YYYY") : null;

  const hasValidStart = taskStart && taskStart.isValid();
  const hasValidEnd = taskEnd && taskEnd.isValid();

  if (!hasValidStart && !hasValidEnd) {
    return true; // Show tasks without valid dates
  }

  const start = hasValidStart ? taskStart.startOf("day") : (hasValidEnd ? taskEnd.startOf("day") : null);
  const end = hasValidEnd ? taskEnd.endOf("day") : (hasValidStart ? taskStart.endOf("day") : null);

  const startsBeforeOrAtEnd = start ? !start.isAfter(rangeEnd) : true;
  const endsAfterOrAtStart = end ? !end.isBefore(rangeStart) : true;

  return startsBeforeOrAtEnd && endsAfterOrAtStart;
};

const KanbanBoard = ({
  initialColumns,
  // onColumnsChange,
  // onItemStatusChange,
  onSearch,
  renderAfterSearch,
  filterOptions = [],
  // isEmpty = false,
  onAdd,
  onExport,
  setReloadData,
  onAdvancedFilterClick,
  addButtonLabel,
  onMyAssign,
  onMyDirector,
  onMySupporter,
  activeTaskView
  // disableDrag = true,
}) => {
  const [columns, setColumns] = useState(initialColumns);
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const theme = useTheme();

  const [searchText, setSearchText] = useState("");
  const [openFilter, setOpenFilter] = useState(false);
  const [timeFilter, setTimeFilter] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedColumns, setSelectedColumns] = useState(
    filterOptions?.map((col) => col.name) || []
  );
  const [tempSelectedColumns, setTempSelectedColumns] = useState(selectedColumns);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  // Sync internal state with prop changes
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const filteredColumns = useMemo(() => {
    if (!columns) return [];
    
    let rangeStart, rangeEnd;
    const current = dayjs(currentDate);
    
    if (timeFilter === "week") {
      const day = current.day();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      rangeStart = current.add(diffToMonday, "day").startOf("day");
      rangeEnd = rangeStart.add(6, "day").endOf("day");
    } else if (timeFilter === "quarter") {
      const month = currentDate.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      rangeStart = dayjs(new Date(currentDate.getFullYear(), quarterStartMonth, 1)).startOf("day");
      rangeEnd = dayjs(new Date(currentDate.getFullYear(), quarterStartMonth + 3, 1)).subtract(1, "day").endOf("day");
    } else {
      // Default: month
      rangeStart = current.startOf("month").startOf("day");
      rangeEnd = current.endOf("month").endOf("day");
    }

    return columns.map((col) => ({
      ...col,
      items: col.items.filter((item) => isTaskInDateRange(item, rangeStart, rangeEnd)),
    }));
  }, [columns, currentDate, timeFilter]);

  const getHeaderTitle = () => {
    const current = dayjs(currentDate);
    if (timeFilter === "week") {
      const day = current.day();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const weekStart = current.add(diffToMonday, "day");
      const weekEnd = weekStart.add(6, "day");
      return `Tháng ${weekStart.format("MM, YYYY")} (Tuần: ${weekStart.format("DD/MM")} - ${weekEnd.format("DD/MM/YYYY")})`;
    }
    if (timeFilter === "quarter") {
      const month = currentDate.getMonth();
      const quarter = Math.floor(month / 3) + 1;
      const romanQuarters = ["I", "II", "III", "IV"];
      return `Quý ${romanQuarters[quarter - 1]}, ${currentDate.getFullYear()}`;
    }
    // Default: month
    return `Tháng ${current.format("MM, YYYY")}`;
  };

  const handlePrevDate = useCallback(() => {
    if (timeFilter === "week") {
      setCurrentDate((prev) => dayjs(prev).subtract(1, "week").toDate());
    } else if (timeFilter === "quarter") {
      setCurrentDate((prev) => dayjs(prev).subtract(3, "month").toDate());
    } else {
      setCurrentDate((prev) => dayjs(prev).subtract(1, "month").toDate());
    }
  }, [timeFilter]);

  const handleNextDate = useCallback(() => {
    if (timeFilter === "week") {
      setCurrentDate((prev) => dayjs(prev).add(1, "week").toDate());
    } else if (timeFilter === "quarter") {
      setCurrentDate((prev) => dayjs(prev).add(3, "month").toDate());
    } else {
      setCurrentDate((prev) => dayjs(prev).add(1, "month").toDate());
    }
  }, [timeFilter]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSelectWeek = useCallback(() => {
    setTimeFilter("week");
  }, []);

  const handleSelectMonth = useCallback(() => {
    setTimeFilter("month");
  }, []);

  const handleSelectQuarter = useCallback(() => {
    setTimeFilter("quarter");
  }, []);

  // Click ra ngoài để đóng filter
  const handleClickAway = useCallback(() => {
    setOpenFilter(false);
  }, []);

  // Toggle mở/đóng filter
  const handleToggleFilter = useCallback(() => {
    setOpenFilter((prev) => !prev);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchText("");
  }, []);

  const handleOpenAdvancedFilter = useCallback((e) => {
    if (onAdvancedFilterClick) {
      onAdvancedFilterClick(e);
    } else {
      handleToggleFilter();
    }
  }, [onAdvancedFilterClick, handleToggleFilter]);

  // Checkbox toggle từng cột
  const handleToggleColumn = useCallback((columnName) => () => {
    setTempSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((val) => val !== columnName)
        : [...prev, columnName]
    );
  }, []);

  const handleSelectAllColumns = useCallback((e) => {
    if (e.target.checked) {
      setTempSelectedColumns(filterOptions?.map((col) => col.name) || []);
    } else {
      setTempSelectedColumns([]);
    }
  }, [filterOptions]);

  // Helper function để map từ tiếng Việt sang tiếng Anh
  const mapTimeFilterToAPI = useCallback((vietnameseValue) => {
    const mapping = {
      "Tuần": "week",
      "Tháng": "month",
      "Quý": "quarter",
      "week": "week",
      "month": "month",
      "quarter": "quarter"
    };
    return mapping[vietnameseValue] || vietnameseValue;
  }, []);

  // const handleTimeFilterChange = useCallback((e) => {
  //   const val = e.target.value;
  //   setTimeFilter(val);

  //   // Tự động tìm kiếm khi đổi thời gian
  //   if (onSearch) {
  //     const matchedColumns = filterOptions?.filter((col) =>
  //       selectedColumns.includes(col.name)
  //     );
  //     const codeValues = matchedColumns?.map((col) => col.code);
  //     const apiValue = mapTimeFilterToAPI(val);
  //     onSearch(searchText, codeValues, apiValue);
  //   }
  // }, [onSearch, searchText, filterOptions, selectedColumns, mapTimeFilterToAPI]);

  const handleSearchButtonClick = useCallback(() => {
    const matchedColumns = filterOptions?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns?.map((col) => col.code);
    if (onSearch) {
      const apiValue = mapTimeFilterToAPI(timeFilter);
      onSearch(searchText, codeValues, apiValue);
    }
  }, [filterOptions, selectedColumns, onSearch, searchText, timeFilter, mapTimeFilterToAPI]);

  const handleApplyFilter = useCallback(() => {
    setSelectedColumns(tempSelectedColumns); // Áp dụng thay đổi
    handleClickAway(); // Đóng dropdown
  }, [tempSelectedColumns, handleClickAway]);

  const handleOpenExport = useCallback((event) => {
    setExportAnchorEl(event.currentTarget);
  }, []);

  const handleCloseExport = useCallback(() => {
    setExportAnchorEl(null);
  }, []);

  const handleExportExcel = useCallback(() => {
    if (onExport) {
      onExport("xlsx");
    }
    handleCloseExport();
  }, [onExport, handleCloseExport]);

  const handleExportPdf = useCallback(() => {
    if (onExport) {
      onExport("pdf");
    }
    handleCloseExport();
  }, [onExport, handleCloseExport]);

  const handleSearchFilter = useCallback((e) => {
    const inputValue = e.target.value;
    const normalized = inputValue.normalize("NFC");

    // Regex chặn ký tự đặc biệt cụ thể, KHÔNG chặn tiếng Việt
    const forbiddenCharsRegex = /[~!@#$%^*.,`]/;
    if (forbiddenCharsRegex.test(normalized)) {
      e.preventDefault(); // Không cho nhập
      return;
    }

    setSearchText(clearWidthSpace(inputValue).trimStart());
  }, []);

  const handleDragEnd = (/* result */) => {
    // Tắt kéo thả theo yêu cầu
    return;
    /*
    // Nếu drag bị tắt → không làm gì
    if (disableDrag) return;
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      const column = columns.find((col) => col.id === source.droppableId);
      const newItems = Array.from(column.items);
      const [moved] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, moved);

      const newCols = columns.map((col) =>
        col.id === column.id ? { ...col, items: newItems } : col
      );
      setColumns(newCols);
      onColumnsChange?.(newCols);
    } else {
      const sourceCol = columns.find((col) => col.id === source.droppableId);
      const destCol = columns.find((col) => col.id === destination.droppableId);
      const sourceItems = Array.from(sourceCol.items);
      const destItems = Array.from(destCol.items);
      const [moved] = sourceItems.splice(source.index, 1);

      // Cập nhật trạng thái mới cho item dựa vào cột đích
      const updatedMoved = { ...moved, processStatus: destCol.id };

      destItems.splice(destination.index, 0, updatedMoved);

      const newCols = columns.map((col) => {
        if (col.id === sourceCol.id) return { ...col, items: sourceItems };
        if (col.id === destCol.id) return { ...col, items: destItems };
        return col;
      });
      setColumns(newCols);
      onColumnsChange?.(newCols);

      // Callback cho parent để đồng bộ dữ liệu gốc
      onItemStatusChange?.({
        item: updatedMoved,
        sourceStatus: sourceCol.id,
        destStatus: destCol.id,
      });
    }
    */
  };

  const getOverdueDays = (endDate) => {
    if (!endDate) return 0;
    const today = dayjs().startOf("day");
    const deadline = dayjs(endDate, "DD/MM/YYYY").startOf("day");
    const diff = today.diff(deadline, "day");
    return diff > 0 ? diff : 0;
  };

  // Component hiển thị từng dòng thông tin: "Label: Value"
  // const InfoLine = ({ label, value }) => (
  //   <StyledInfoText>
  //     <span style={{ color: theme.palette.text.secondary }}>{label}: </span>
  //     {value}
  //   </StyledInfoText>
  // );

  // Handler: Click on task card
  const handleTaskClick = useCallback((task) => {
    setSelectedTask(task);
    setOpenDetailModal(true);
  }, []);

  const getClickHandler = useCallback(
    (item) => () => handleTaskClick(item),
    [handleTaskClick]
  );

  /**
   * Render modal chi tiết công việc dựa vào typeTask
   * - general: ViewJob (mặc định)
   * - form_doc: ViewJobToDocument
   * - form_meeting: ViewJobToMeeting
   */
  const renderDetailModal = () => {
    const handleCloseModal = () => {
      setOpenDetailModal(false);
      setSelectedTask(null);
    };

    const handleJobDetailSuccess = () => {
      setReloadData((prev) => !prev);
      handleCloseModal();
    };

    if (!selectedTask || !openDetailModal) return null;

    const commonProps = {
      open: openDetailModal,
      onClose: handleCloseModal,
      onSuccess: handleJobDetailSuccess,
      documentId: selectedTask?.sourceId,
      setReloadData,
    };

    switch (selectedTask?.typeTask) {
      case "general":
        return <ViewJob {...commonProps} />;
      case "form_doc":
        return <ViewJobToDocument {...commonProps} />;
      case "form_meeting":
        return <ViewJobToMeeting {...commonProps} />;
      default:
        return <ViewJob {...commonProps} />;
    }
  };

  return (
    <>
      {(onSearch || renderAfterSearch) && (
        <StyledToolbarkanba>
          <ToolbarContent>
            <SearchRowWrapper>
              <UnifiedSearchContainer>
                <ClickAwayListener onClickAway={handleClickAway}>
                  <FilterRelativeWrapper>
                    <PillFilterTrigger onClick={handleOpenAdvancedFilter}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.7398 2.01172L1.33984 2.01172L6.69984 8.34992L6.69984 12.7317L9.37984 14.0717L9.37984 8.34992L14.7398 2.01172Z" stroke="currentColor" strokeWidth="1.34" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Bộ lọc</span>
                    </PillFilterTrigger>

                    {openFilter && (
                      <FilterBox alignRight = {false}>
                        <StyleBoxActionDropDown>
                          <span>Lọc tìm kiếm</span>
                          <SearchIcon />
                        </StyleBoxActionDropDown>

                        <StyleActionCheckBox>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={tempSelectedColumns?.length === filterOptions?.length}
                                indeterminate={
                                  tempSelectedColumns?.length > 0 &&
                                  tempSelectedColumns?.length < filterOptions?.length
                                }
                                onChange={handleSelectAllColumns}
                                size="small"
                              />
                            }
                            label="Tất cả"
                          />
                        </StyleActionCheckBox>

                        <StyleActionCellCheckBox>
                          {filterOptions?.map((column) => (
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

                        <StyleActionButton>
                          <StyleActionButtonCancel onClick={handleClickAway}>
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
                  </FilterRelativeWrapper>
                </ClickAwayListener>

                <SearchInputWrapper>
                  <StyledPillInput
                    placeholder="Tìm kiếm..."
                    value={searchText}
                    onChange={handleSearchFilter}
                  />
                  {searchText && (
                    <PillClearButton onClick={handleClearSearch}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </PillClearButton>
                  )}
                </SearchInputWrapper>

                <PillTuneButton onClick={handleToggleFilter}>
                  <TuneIcon />
                </PillTuneButton>
              </UnifiedSearchContainer>

              <BlueSearchButton onClick={handleSearchButtonClick}>
                <Tooltip title="Tìm kiếm">
                  <SearchIcon />
                </Tooltip>
              </BlueSearchButton>
            </SearchRowWrapper>

            {/* Advanced filter — ẩn button "Bộ Lọc" gốc, chỉ giữ Popover */}
            {renderAfterSearch && renderAfterSearch({ hideButton: true })}

            {/* Nút toggle bộ lọc nhanh */}
            {(onMyAssign || onMyDirector || onMySupporter) && (
              <TaskViewToggleWrapper>
                {onMyAssign && (
                  <TaskViewToggleButton
                    active={(activeTaskView?.myAssign || activeTaskView === 'myAssign') ? 1 : 0}
                    onClick={onMyAssign}
                    title="Việc tôi giao"
                  >
                    Việc tôi giao
                  </TaskViewToggleButton>
                )}
                {onMyDirector && (
                  <TaskViewToggleButton
                    active={(activeTaskView?.myDirector || activeTaskView === 'myDirector') ? 1 : 0}
                    onClick={onMyDirector}
                    title="Việc tôi chủ trì"
                  >
                    Việc tôi chủ trì
                  </TaskViewToggleButton>
                )}
                {onMySupporter && (
                  <TaskViewToggleButton
                    active={(activeTaskView?.mySupporter || activeTaskView === 'mySupporter') ? 1 : 0}
                    onClick={onMySupporter}
                    title="Việc tôi phối hợp"
                  >
                    Việc tôi phối hợp
                  </TaskViewToggleButton>
                )}
              </TaskViewToggleWrapper>
            )}
          </ToolbarContent>

          <ActionsBox>
            {onExport && (
              <>
                <ExportButton onClick={handleOpenExport}>
                  <Tooltip title="Xuất">
                    <GetAppIcon />
                  </Tooltip>
                </ExportButton>
                <Popover
                  open={Boolean(exportAnchorEl)}
                  anchorEl={exportAnchorEl}
                  onClose={handleCloseExport}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <PopoverContainer>
                    <StyledPopoverActionButton
                      fullWidth
                      startIcon={<ExcelIcon />}
                      onClick={handleExportExcel}
                    >
                      Xuất Excel
                    </StyledPopoverActionButton>
                    <StyledPopoverActionButton
                      fullWidth
                      startIcon={<PdfIcon />}
                      onClick={handleExportPdf}
                    >
                      Xuất PDF
                    </StyledPopoverActionButton>
                  </PopoverContainer>
                </Popover>
              </>
            )}
             {onAdd && (
              <AddButton onClick={onAdd} $hasLabel={!!addButtonLabel}>
                <AddIcon />
                {addButtonLabel && addButtonLabel}
              </AddButton>
            )}
          </ActionsBox>
        </StyledToolbarkanba>
      )}

      {/* Calendar Header for date filtering */}
      <CalendarHeader mt={1}>
        <CalendarTitle>{getHeaderTitle()}</CalendarTitle>
        <CalendarButtonGroup>
          <CalendarGroupButton onClick={handlePrevDate}>&#8249;</CalendarGroupButton>
          <CalendarGroupDivider />
          <CalendarTodayButton onClick={handleToday}>Hôm nay</CalendarTodayButton>
          <CalendarGroupDivider />
          <CalendarGroupButton onClick={handleNextDate}>&#8250;</CalendarGroupButton>
        </CalendarButtonGroup>

        <SegmentedButtonGroup>
          <SegmentedButton
            active={timeFilter === "week"}
            onClick={handleSelectWeek}
          >
            Tuần
          </SegmentedButton>
          <SegmentedButton
            active={timeFilter === "month"}
            onClick={handleSelectMonth}
          >
            Tháng
          </SegmentedButton>
          <SegmentedButton
            active={timeFilter === "quarter"}
            onClick={handleSelectQuarter}
          >
            Quý
          </SegmentedButton>
        </SegmentedButtonGroup>
      </CalendarHeader>

      <DragDropContext onDragEnd={handleDragEnd}>
          <StyledKanbanStack direction="row" spacing={2}>
            {filteredColumns.map((col) => {
              return (
                <StyledColumnWrapper key={col.id}>
                  {/* --- HEADER CỘT --- */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "16px",
                    paddingLeft: "4px",
                  }}>
                    <div style={{
                      width: "8px",
                      height: "24px",
                      borderRadius: "4px",
                      backgroundColor: getAccentColor(col.id),
                      marginRight: "8px",
                    }} />
                    <span style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: theme.palette.mode === "dark" ? "#f8fafc" : "#17191C",
                    }}>
                      {col.title}
                    </span>
                    <span style={{
                      marginLeft: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#f1f5f9",
                      color: theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b",
                      fontSize: "11px",
                      fontWeight: "700",
                      borderRadius: "999px",
                      width: "22px",
                      height: "22px",
                    }}>
                      {col?.items?.length || 0}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <StyledColumnPaper
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        elevation={0}
                      >
                        {/* --- DANH SÁCH CARD --- */}
                        <StyledCardList >
                        {col.items.map((item, index) => {
                          const overdueDays = getOverdueDays(item.endDate);
                          return (
                            <Draggable
                              draggableId={item.id}
                              index={index}
                              key={item.id}
                              isDragDisabled // Luôn khóa kéo thả theo yêu cầu
                            >
                              {(provided, snapshot) => (
                                <StyledKanbanCard
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  isDragging={snapshot.isDragging}
                                  overdueDays={overdueDays}
                                  onClick={getClickHandler(item)}
                                >
                                  <StyledCardContent>
                                    <StyledCardContentBox>
                                      <StyledCardTextBox>
                                        {/* Priority Pill Badge */}
                                        {renderPriorityBadge(item.priority || item.flag)}

                                        {/* Title */}
                                        <SkyTooltip title={item.title}>
                                          <SkyStyledTypography>
                                            <b>{item.title}</b>
                                          </SkyStyledTypography>
                                        </SkyTooltip>

                                        {/* Metadata Row: Assigner */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                          <span style={{ fontSize: "14px", color: "#94A3B8" }}>Người giao:</span>
                                          <span style={{ fontSize: "15px", fontWeight: "500", color: theme.palette.text.primary }}>{item.assigner || "—"}</span>
                                        </div>

                                        {/* Metadata Row: End Date & Progress Text */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", marginTop:"12px" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: theme.palette.text.secondary }}>
                                            <StyledCalendarIcon />
                                            <span style={{ fontSize: "12px", fontWeight: "500", color: "#353940" }}>{item.endDateNotHTML || ""}</span>
                                          </div>
                                          <span style={{ fontSize: "12px", fontWeight: "600", color: "#353940" }}>
                                            {item.progress || 0}%
                                          </span>
                                        </div>

                                        {/* Slim Progress Bar */}
                                        {item.progress >= 0 && (
                                          <div style={{
                                            width: "100%",
                                            height: "6px",
                                            backgroundColor: theme.palette.mode === "dark" 
                                              ? "#334155" 
                                              : (item.progress === 0 ? "#ffffff" : "#e2e8f0"),
                                            borderRadius: "3px",
                                            border: item.progress === 0 && theme.palette.mode !== "dark"
                                              ? "1px solid #e2e8f0"
                                              : "none",
                                            overflow: "hidden",
                                            marginBottom: "12px",
                                            display: "flex",
                                            alignItems: "center"
                                          }}>
                                            <div style={{
                                              width: `${item.progress}%`,
                                              height: "100%",
                                              backgroundColor: item.progress === 0 
                                                ? "#ffffff" 
                                                : (item.progress > 0 && item.progress < 90 
                                                    ? "#2364B0" 
                                                    : (overdueDays > 0 
                                                        ? "#ef4444" 
                                                        : (col.id === "3" 
                                                            ? "#ef4444" 
                                                            : "#2563eb"))),
                                              borderRadius: "3px",
                                              transition: "width 0.3s ease",
                                            }} />
                                          </div>
                                        )}

                                        {/* Owner Title */}
                                        <div style={{ fontSize: "14px", color: "#94A3B8", marginBottom: "6px" }}>Chủ trì</div>

                                        {/* Divider */}
                                        <hr style={{ border: 0, borderTop: `1px solid ${theme.palette.divider}`, margin: "8px 0 12px 0" }} />

                                        {/* Owner Info & Checked Status Icon */}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <StyledAvatar avatarcolor={getAvatarColor(item.manager)}>
                                              {getAvatarInitials(item.manager)}
                                            </StyledAvatar>
                                            <span style={{ fontSize: "14px", fontWeight: "500", color: "#454545" }}>
                                              {item.manager || "Chưa có"}
                                            </span>
                                          </div>
                                          <StyledCheckIcon />
                                        </div>
                                      </StyledCardTextBox>
                                    </StyledCardContentBox>
                                  </StyledCardContent>
                                </StyledKanbanCard>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </StyledCardList>
                    </StyledColumnPaper>
                  )}
                </Droppable>
              </StyledColumnWrapper>
            );
          })}
          </StyledKanbanStack>
          {renderDetailModal()}
        </DragDropContext>
    </>
  );
};

KanbanBoard.propTypes = {
  initialColumns: PropTypes.array,
  onColumnsChange: PropTypes.func,
  onItemStatusChange: PropTypes.func,
  addButtonLabel: PropTypes.string,
};

export default KanbanBoard;