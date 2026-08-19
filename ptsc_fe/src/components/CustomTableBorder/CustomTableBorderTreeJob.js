/* eslint-disable react/forbid-component-props */
import React, { useCallback, useContext, useEffect, useState, useMemo, useRef } from "react";
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
  Popper,
  CircularProgress,
  PaginationItem,
  Typography,
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
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  API_CONFIG_TABLE,
  APP_BASE,
  API_ADD_COMMON_WORK,
} from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import PropTypes from "prop-types";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import dayjs from "dayjs";
import LoadingDialog from "@components/LoadingDialog";
import { useToast } from "@components/common/ToastProvider";
import api from "@services/api";
import {
  FilterBox,
  HeaderCellContainer,
  StyledPaper,
  StyledTable,
  StyledTableCell,
  StyledTableCellActions,
  StyledTableContainer,
  StyledTableHead,
  ActionIconButton,
  ActionsContainer,
  ActionsBox,
  SynchronizeButton,
  StyledTableRow,
  DeleteSelectedButton,
  ToolbarContent,
  StyleBoxInTableTree,
  PopoverContainer,
  StyleBoxActionDropDown,
  StyleActionCheckBox,
  StyleActionCellCheckBox,
  StyleActionButton,
  StyleActionButtonCancel,
  StyleActionButtonApply,
  StyledTableHeaderCell,
  SortIconContainer,
  StyledArrowUp,
  StyledArrowDown,
  StyledBoxBoderBuilder,
  StyledToolbarList,
  // StylePageButton,
  // StylePageDots,
} from "@styles/CustomTable.styles";
import {
  TreeTableCell,
  NodeName,
  TreeToggleWrapper,
  TreeToggleButton,
  StyledCollapseIcon,
  TreeCheckbox,
  FlagIcon,
  StyledPopoverActionButton,
  StyledExpandIcon,
  TreeRowBoxLevel,
} from "@styles/CustomTableTree.styles";
import { styled } from "@mui/material/styles";
import {
  SkyBox,
  SkyFlexGap8,
  SkyTypography,
  SkyIconButton,
} from "@styles/SkyStyles";
import DOMPurify from "dompurify";
const ConfigFilterBox = styled(FilterBox)({
  position: "static",
  boxShadow: "none",
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

const AddJobButton = styled('button')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '40px',
  padding: '0 16px',
  fontSize: '0.875rem',
  fontWeight: 600,
  borderRadius: '12px',
  border: 'none',
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background-color 0.18s ease',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '& svg': {
    fontSize: '1.25rem',
  },
}));

const RoundedIconButton = styled('button')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '12px',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
  },
  '& svg': {
    fontSize: '1.25rem',
  },
}));

const UnifiedSearchContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '12px',
  backgroundColor: theme.palette.background.paper,
  height: '40px',
  width: '320px',
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
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderTopLeftRadius: '6px',
    borderBottomLeftRadius: '6px',
  },
  '& span': {
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  '& svg': {
    fontSize: '1rem',
  }
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
  }
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
  borderRadius: '12px',
  background: 'transparent',
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  padding: '0 10px',
  height: '100%',
   '&:hover': {
    backgroundColor: "#F8F9FA",
    borderColor:"#0062AD",
  },
  '& svg': {
    fontSize: '1.25rem',
  }
}));

const BlueSearchButton = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '12px',
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '& svg': {
    fontSize: '1.25rem',
  }
}));

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

import { clearWidthSpace } from "@utils/Common/Common";
import { AuthContext } from "../../AuthContext/AuthProvider";
import { find } from "lodash";
import TuneIcon from "@builder-table/components/TuneIcon";
import { useDispatch, useSelector } from "react-redux";
import { addDataFieldConfig } from "@redux/slices/FormDesign/formDesignSlice";
import { upDateColumnTable } from "@redux/slices/CustomTable/CustomTableSlice";
import { StyleBoxTittle, StyleTittleBox, StyleTittleTyprography } from "@builder-table/components/SearchSection.styles";
import {
  PaginationContainer as BeautifulPaginationContainer,
  InfoBox as BeautifulInfoBox,
  StyledPagination as BeautifulStyledPagination,
  RowsPerPageBox as BeautifulRowsPerPageBox,
  DisplayTypography as BeautifulDisplayTypography,
  RowsPerPageSelect as BeautifulRowsPerPageSelect,
  RowsPerPageStack as BeautifulRowsPerPageStack,
} from "@builder-table/components/PaginationSection.styles";

const logger = console;

// --- STYLED COMPONENTS CHO FILE POPOVER & PROGRESS ---
const PopperStyled = styled(Popper)(() => ({
  zIndex: 1400,
  padding: "8px",
}));

const StyledBoxs = styled(SkyFlexGap8)(() => ({
  justifyContent: "flex-start",
  width: "100%",
}));

const FilePopoverContainer = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
  borderRadius: "8px",
  padding: "8px 0",
  minWidth: "220px",
  maxHeight: "350px",
  overflowY: "auto",
  border: `1px solid ${theme.palette.divider}`,
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#c6cbd1",
    borderRadius: "10px",
  },
}));

const FileCountTypography = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
  fontWeight: 500,
  cursor: "pointer",
  "&:hover": {
    textDecoration: "underline",
    color: theme.palette.primary.main,
  },
}));

const IconButtonStyled = styled(SkyIconButton)(({ theme }) => ({
  padding: "4px",
  color: "#405565",
  transition: "all 0.2s ease",
  "&:hover": {
    color: theme.palette.primary.main,
    backgroundColor: "transparent",
  },
}));

const StyledAttachFileIcon = styled(InsertDriveFileIcon)(() => ({
  fontSize: "1.2rem",
}));

const StyledAttachFileIconSmall = styled(StyledAttachFileIcon)(({ theme }) => ({
  marginRight: theme.spacing(1),
  fontSize: "1.1rem",
}));

const TypographyStyled = styled(SkyBox)(({ rowcolor }) => ({
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  whiteSpace: "normal",
  marginLeft: "5px",
  color: rowcolor || 'inherit'
}));

const HtmlCellWrapper = styled('div')(() => ({
  width: '100%'
}));

const TooltipSpan = styled('span')(() => ({
  width: '100%',
  display: 'block'
}));

const MenuItemStyled = styled(MenuItem)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  minWidth: 200,
  fontSize: "0.875rem",
}));

const FileContentBox = styled(SkyFlexGap8)(() => ({
  maxWidth: "calc(100% - 30px)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const StyledEditableDateBox = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  position: "relative",
  "& .edit-icon-hover": {
    color: "#0F6BB2",
    opacity: 0,
    marginLeft: "6px",
    transition: "opacity 0.2s, color 0.2s",
    fontSize: "1rem",
  },
  "&:hover .edit-icon-hover": {
    opacity: 1,
  },
});

const EditableDateCell = ({ row, content, setReloadData, toast, setLoadingDate }) => {
  const pickerContainerRef = useRef(null);

  const getParsedDate = useCallback((val) => {
    if (!val) return null;
    const parsed = dayjs(val, ["DD/MM/YYYY HH:mm", "DD/MM/YYYY", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true);
    return parsed.isValid() ? parsed : dayjs(val);
  }, []);

  const isDateOnlyBoundary = useCallback((value, parsedValue) => {
    if (!value && !parsedValue) return false;

    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return false;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw) || /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return true;
      }
      if (/T00:00(?::00(?:\.000)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(raw)) {
        return true;
      }
    }

    const effectiveParsed = parsedValue || getParsedDate(value);
    return !!(
      effectiveParsed?.isValid?.() &&
      effectiveParsed.hour() === 0 &&
      effectiveParsed.minute() === 0 &&
      effectiveParsed.second() === 0 &&
      effectiveParsed.millisecond() === 0
    );
  }, [getParsedDate]);

  const parentStartDateStr = row?.deadlineStartParentISO ?? row?.deadlineStartParent;
  const parentEndDateStr = row?.deadlineEndParentISO ?? row?.deadlineEndParent;
  const parentStartDate = getParsedDate(parentStartDateStr);
  const parentEndDate = getParsedDate(parentEndDateStr);

  const normalizedParentStartDate = parentStartDate?.isValid?.()
    ? (isDateOnlyBoundary(parentStartDateStr, parentStartDate) ? parentStartDate.startOf("day") : parentStartDate)
    : null;
  const normalizedParentEndDate = parentEndDate?.isValid?.()
    ? (isDateOnlyBoundary(parentEndDateStr, parentEndDate) ? parentEndDate.endOf("day") : parentEndDate)
    : null;

  const hasParentConstraints = !!(parentStartDateStr || parentEndDateStr);

  const handleCellClick = useCallback((e) => {
    e.stopPropagation();
    if (pickerContainerRef.current) {
      const trigger = pickerContainerRef.current.querySelector(".MuiInputBase-root") || pickerContainerRef.current.querySelector("input");
      if (trigger) {
        trigger.click();
      }
    }
  }, []);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

 const handleDateRangeChange = useCallback((selectedDates) => {
    const newStart = selectedDates.startDate ? dayjs(selectedDates.startDate) : null;
    const newEnd = selectedDates.endDate ? dayjs(selectedDates.endDate) : null;

    if (newStart && newEnd && newEnd.isBefore(newStart)) {
      toast("Hạn xử lý phải lớn hơn hoặc bằng ngày bắt đầu", "error");
      return;
    }

    if (hasParentConstraints) {
      if (newStart && normalizedParentStartDate?.isValid() && newStart.isBefore(normalizedParentStartDate)) {
        toast(`Ngày bắt đầu không được trước ngày bắt đầu của công việc cha (${normalizedParentStartDate.format('DD/MM/YYYY HH:mm')})`, "error");
        return;
      }
      if (newStart && normalizedParentEndDate?.isValid() && newStart.isAfter(normalizedParentEndDate)) {
        toast(`Ngày bắt đầu không được vượt quá hạn kết thúc của công việc cha (${normalizedParentEndDate.format('DD/MM/YYYY HH:mm')})`, "error");
        return;
      }
      if (newEnd && normalizedParentEndDate?.isValid() && newEnd.isAfter(normalizedParentEndDate)) {
        toast(`Hạn xử lý không được vượt quá hạn kết thúc của công việc cha (${normalizedParentEndDate.format('DD/MM/YYYY HH:mm')})`, "error");
        return;
      }
    }

    const executePatch = async () => {
      setLoadingDate(true);
      try {
        let cleanUrl = "/api/tasks";
        if (cleanUrl && cleanUrl.includes("?")) {
          cleanUrl = cleanUrl.split("?")[0];
        }
        let finalUrl = cleanUrl;
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
          finalUrl = `${APP_BASE}${cleanUrl}`;
        }

        const id = row.id || row._id || row.documentId || row.bookDocumentId;
        const payload = {
          startDate: newStart ? newStart.toISOString() : null,  // ✅ dùng lại biến đã parse
          endDate: newEnd ? newEnd.toISOString() : null,
        };
        await axiosInstance.patch(`${APP_BASE}/api/tasks/${id}`, payload);
        toast("Cập nhật thời gian thành công!", "success");
        setReloadData?.(Date.now());
      } catch (error) {
        toast(error?.response?.data?.message || "Cập nhật thời gian thất bại!", "error");
      } finally {
        setLoadingDate(false);  // ✅ chỉ cần 1 chỗ trong finally
      }
    };

    executePatch();
  }, [row, toast, setReloadData, setLoadingDate, hasParentConstraints, normalizedParentStartDate, normalizedParentEndDate]);
 
   const minDate = hasParentConstraints && normalizedParentStartDate && normalizedParentStartDate.isValid()
     ? normalizedParentStartDate
     : dayjs().startOf("day");
   const maxDate = hasParentConstraints && normalizedParentEndDate && normalizedParentEndDate.isValid()
     ? normalizedParentEndDate
     : undefined;
 

  return (
    <StyledEditableDateBox onClick={handleCellClick}>
      {content}
      <EditIcon className="edit-icon-hover" />
      <div
        ref={pickerContainerRef}
        onClick={handleStopPropagation}
        onMouseDown={handleStopPropagation}
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <DateTimeRangePicker
          showTime
          label="Ngày bắt đầu - Hạn xử lý"
          value={{
            startDate: row.startDateISO ? getParsedDate(row.startDateISO) : null,
            endDate: (row.endDateISO || row.deadline) ? getParsedDate(row.endDateISO || row.deadline) : null,
          }}
          onChange={handleDateRangeChange}
          minDate={minDate}
          maxDate={maxDate}
          startLabel="Ngày bắt đầu"
          endLabel="Hạn xử lý"
        />
      </div>
    </StyledEditableDateBox>
  );
};

const TruncatedCell = ({ content, onClick, rowcolor }) => {
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const text = Array.isArray(content) ? content.join(", ") : content;

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      if (element.scrollHeight > element.clientHeight) {
        setIsTruncated(true);
      } else {
        setIsTruncated(false);
      }
    }
  }, [text, content]);

  return (
    <Tooltip
      title={text || ""}
      placement="top"
      disableHoverListener={!isTruncated}
    >
      <TypographyStyled
        component="span"
        onClick={onClick}
        variant="body2"
        ref={textRef}
        rowcolor={rowcolor}
      >
        {text}
      </TypographyStyled>
    </Tooltip>
  );
};


// --- END STYLED COMPONENTS ---

// Helper functions cho pagination
// const createPageButton = (pageNumber, currentPage, handlePageChange) => {
//   const isActive = currentPage === pageNumber;

//   const handleClick = function () {
//     handlePageChange(null, pageNumber);
//   };

//   return (
//     <StylePageButton
//       key={pageNumber}
//       size="small"
//       onClick={handleClick}
//       isActive={isActive}
//     >
//       {pageNumber}
//     </StylePageButton>
//   );
// };

// const createPageDots = (key) => {
//   return <StylePageDots key={key}>...</StylePageDots>;
// };

// const generatePaginationPages = (page, totalPages, handlePageChange) => {
//   const pages = [];
//   const currentPage = page + 1;

//   if (totalPages === 0) return pages;

//   pages.push(createPageButton(1, currentPage, handlePageChange));

//   if (totalPages === 1) return pages;

//   if (currentPage > 4) {
//     pages.push(createPageDots('dots-start'));
//   }

//   let startPage = Math.max(2, currentPage - 1);
//   let endPage = Math.min(totalPages - 1, currentPage + 1);

//   if (currentPage <= 3) {
//     endPage = Math.min(totalPages - 1, 4);
//   }

//   if (currentPage >= totalPages - 2) {
//     startPage = Math.max(2, totalPages - 3);
//   }

//   for (let i = startPage; i <= endPage; i++) {
//     pages.push(createPageButton(i, currentPage, handlePageChange));
//   }

//   if (currentPage < totalPages - 2 && totalPages > 5) {
//     pages.push(createPageDots('dots-end'));
//   }

//   if (totalPages > 1) {
//     pages.push(createPageButton(totalPages, currentPage, handlePageChange));
//   }

//   return pages;
// };

const CustomTableBorderTreeJob = ({
  children,
  data: dataProp = [],
  fetchData,
  filter,
  columns,
  onAdd,
  onDelete,
  onView,
  onAddChild,
  onAssign,
  // onApprove,
  // onSearch,
  // latestUpdatedId,
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
  onCellClick,
  onSelectView,
  setReloadData,
  // Props cho nút toggle bộ lọc nhanh
  onMyAssign,
  onMyDirector,
  onMySupporter,
  activeTaskView,
  addButtonLabel = "Thêm công việc",
  onAdvancedFilterClick,
  isSortStart,
  paramChildren = {},
}) => {
  const [selected, setSelected] = useState([]);
  const [loadingDate, setLoadingDate] = useState(false);
  const toast = useToast();
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle);
  const dispatch = useDispatch();
  // Biến xác định có đang tìm kiếm không
  const [searchText, setSearchText] = useState("");
  // const isSearching = searchText && searchText.trim() !== "";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState([
    25, 50, 100, 500,
  ]);
  const [openFilter, setOpenFilter] = useState(false);
  const firstSortWithCode = columns[0]?.row;
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState(firstSortWithCode);
  const [columnWidths, setColumnWidths] = useState(() => {
    const map = {};
    (columns || []).forEach((c) => {
      const colIdentifier = c.key || c.row;
      if (c?.width && colIdentifier) map[colIdentifier] = c.width;
    });
    return map;
  });
  const [resizingCol, setResizingCol] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState(
    filter?.map((col) => col.name)
  );
  const [data, setData] = useState(dataProp); // Dữ liệu từ API
  const [total, setTotal] = useState(dataProp.length); // Tổng số bản ghi từ API

  // --- STATE & REFS CHO FILE POPOVER ---
  const [filePopoverAnchorEl, setFilePopoverAnchorEl] = useState(null);
  const [loadingFileIndex, setLoadingFileIndex] = useState(null);
  const [currentFiles, setCurrentFiles] = useState([]);
  const popoverTimeoutRef = useRef(null);
  const openFilePopper = Boolean(filePopoverAnchorEl);

  const handleMouseEnterFileIcon = useCallback((row, key) => (event) => {
    if (popoverTimeoutRef.current) {
      clearTimeout(popoverTimeoutRef.current);
    }
    const files = row[key] || [];
    setCurrentFiles(files);
    setFilePopoverAnchorEl(event.currentTarget);
  }, []);

  const handleCloseFilePopoverWithDelay = useCallback(() => {
    popoverTimeoutRef.current = setTimeout(() => {
      setFilePopoverAnchorEl(null);
    }, 300);
  }, []);

  const handlePopoverMouseEnter = () => {
    if (popoverTimeoutRef.current) {
      clearTimeout(popoverTimeoutRef.current);
    }
  };

  const handleClosePopper = useCallback(() => {
    setFilePopoverAnchorEl(null);
  }, []);

  const handleFileClick = (file, index) => async () => {
    setLoadingFileIndex(index);
    try {
      // Giả sử có hàm downloadFile hoặc logic xử dạng click file ở đây
      // Ở bản gốc thường gọi window.open hoặc api
      const fileUrl = file.url || file.path;
      if (fileUrl) {
        window.open(fileUrl, '_blank');
      }
    } catch (error) {
      // toast("Lỗi khi tải file", "error");
    } finally {
      setLoadingFileIndex(null);
    }
  };
  // --- END STATE & REFS CHO FILE POPOVER ---

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

  // Gọi fetchData khi searchText, filter, hoặc reload thay đổi
  useEffect(() => {
    setPage(0);
  }, [searchText, filter, rowsPerPage]);

  useEffect(() => {
    const sortField = orderBy || firstSortWithCode;
    const sort = sortField
      ? { [sortField]: order === "asc" ? 1 : -1 }
      : undefined;

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

  useEffect(() => {
    if (reload !== undefined && reload !== null) {
      setExpanded({});
      setChildDataMap({});
      setChildPaginationMap({});
      loadingRef.current = {};
    }
  }, [reload]);

  // Xử lý tìm kiếm
  const handleSearchClick = (query, code) => {
    const sortField = orderBy || firstSortWithCode;
    const sort = sortField
      ? { [sortField]: order === "asc" ? 1 : -1 }
      : undefined;
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

  const handleSort = useCallback(
    (columnName) => {
      const isCurrentColumn = orderBy === columnName;
      const newOrder = isCurrentColumn
        ? order === "asc"
          ? "desc"
          : "asc"
        : "asc";
      setOrder(newOrder);
      setOrderBy(columnName);
      setPage(0);
    },
    [order, orderBy]
  );

  const handleSortClick = useCallback(
    (columnName) => () => {
      handleSort(columnName);
    },
    [handleSort]
  );

  const handleMouseDownResize = useCallback((e, colName) => {
    e.preventDefault();
    const el = document.getElementById(`col-border-tree-${colName}`);
    const curWidth = el ? el.offsetWidth : 120;
    setResizingCol(colName);
    setStartX(e.clientX);
    setStartWidth(curWidth);
  }, []);

  const handleResizeMouseDownCallback = useCallback(
    (colName) => (e) => {
      handleMouseDownResize(e, colName);
    },
    [handleMouseDownResize]
  );

  const handleStopPropagationClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (!resizingCol) return undefined;
    const onMove = (e) => {
      const dx = e.clientX - startX;
      const newWidth = Math.max(40, startWidth + dx);
      setColumnWidths((prev) => ({ ...prev, [resizingCol]: newWidth }));
    };
    const onUp = () => {
      setResizingCol(null);
      setColumnWidths((currentWidths) => {
        const updatedColumns = columns.map((col) => {
          const colIdentifier = col.key || col.row;
          if (currentWidths[colIdentifier]) {
            const newWidth = parseFloat(currentWidths[colIdentifier]);
            return { ...col, width: `${newWidth}px` };
          }
          return col;
        });
        dispatch(addDataFieldConfig(updatedColumns));
        if (codeModule) {
          (async () => {
            try {
              const body = {
                columns: updatedColumns,
                module: codeModule,
              };
              await dispatch(upDateColumnTable(body)).unwrap();

              // Cập nhật localStorage để đồng bộ ngay lập tức, tránh bị reset khi load lại trang
              const viewConfigStr = localStorage.getItem("viewConfig");
              if (viewConfigStr) {
                const viewConfigData = JSON.parse(viewConfigStr);
                const configArray = Array.isArray(viewConfigData) ? viewConfigData : viewConfigData?.data;
                const targetConfig = configArray?.find((c) => c.code === codeModule);
                if (targetConfig && Array.isArray(targetConfig.field)) {
                  targetConfig.field = targetConfig.field.map((f) => {
                    const matchedCol = updatedColumns.find(
                      (col) => (col.originalField?.name || col.key || col.row) === f.name
                    );
                    if (matchedCol?.width) {
                      return { ...f, width: matchedCol.width };
                    }
                    return f;
                  });
                  localStorage.setItem("viewConfig", JSON.stringify(viewConfigData));
                }
              }

              toast("Lưu cấu hình độ rộng cột thành công", "success");
            } catch (err) {
              logger.log("Failed to save column config:", err);
              toast("Lưu cấu hình độ rộng cột thất bại", "error");
            }
          })();
        }
        return currentWidths;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizingCol, startX, startWidth, columns, dispatch, codeModule, toast]);



  const [expanded, setExpanded] = useState({});
  const loadingRef = useRef({});
  const prevIsMyJobRef = useRef(false);
  const [childDataMap, setChildDataMap] = useState({});
  const [childPaginationMap, setChildPaginationMap] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});

  const fetchChildren = useCallback(async (parentId, page = 1) => {
    if (loadingRef.current[parentId]) return;

    loadingRef.current[parentId] = true;
    setLoadingChildren((prev) => ({ ...prev, [parentId]: true }));
    try {
      const params = { page, limit: 10, ...paramChildren };
      if (isSortStart !== undefined) {
        params.isSortStart = isSortStart;
      }
      const childrenBaseUrl = API_ADD_COMMON_WORK;
      const response = await api.get(`${childrenBaseUrl}/${parentId}/children`, { params });

      const resData = response.data;
      const newItems = resData.data || [];
      const totalPages = resData.totalPages || 0;
      const total = resData.total || 0;

      setChildDataMap((prev) => {
        const existing = prev[parentId] || [];
        return {
          ...prev,
          [parentId]: page === 1 ? newItems : [...existing, ...newItems],
        };
      });

      setChildPaginationMap((prev) => ({
        ...prev,
        [parentId]: { page, totalPages, total },
      }));
    } catch (error) {
      toast(error?.response?.data?.message || "Lỗi khi tải dữ liệu con", "error");
      setChildDataMap((prev) => ({
        ...prev,
        [parentId]: [], // set to empty array on failure to avoid infinite fetch loop
      }));
    } finally {
      loadingRef.current[parentId] = false;
      setLoadingChildren((prev) => ({ ...prev, [parentId]: false }));
    }
  }, [paramChildren, isSortStart, toast]);

  // Tự động mở rộng (expand) cây và tải dữ liệu con cháu chắt khi isMyJob = true
  useEffect(() => {
    const isMyJob =
      paramChildren?.["filter[myDirector]"] === true ||
      paramChildren?.["filter[myDirector]"] === "true" ||
      paramChildren?.["filter[mySupporter]"] === true ||
      paramChildren?.["filter[mySupporter]"] === "true" ||
      activeTaskView === "myDirector" || 
      activeTaskView === "mySupporter";

    if (isMyJob) {
      if (data && data.length > 0) {
        // Thu thập tất cả các node hiện có (nút gốc + các nút con đã được tải)
        const allNodes = [];
        allNodes.push(...data);
        Object.values(childDataMap).forEach((children) => {
          if (Array.isArray(children)) {
            allNodes.push(...children);
          }
        });

        let hasNewExpand = false;
        const newExpanded = { ...expanded };

        allNodes.forEach((node) => {
          const nodeId = node.id || node._id;
          if (nodeId && node.flags?.hasChildren) {
            if (!newExpanded[nodeId]) {
              newExpanded[nodeId] = true;
              hasNewExpand = true;
            }
            // Tải dữ liệu con nếu chưa có và không đang tải
            if (!childDataMap[nodeId] && !loadingRef.current[nodeId]) {
              fetchChildren(nodeId, 1);
            }
          }
        });

        if (hasNewExpand) {
          setExpanded(newExpanded);
        }
      }
    } else {
      // Chỉ thu gọn cây về mặc định nếu isMyJob vừa chuyển từ true sang false
      if (prevIsMyJobRef.current) {
        setExpanded({});
      }
    }
    prevIsMyJobRef.current = isMyJob;
  }, [data, paramChildren, activeTaskView, childDataMap, fetchChildren, expanded]);

  const toggleExpand = useCallback((id) => {
    setExpanded((prev) => {
      const isExpanding = !prev[id];
      if (isExpanding && !childDataMap[id] && !loadingRef.current[id]) {
        fetchChildren(id, 1);
      }
      if (!isExpanding) {
        // If collapsing and it was empty (e.g. failed), clear it so they can retry
        setChildDataMap((curr) => {
          if (curr[id] && curr[id].length === 0) {
            const next = { ...curr };
            delete next[id];
            return next;
          }
          return curr;
        });
      }
      return { ...prev, [id]: isExpanding };
    });
  }, [childDataMap, fetchChildren]);

  const handleLoadMore = useCallback((parentId) => {
    const pagination = childPaginationMap[parentId];
    if (pagination && !loadingRef.current[parentId]) {
      fetchChildren(parentId, (pagination.page || 1) + 1);
    }
  }, [childPaginationMap, fetchChildren]);

  const handleLoadMoreClick = useCallback((parentId) => () => {
    handleLoadMore(parentId);
  }, [handleLoadMore]);

  const handleToggleExpandClick = useCallback((id) => (e) => {
    if (e) e.stopPropagation();
    toggleExpand(id);
  }, [toggleExpand]);

  const handleSelectViewClick = useCallback((row) => (e) => {
    e.stopPropagation();
    if (onSelectView) onSelectView(row);
  }, [onSelectView]);

  const handleClick = useCallback((event, rowId) => {
    event.stopPropagation();
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
    (item) => (e) => {
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      if (item.onClick) {
        item.onClick();
      }
      handleClose();
    },
    [handleClose]
  );

  const handleSelectRows = (id) => (e) => {
    e.stopPropagation();
    const isChecked = e.target.checked;
    setSelected((prev) =>
      isChecked ? [...prev, id] : prev.filter(item => item !== id)
    );
  };

  const handleFlagClick = useCallback(
    (row) => async (e) => {
      e.stopPropagation();

      // Xử lý trường hợp row.priority là object
      const priorityVal = typeof row.priority === 'object' && row.priority !== null 
        ? (row.priority.value || row.priority.code || row.priority.id || row.priority._id) 
        : row.priority;
        
      const currentPriority = String(priorityVal || "").toLowerCase();

      const isUrgent = currentPriority === "gap" || currentPriority === "gấp" || currentPriority === "1";

      const newPriorityValue = isUrgent ? "binhthuong" : "gap";
      
      try {
        const id = row.id || row._id || row.documentId || row.bookDocumentId;
        if (!id) return;
        await axiosInstance.patch(`${APP_BASE}/api/tasks/${id}`, {
          priority: newPriorityValue
        });

        toast("Cập nhật độ ưu tiên thành công!", "success");
        setReloadData?.(Date.now());
      } catch (error) {
        toast(error?.response?.data?.message || "Cập nhật độ ưu tiên thất bại!", "error");
      }
    },
    [setReloadData, toast]
  );

  // Hàm render cây, có xử lý các node "mồ côi"
  const renderRows = (rows, level = 0) => {
    return rows.map((row, index) => {
      const rowId = row.id || row._id;
      const localChildren = data.filter((item) => {
        const itemParentId = item?.parent?._id || item?.parent;
        const currentRowId = row?._id || row?.id;
        return itemParentId && currentRowId && String(itemParentId) === String(currentRowId) && String(item?._id || item?.id) !== String(currentRowId);
      });
      const fetchedChildren = childDataMap[rowId] || [];
      const childNodes = fetchedChildren.length > 0 ? fetchedChildren : localChildren;
      const hasChildren = row?.flags?.hasChildren !== undefined ? row?.flags?.hasChildren : (localChildren.length > 0);
      const isExpanded = expanded[rowId];
      const pagination = childPaginationMap[rowId];
      const hasMore = pagination && pagination.page < pagination.totalPages;

      const itemParentIdForOrphan = row?.parent?._id || row?.parent;
      if (level === 0 && itemParentIdForOrphan && !data.some(d => String(d?._id || d?.id) === String(itemParentIdForOrphan))) {
        // Bỏ qua không render ở đây, vì nó sẽ được render trong vòng lặp "mồ côi"
      }

      const handlers = createRowHandlers(row);
      const handleToggleExpand = handleToggleExpandClick(rowId);
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
          <StyledTableRow
            index={index}
            onClick={onSelectView ? handleSelectViewClick(row) : undefined}
            clickable={!!onSelectView}
          >
            {visibleColumns.includes("tree_name") && (
              <TreeTableCell $level={level}>
                <TreeRowBoxLevel>
                  {/* Nút mở rộng nếu có con */}
                  <TreeToggleWrapper>
                    {hasChildren ? (
                      <TreeToggleButton size="small" onClick={handleToggleExpand}>
                        {isExpanded ? <StyledCollapseIcon /> : <StyledExpandIcon />}
                      </TreeToggleButton>
                    ) : (
                      <TreeToggleButton size="small" sx={{ visibility: "hidden" }}>
                        <StyledExpandIcon />
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
                  <div 
                    onClick={handleFlagClick(row)} 
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                  >
                    <FlagIcon
                      priority={row?.priority}
                      iscompleted={(row?.progress === 100).toString()}
                    />
                  </div>

                  {/* Tên node - click để mở panel */}
                  <NodeName
                    onClick={handleSelectViewClick(row)}
                    style={{ cursor: onSelectView ? "pointer" : "default" }}
                  >
                    {row?.name}
                  </NodeName>
                </TreeRowBoxLevel>
              </TreeTableCell>
            )}

            {/* Các cột khác */}
            {activeColumns.map((column) => {
              const key = column.key || column.row;
              const cell = column.accessor ? column.accessor(row) : row[key];
              const dynamicTextColor = row.color || null;
              const createCellClickHandlerEr = (row, key) => (e) => {
                if (onSelectView) {
                  onSelectView(row);
                } else if (onCellClick) {
                  if (e) e.stopPropagation();
                  onCellClick(row, key);
                }
              };

              return (
                <StyledTableCell
                  key={key}
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
                    {(() => {
                      if (key === "startDate" || key === "endDate") {
                        const content = (
                          <StyledBoxs>
                            {typeof cell === 'string' ? (
                              (() => {
                                let decoded = cell;
                                if (decoded.includes('&lt;') || decoded.includes('&gt;') || decoded.includes('&amp;') || decoded.includes('&quot;')) {
                                  decoded = decoded
                                    .replace(/&lt;/g, '<')
                                    .replace(/&gt;/g, '>')
                                    .replace(/&quot;/g, '"')
                                    .replace(/&amp;/g, '&');
                                }

                                const hasHtml = /<[^>]+>/.test(decoded);
                                if (hasHtml) {
                                  return <HtmlCellWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((decoded)) }} />;
                                }
                                return <TruncatedCell content={decoded} onClick={createCellClickHandlerEr(row, key)} rowcolor={dynamicTextColor} />;
                              })()
                            ) : (
                              <TruncatedCell content={cell} onClick={createCellClickHandlerEr(row, key)} rowcolor={dynamicTextColor} />
                            )}
                          </StyledBoxs>
                        );
                        const currentTooltip = key === "startDate" ? row?.startDateTooltip : row?.endDateTooltip;
                        const tooltipWrapper = (children) => {
                          if (currentTooltip && currentTooltip.length > 0) {
                            return (
                              <Tooltip
                                title={
                                  <div style={{ padding: "4px" }}>
                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentTooltip) }} />
                                  </div>
                                }
                                arrow
                                placement="top"
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      backgroundColor: "#ffffff !important",
                                      color: "#333333 !important",
                                      boxShadow: "0px 2px 8px rgba(0,0,0,0.15) !important",
                                      border: "1px solid #dddddd !important",
                                      borderRadius: "6px !important",
                                      padding: "10px !important",
                                      fontSize: "13px !important",
                                      maxWidth: "320px !important",
                                      "& .MuiTooltip-arrow": {
                                        color: "#ffffff !important",
                                        "&::before": {
                                          border: "1px solid #dddddd !important",
                                          backgroundColor: "#ffffff !important",
                                        },
                                      },
                                    },
                                  },
                                }}
                              >
                                <span style={{ display: "inline-flex", width: "100%" }}>{children}</span>
                              </Tooltip>
                            );
                          }
                          return children;
                        };

                        if (row?.flags?.isAssigner === true) {
                          return tooltipWrapper(
                            <EditableDateCell
                              row={row}
                              content={content}
                              setReloadData={setReloadData}
                              toast={toast}
                              setLoadingDate={setLoadingDate}
                            />
                          );
                        }

                        return tooltipWrapper(content);
                      }

                      if (key === "progressView" || key === "progress") {
                        const progressHtml = row.progressView || cell;
                        // Only apply specialized tooltip if it looks like a progress string/HTML
                        if (typeof progressHtml === 'string' && progressHtml.includes('<div')) {
                          return (
                            // <Tooltip
                            //   title={<div dangerouslySetInnerHTML={{ __html: row.slowReason || "Không có lý do chậm trễ" }} />}
                            //   arrow
                            //   placement="top"
                            // >
                              <TooltipSpan>
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((progressHtml)) }} />
                              </TooltipSpan>
                            // </Tooltip>
                          );
                        }
                      }

                      if (key === "files" && Array.isArray(cell) && cell.length > 0) {
                        return (
                          <StyledBoxs>
                            <IconButtonStyled
                              onMouseEnter={handleMouseEnterFileIcon(row, key)}
                              onMouseLeave={handleCloseFilePopoverWithDelay}
                            >
                              <StyledAttachFileIcon />
                            </IconButtonStyled>
                            <FileCountTypography variant="caption">
                              ({cell.length})
                            </FileCountTypography>
                          </StyledBoxs>
                        );
                      }

                      if (typeof cell === 'string') {
                        let decoded = cell;
                        if (decoded.includes('&lt;') || decoded.includes('&gt;') || decoded.includes('&amp;') || decoded.includes('&quot;')) {
                          decoded = decoded
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&amp;/g, '&');
                        }

                        const hasHtml = /<[^>]+>/.test(decoded);
                        if (hasHtml) {
                          return <HtmlCellWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((decoded)) }} />;
                        }

                        return <TruncatedCell content={decoded} onClick={createCellClickHandlerEr(row, key)} rowcolor={dynamicTextColor} />;
                      }

                      return <TruncatedCell content={cell} onClick={createCellClickHandlerEr(row, key)} rowcolor={dynamicTextColor} />;
                    })()}
                  </StyleBoxInTableTree>
                </StyledTableCell>
              );
            })}

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
                    onClick: () => onAddChild(row, rowId, row.name),
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
          {isExpanded && (
            <>
              {renderRows(childNodes, level + 1)}
              {loadingChildren[rowId] && (
                <StyledTableRow>
                  <StyledTableCell colSpan={activeColumns.length + (visibleColumns.includes("tree_name") ? 1 : 0) + 1}>
                    <Box style={{ display: "flex", justifyContent: "center", padding: "10px", paddingLeft: `${(level + 1) * 32}px` }}>
                      <CircularProgress size={24} />
                    </Box>
                  </StyledTableCell>
                </StyledTableRow>
              )}
              {hasMore && !loadingChildren[rowId] && (
                <StyledTableRow>
                  <StyledTableCell colSpan={activeColumns.length + (visibleColumns.includes("tree_name") ? 1 : 0) + 1}>
                    <Box style={{ display: "flex", paddingLeft: `${(level + 1) * 32}px`, paddingBottom: "10px" }}>
                      <SkyTypography
                        variant="caption"
                        style={{ color: "#0F6BB2", cursor: "pointer", fontWeight: "bold" }}
                        onClick={handleLoadMoreClick(rowId)}
                      >
                        Xem thêm...
                      </SkyTypography>
                    </Box>
                  </StyledTableCell>
                </StyledTableRow>
              )}
            </>
          )}
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

  // const handlePrevPageClick = (e) => {
  //   handlePageChange(e, page);
  // };

  // const handleNextPageClick = (e) => {
  //   handlePageChange(e, page + 2);
  // };

  const handleSelectAllColumns = (e) => {
    if (e.target.checked) {
      setTempSelectedColumns(filter?.map((col) => col.name) || []);
    } else {
      setTempSelectedColumns([]);
    }
  };

  const handleClearSearch = useCallback(() => {
    setSearchText("");
  }, []);

  const handleApplyFilter = () => {
    setSelectedColumns(tempSelectedColumns); // Áp dụng thay đổi
    handleSearchButtonClick(); // Tìm kiếm lại
    handleClickAway(); // Đóng dropdown
  };
  return (
    <>
      <StyleBoxTittle>
        {/* ✅ TITLE - DÒNG RIÊNG */}
        {currentPageTitle && !disableTitle && (
          <StyleTittleBox>
            <StyleTittleTyprography variant="h5">
              {currentPageTitle}
            </StyleTittleTyprography>
          </StyleTittleBox>
        )}
        <StyledPaper isInsideDialog={isInsideDialog} autoHeight={autoHeight} sx={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)", borderRadius: "16px 0 16px 16px" }}>
          <StyledToolbarList>
            {/* ===== TOOLBAR TRÁI: Bộ lọc + Search + Filter + Việc của tôi / Việc tôi giao ===== */}
            <ToolbarContent>
              <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <UnifiedSearchContainer>
                  <ClickAwayListener onClickAway={handleClickAway}>
                    <Box sx={{ position: 'relative', height: '100%' }}>
                      <PillFilterTrigger onClick={onAdvancedFilterClick || handleToggleFilter}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.7398 2.01172L1.33984 2.01172L6.69984 8.34992L6.69984 12.7317L9.37984 14.0717L9.37984 8.34992L14.7398 2.01172Z" stroke="currentColor" strokeWidth="1.34" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Bộ lọc</span>
                      </PillFilterTrigger>

                      {openFilter && (
                        <FilterBox alignRight = {false}>
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
                            <StyleActionButtonCancel onClick={handleClickAway}>
                              Hủy
                            </StyleActionButtonCancel>
                            <StyleActionButtonApply variant="contained" onClick={handleApplyFilter}>
                              Áp dụng
                            </StyleActionButtonApply>
                          </StyleActionButton>
                        </FilterBox>
                      )}
                    </Box>
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
                    <Search />
                  </Tooltip>
                </BlueSearchButton>
              </Box>

              {/* Render advanced filter popover without button */}
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

            {/* ===== TOOLBAR PHẢI: Config + Export + Thêm công việc ===== */}
            <ActionsContainer>
              <ActionsBox>
                {selected.length > 0 && !disableCheckbox && !disableDelete && (
                  <DeleteSelectedButton onClick={handleClickDelete}>
                    <Tooltip title="Xóa">
                      <DeleteOutline />
                    </Tooltip>
                  </DeleteSelectedButton>
                )}

                {!disableSynchronize && (
                  <SynchronizeButton>
                    <Tooltip title="Đồng bộ">
                      <LoopOutlined />
                    </Tooltip>
                  </SynchronizeButton>
                )}

                {/* Nút Cấu hình bảng (icon) */}
                <RoundedIconButton onClick={handleOpenConfig}>
                  <Tooltip title="Cấu hình bảng">
                    <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.32704 2.49C9.32704 2.26987 9.23956 2.05882 9.08385 1.90316C8.92823 1.74758 8.71708 1.66 8.49704 1.66L8.13226 1.66C7.91223 1.66 7.70107 1.74758 7.54545 1.90316C7.38982 2.05882 7.30226 2.26987 7.30226 2.49V2.63995C7.30184 3.0766 7.18606 3.5061 6.96752 3.88414C6.74906 4.262 6.4353 4.57613 6.05729 4.79439L6.05649 4.79357L5.70228 5.00026L5.69984 5.00189C5.32141 5.22029 4.89179 5.33502 4.45484 5.33502C4.01787 5.33497 3.58828 5.22038 3.20985 5.00189L3.11015 4.94839L3.08583 4.93542C2.89538 4.82558 2.66924 4.79595 2.45684 4.85274C2.27087 4.90248 2.10868 5.01473 1.99726 5.16967L1.95269 5.23856L1.77031 5.55387C1.66116 5.74395 1.63189 5.96943 1.68845 6.18123C1.73816 6.36714 1.85051 6.52939 2.00537 6.64081L2.07427 6.68539L2.11885 6.71295L2.24286 6.79562C2.59907 7.01141 2.89567 7.31211 3.10528 7.6726C3.3237 8.04834 3.43985 8.47496 3.44247 8.90955V9.33426L3.43761 9.49802C3.41397 9.87982 3.3031 10.252 3.11177 10.5849C2.8954 10.9614 2.58354 11.2736 2.20882 11.4928L2.20963 11.4936L2.08481 11.5681L2.07427 11.5746C1.884 11.6848 1.74524 11.8663 1.68845 12.0787C1.63189 12.2906 1.66116 12.5161 1.77031 12.7061L1.95187 13.0215C2.06207 13.2117 2.24445 13.3505 2.45684 13.4072C2.66924 13.464 2.89538 13.4344 3.08583 13.3246L3.11015 13.3116L3.20985 13.2581L3.35412 13.1811C3.69581 13.0127 4.07245 12.925 4.45484 12.925C4.83716 12.925 5.21392 13.0128 5.55557 13.1811L5.69984 13.2581L5.70228 13.2597L6.05649 13.4656C6.43449 13.6839 6.74906 13.998 6.96752 14.3758C7.18606 14.7539 7.30184 15.1834 7.30226 15.62V15.77C7.30226 15.9901 7.38982 16.2012 7.54545 16.3568C7.70107 16.5124 7.91223 16.6 8.13226 16.6H8.49704C8.71708 16.6 8.92823 16.5124 9.08385 16.3568C9.23956 16.2012 9.32704 15.9901 9.32704 15.77V15.62L9.33269 15.4563C9.35809 15.0766 9.47063 14.7066 9.66178 14.3758C9.85293 14.0453 10.1172 13.7638 10.4334 13.5523L10.572 13.4656L10.927 13.2597L10.9295 13.2581L11.0738 13.1811C11.4154 13.0128 11.7921 12.925 12.1745 12.925C12.6114 12.925 13.041 13.0396 13.4195 13.2581L13.5435 13.3246C13.7339 13.4344 13.9601 13.464 14.1725 13.4072C14.3849 13.3505 14.5664 13.2117 14.6766 13.0215L14.8542 12.7061L14.8582 12.6997L14.8955 12.6259C14.9739 12.4522 14.9906 12.2556 14.9409 12.0699C14.8841 11.8575 14.7452 11.6767 14.555 11.5665L14.4562 11.5138C14.4481 11.5095 14.4398 11.5055 14.4319 11.5008C14.0519 11.2814 13.7362 10.9654 13.5175 10.5849C13.2989 10.2045 13.1851 9.773 13.1869 9.33426V8.9225C13.1857 8.48492 13.2995 8.05449 13.5175 7.67509C13.7338 7.29868 14.0451 6.98552 14.4197 6.76644L14.5445 6.69187L14.555 6.68539L14.6239 6.64081C14.7788 6.52939 14.8912 6.36714 14.9409 6.18123C14.9974 5.96943 14.9681 5.74395 14.859 5.55387L14.6766 5.23776C14.5664 5.0475 14.3849 4.90955 14.1725 4.85274C13.9866 4.80304 13.7903 4.81959 13.6165 4.89814L13.5435 4.93542C13.5356 4.94 13.5273 4.94408 13.5192 4.94839L13.4187 5.00107L13.4195 5.00189C13.041 5.22038 12.6114 5.33497 12.1745 5.33502C11.7375 5.33502 11.3079 5.22029 10.9295 5.00189L10.927 5.00026L10.572 4.79357C10.1941 4.57533 9.88032 4.262 9.66178 3.88414C9.44324 3.5061 9.32746 3.0766 9.32704 2.63995V2.49ZM10.987 2.63833L10.9943 2.74694C11.0086 2.85449 11.0442 2.9588 11.0989 3.05333C11.1535 3.14782 11.226 3.23048 11.3121 3.29649L11.4045 3.3581L11.7587 3.56398C11.8848 3.63674 12.0289 3.67502 12.1745 3.67502C12.3201 3.67497 12.4634 3.63677 12.5895 3.56398L12.6138 3.55019L12.7378 3.48373C13.3042 3.16518 13.9728 3.08066 14.6013 3.24867C15.1588 3.39776 15.6449 3.73509 15.9792 4.19944L16.113 4.40613L16.2953 4.72224L16.2961 4.72306L16.4088 4.9419C16.6443 5.46318 16.694 6.05258 16.545 6.61001C16.3757 7.24327 15.9626 7.78316 15.3972 8.11441L15.398 8.11516L15.2619 8.19708C15.1352 8.2702 15.03 8.37586 14.9571 8.5026C14.8843 8.62934 14.8463 8.7731 14.8469 8.91926V9.34074C14.8463 9.4869 14.8843 9.63066 14.9571 9.7574C15.0288 9.88223 15.1321 9.9859 15.2562 10.0589L15.3616 10.1156L15.3875 10.1302L15.5942 10.2639C16.0583 10.5982 16.3959 11.0837 16.545 11.6411C16.7146 12.2755 16.6255 12.9509 16.2994 13.5207L16.3002 13.5215L16.1178 13.8457L16.113 13.8539C15.7823 14.4247 15.2385 14.8409 14.6013 15.0113C13.9727 15.1794 13.3042 15.0934 12.7378 14.7747V14.7762L12.6138 14.7098C12.6057 14.7054 12.5975 14.7006 12.5895 14.6961C12.4634 14.6233 12.3201 14.585 12.1745 14.585C12.0289 14.585 11.8856 14.6233 11.7595 14.6961L11.7587 14.6952L11.4045 14.9019L11.3121 14.9635C11.226 15.0296 11.1535 15.1121 11.0989 15.2067C11.0261 15.3327 10.9872 15.4761 10.987 15.6217V15.77C10.987 16.4303 10.7252 17.0636 10.2584 17.5305C9.79143 17.9975 9.15739 18.26 8.49704 18.26H8.13226C7.47191 18.26 6.83796 17.9975 6.37097 17.5305C5.90419 17.0636 5.64229 16.4303 5.64229 15.77V15.6217L5.635 15.513C5.62072 15.4055 5.58508 15.3012 5.53044 15.2067C5.47577 15.1121 5.40334 15.0296 5.31727 14.9635L5.22486 14.9019L4.86984 14.6952C4.74373 14.6224 4.60045 14.585 4.45484 14.585C4.3457 14.585 4.23812 14.6068 4.13792 14.6482L4.03984 14.6961C4.03187 14.7006 4.02365 14.7054 4.01553 14.7098L3.89152 14.7762L3.8907 14.7747C3.32439 15.0931 2.65642 15.1793 2.02807 15.0113C1.47052 14.8622 0.984375 14.5249 0.650134 14.0605L0.516396 13.8539L0.334028 13.5377L0.333215 13.537C0.00371301 12.9657 -0.0858688 12.2871 0.0843725 11.65C0.253684 11.0168 0.666119 10.476 1.2313 10.1448L1.36747 10.0629L1.45825 10.0022C1.54468 9.93576 1.61757 9.85252 1.67224 9.7574C1.74502 9.63066 1.78305 9.4869 1.78247 9.34074V8.91926L1.77517 8.81145C1.76051 8.70446 1.72444 8.60063 1.66981 8.50667C1.61518 8.41288 1.54309 8.33071 1.45744 8.26514L1.36747 8.20513L1.32209 8.17683L1.19807 8.09416C0.650449 7.76133 0.250256 7.23035 0.0843725 6.61001C-0.0858688 5.97292 0.00372132 5.2943 0.333215 4.72306L0.334028 4.72144L0.516396 4.40613L0.650134 4.19944C0.984375 3.73509 1.47052 3.39776 2.02807 3.24867C2.65629 3.08072 3.32446 3.16628 3.8907 3.48454L3.89152 3.48373L4.01553 3.55019L4.03984 3.56398L4.13792 3.61179C4.23812 3.65327 4.34569 3.67497 4.45484 3.67502C4.56416 3.67502 4.67223 3.65334 4.77258 3.61179L4.86984 3.56398L5.22486 3.3581L5.31727 3.29649C5.40334 3.23048 5.47577 3.14782 5.53044 3.05333C5.60318 2.92748 5.64204 2.78448 5.64229 2.63914V2.49C5.64229 1.82975 5.90419 1.19643 6.37097 0.729495C6.83796 0.262529 7.47191 0 8.13226 0L8.49704 0C9.15739 0 9.79143 0.262529 10.2584 0.729495C10.7252 1.19643 10.987 1.82975 10.987 2.49V2.63833Z" fill="#5A6573"/>
                        <path d="M9.97414 9.12859C9.97414 8.21178 9.23096 7.46859 8.31414 7.46859C7.39732 7.46859 6.65414 8.21178 6.65414 9.12859C6.65414 10.0454 7.39732 10.7886 8.31414 10.7886C9.23096 10.7886 9.97414 10.0454 9.97414 9.12859ZM11.6341 9.12859C11.6341 10.9621 10.1477 12.4486 8.31414 12.4486C6.48055 12.4486 4.99414 10.9621 4.99414 9.12859C4.99414 7.29501 6.48055 5.80859 8.31414 5.80859C10.1477 5.80859 11.6341 7.29501 11.6341 9.12859Z" fill="#5A6573"/>
                        </svg>
                  </Tooltip>
                </RoundedIconButton>
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
                      <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.32704 2.49C9.32704 2.26987 9.23956 2.05882 9.08385 1.90316C8.92823 1.74758 8.71708 1.66 8.49704 1.66L8.13226 1.66C7.91223 1.66 7.70107 1.74758 7.54545 1.90316C7.38982 2.05882 7.30226 2.26987 7.30226 2.49V2.63995C7.30184 3.0766 7.18606 3.5061 6.96752 3.88414C6.74906 4.262 6.4353 4.57613 6.05729 4.79439L6.05649 4.79357L5.70228 5.00026L5.69984 5.00189C5.32141 5.22029 4.89179 5.33502 4.45484 5.33502C4.01787 5.33497 3.58828 5.22038 3.20985 5.00189L3.11015 4.94839L3.08583 4.93542C2.89538 4.82558 2.66924 4.79595 2.45684 4.85274C2.27087 4.90248 2.10868 5.01473 1.99726 5.16967L1.95269 5.23856L1.77031 5.55387C1.66116 5.74395 1.63189 5.96943 1.68845 6.18123C1.73816 6.36714 1.85051 6.52939 2.00537 6.64081L2.07427 6.68539L2.11885 6.71295L2.24286 6.79562C2.59907 7.01141 2.89567 7.31211 3.10528 7.6726C3.3237 8.04834 3.43985 8.47496 3.44247 8.90955V9.33426L3.43761 9.49802C3.41397 9.87982 3.3031 10.252 3.11177 10.5849C2.8954 10.9614 2.58354 11.2736 2.20882 11.4928L2.20963 11.4936L2.08481 11.5681L2.07427 11.5746C1.884 11.6848 1.74524 11.8663 1.68845 12.0787C1.63189 12.2906 1.66116 12.5161 1.77031 12.7061L1.95187 13.0215C2.06207 13.2117 2.24445 13.3505 2.45684 13.4072C2.66924 13.464 2.89538 13.4344 3.08583 13.3246L3.11015 13.3116L3.20985 13.2581L3.35412 13.1811C3.69581 13.0127 4.07245 12.925 4.45484 12.925C4.83716 12.925 5.21392 13.0128 5.55557 13.1811L5.69984 13.2581L5.70228 13.2597L6.05649 13.4656C6.43449 13.6839 6.74906 13.998 6.96752 14.3758C7.18606 14.7539 7.30184 15.1834 7.30226 15.62V15.77C7.30226 15.9901 7.38982 16.2012 7.54545 16.3568C7.70107 16.5124 7.91223 16.6 8.13226 16.6H8.49704C8.71708 16.6 8.92823 16.5124 9.08385 16.3568C9.23956 16.2012 9.32704 15.9901 9.32704 15.77V15.62L9.33269 15.4563C9.35809 15.0766 9.47063 14.7066 9.66178 14.3758C9.85293 14.0453 10.1172 13.7638 10.4334 13.5523L10.572 13.4656L10.927 13.2597L10.9295 13.2581L11.0738 13.1811C11.4154 13.0128 11.7921 12.925 12.1745 12.925C12.6114 12.925 13.041 13.0396 13.4195 13.2581L13.5435 13.3246C13.7339 13.4344 13.9601 13.464 14.1725 13.4072C14.3849 13.3505 14.5664 13.2117 14.6766 13.0215L14.8542 12.7061L14.8582 12.6997L14.8955 12.6259C14.9739 12.4522 14.9906 12.2556 14.9409 12.0699C14.8841 11.8575 14.7452 11.6767 14.555 11.5665L14.4562 11.5138C14.4481 11.5095 14.4398 11.5055 14.4319 11.5008C14.0519 11.2814 13.7362 10.9654 13.5175 10.5849C13.2989 10.2045 13.1851 9.773 13.1869 9.33426V8.9225C13.1857 8.48492 13.2995 8.05449 13.5175 7.67509C13.7338 7.29868 14.0451 6.98552 14.4197 6.76644L14.5445 6.69187L14.555 6.68539L14.6239 6.64081C14.7788 6.52939 14.8912 6.36714 14.9409 6.18123C14.9974 5.96943 14.9681 5.74395 14.859 5.55387L14.6766 5.23776C14.5664 5.0475 14.3849 4.90955 14.1725 4.85274C13.9866 4.80304 13.7903 4.81959 13.6165 4.89814L13.5435 4.93542C13.5356 4.94 13.5273 4.94408 13.5192 4.94839L13.4187 5.00107L13.4195 5.00189C13.041 5.22038 12.6114 5.33497 12.1745 5.33502C11.7375 5.33502 11.3079 5.22029 10.9295 5.00189L10.927 5.00026L10.572 4.79357C10.1941 4.57533 9.88032 4.262 9.66178 3.88414C9.44324 3.5061 9.32746 3.0766 9.32704 2.63995V2.49ZM10.987 2.63833L10.9943 2.74694C11.0086 2.85449 11.0442 2.9588 11.0989 3.05333C11.1535 3.14782 11.226 3.23048 11.3121 3.29649L11.4045 3.3581L11.7587 3.56398C11.8848 3.63674 12.0289 3.67502 12.1745 3.67502C12.3201 3.67497 12.4634 3.63677 12.5895 3.56398L12.6138 3.55019L12.7378 3.48373C13.3042 3.16518 13.9728 3.08066 14.6013 3.24867C15.1588 3.39776 15.6449 3.73509 15.9792 4.19944L16.113 4.40613L16.2953 4.72224L16.2961 4.72306L16.4088 4.9419C16.6443 5.46318 16.694 6.05258 16.545 6.61001C16.3757 7.24327 15.9626 7.78316 15.3972 8.11441L15.398 8.11516L15.2619 8.19708C15.1352 8.2702 15.03 8.37586 14.9571 8.5026C14.8843 8.62934 14.8463 8.7731 14.8469 8.91926V9.34074C14.8463 9.4869 14.8843 9.63066 14.9571 9.7574C15.0288 9.88223 15.1321 9.9859 15.2562 10.0589L15.3616 10.1156L15.3875 10.1302L15.5942 10.2639C16.0583 10.5982 16.3959 11.0837 16.545 11.6411C16.7146 12.2755 16.6255 12.9509 16.2994 13.5207L16.3002 13.5215L16.1178 13.8457L16.113 13.8539C15.7823 14.4247 15.2385 14.8409 14.6013 15.0113C13.9727 15.1794 13.3042 15.0934 12.7378 14.7747V14.7762L12.6138 14.7098C12.6057 14.7054 12.5975 14.7006 12.5895 14.6961C12.4634 14.6233 12.3201 14.585 12.1745 14.585C12.0289 14.585 11.8856 14.6233 11.7595 14.6961L11.7587 14.6952L11.4045 14.9019L11.3121 14.9635C11.226 15.0296 11.1535 15.1121 11.0989 15.2067C11.0261 15.3327 10.9872 15.4761 10.987 15.6217V15.77C10.987 16.4303 10.7252 17.0636 10.2584 17.5305C9.79143 17.9975 9.15739 18.26 8.49704 18.26H8.13226C7.47191 18.26 6.83796 17.9975 6.37097 17.5305C5.90419 17.0636 5.64229 16.4303 5.64229 15.77V15.6217L5.635 15.513C5.62072 15.4055 5.58508 15.3012 5.53044 15.2067C5.47577 15.1121 5.40334 15.0296 5.31727 14.9635L5.22486 14.9019L4.86984 14.6952C4.74373 14.6224 4.60045 14.585 4.45484 14.585C4.3457 14.585 4.23812 14.6068 4.13792 14.6482L4.03984 14.6961C4.03187 14.7006 4.02365 14.7054 4.01553 14.7098L3.89152 14.7762L3.8907 14.7747C3.32439 15.0931 2.65642 15.1793 2.02807 15.0113C1.47052 14.8622 0.984375 14.5249 0.650134 14.0605L0.516396 13.8539L0.334028 13.5377L0.333215 13.537C0.00371301 12.9657 -0.0858688 12.2871 0.0843725 11.65C0.253684 11.0168 0.666119 10.476 1.2313 10.1448L1.36747 10.0629L1.45825 10.0022C1.54468 9.93576 1.61757 9.85252 1.67224 9.7574C1.74502 9.63066 1.78305 9.4869 1.78247 9.34074V8.91926L1.77517 8.81145C1.76051 8.70446 1.72444 8.60063 1.66981 8.50667C1.61518 8.41288 1.54309 8.33071 1.45744 8.26514L1.36747 8.20513L1.32209 8.17683L1.19807 8.09416C0.650449 7.76133 0.250256 7.23035 0.0843725 6.61001C-0.0858688 5.97292 0.00372132 5.2943 0.333215 4.72306L0.334028 4.72144L0.516396 4.40613L0.650134 4.19944C0.984375 3.73509 1.47052 3.39776 2.02807 3.24867C2.65629 3.08072 3.32446 3.16628 3.8907 3.48454L3.89152 3.48373L4.01553 3.55019L4.03984 3.56398L4.13792 3.61179C4.23812 3.65327 4.34569 3.67497 4.45484 3.67502C4.56416 3.67502 4.67223 3.65334 4.77258 3.61179L4.86984 3.56398L5.22486 3.3581L5.31727 3.29649C5.40334 3.23048 5.47577 3.14782 5.53044 3.05333C5.60318 2.92748 5.64204 2.78448 5.64229 2.63914V2.49C5.64229 1.82975 5.90419 1.19643 6.37097 0.729495C6.83796 0.262529 7.47191 0 8.13226 0L8.49704 0C9.15739 0 9.79143 0.262529 10.2584 0.729495C10.7252 1.19643 10.987 1.82975 10.987 2.49V2.63833Z" fill="#5A6573"/>
                        <path d="M9.97414 9.12859C9.97414 8.21178 9.23096 7.46859 8.31414 7.46859C7.39732 7.46859 6.65414 8.21178 6.65414 9.12859C6.65414 10.0454 7.39732 10.7886 8.31414 10.7886C9.23096 10.7886 9.97414 10.0454 9.97414 9.12859ZM11.6341 9.12859C11.6341 10.9621 10.1477 12.4486 8.31414 12.4486C6.48055 12.4486 4.99414 10.9621 4.99414 9.12859C4.99414 7.29501 6.48055 5.80859 8.31414 5.80859C10.1477 5.80859 11.6341 7.29501 11.6341 9.12859Z" fill="#5A6573"/>
                        </svg>
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

                {/* Nút Xuất (icon) */}
                <RoundedIconButton onClick={handleOpenExport}>
                  <Tooltip title="Xuất">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 11.3617L0 8.68172C0 8.31168 0.299972 8.01172 0.67 8.01172C1.04003 8.01172 1.34 8.31168 1.34 8.68172L1.34 11.3617L1.34327 11.4278C1.35847 11.5812 1.42632 11.7255 1.53629 11.8354C1.66194 11.9611 1.8323 12.0317 2.01 12.0317L11.39 12.0317C11.5677 12.0317 11.7381 11.9611 11.8637 11.8354C11.9894 11.7098 12.06 11.5394 12.06 11.3617L12.06 8.68172C12.06 8.31168 12.36 8.01172 12.73 8.01172C13.1 8.01172 13.4 8.31168 13.4 8.68172L13.4 11.3617C13.4 11.8948 13.1881 12.4059 12.8111 12.7829C12.4342 13.1598 11.9231 13.3717 11.39 13.3717L2.01 13.3717C1.47691 13.3717 0.965818 13.1598 0.58887 12.7829C0.259096 12.4531 0.0555498 12.0207 0.00981557 11.5606L0 11.3617Z" fill="#5A6573"/>
                    <path d="M9.62683 4.82611C9.89 4.61148 10.2779 4.62661 10.5232 4.87191C10.7685 5.11721 10.7837 5.50514 10.569 5.76832L10.5232 5.81931L7.17322 9.16931C6.91159 9.43101 6.48748 9.43101 6.22584 9.16931L2.87582 5.81931L2.83002 5.76832C2.61538 5.50514 2.63052 5.11721 2.87582 4.87191C3.12112 4.62661 3.50905 4.61148 3.77221 4.82611L3.82324 4.87191L6.69953 7.74817L9.57584 4.87191L9.62683 4.82611Z" fill="#5A6573"/>
                    <path d="M6.0293 8.71L6.0293 0.67C6.0293 0.299972 6.32926 0 6.6993 0C7.06934 0 7.3693 0.299972 7.3693 0.67L7.3693 8.71C7.3693 9.08004 7.06934 9.38 6.6993 9.38C6.32926 9.38 6.0293 9.08004 6.0293 8.71Z" fill="#5A6573"/>
                    </svg>
                  </Tooltip>
                </RoundedIconButton>
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

                {/* Nút Thêm công việc (có text) */}
                {!disableAdd && (
                  <AddJobButton onClick={onAdd}>
                    <Add />
                    {addButtonLabel}
                  </AddJobButton>
                )}
              </ActionsBox>
            </ActionsContainer>
          </StyledToolbarList>
          <StyledTableContainer>
            <StyledTable>
              <StyledTableHead>
                <StyledTableRow>
                  {visibleColumns.includes("tree_name") && (
                    <StyledTableHeaderCell
                      id="col-border-tree-tree_name"
                      stylePaddingLeft="20px"
                      isBold
                      onClick={handleSortClick("tree_name")}
                      styleWidth={
                        columnWidths["tree_name"]
                          ? `${columnWidths["tree_name"]}px`
                          : (columns.find((c) => c.key === "tree_name")?.width)
                      }
                      styleMinWidth={
                        columnWidths["tree_name"]
                          ? `${columnWidths["tree_name"]}px`
                          : (columns.find((c) => c.key === "tree_name")?.width)
                      }
                      styleMaxWidth={
                        columnWidths["tree_name"]
                          ? `${columnWidths["tree_name"]}px`
                          : (columns.find((c) => c.key === "tree_name")?.width)
                      }
                    >
                      <TreeRowBoxLevel>
                        <TreeToggleWrapper>
                          <TreeToggleButton size="small" sx={{ visibility: "hidden" }}>
                            <StyledExpandIcon />
                          </TreeToggleButton>
                        </TreeToggleWrapper>
                        {!disableCheckbox && (
                          <TreeCheckbox
                            size="small"
                            checked={isAllSelected}
                            indeterminate={isIndeterminate}
                            onChange={handleSelectAll}
                            onClick={handleStopPropagationClick}
                          />
                        )}
                        <HeaderSpacer>
                          {/* Spacer for Flag icon */}
                        </HeaderSpacer>
                        <HeaderLabel>
                          {columns.find((c) => c.key === "tree_name")?.label || "Tên công việc"}
                        </HeaderLabel>
                        <SortIconContainer>
                          <StyledArrowUp
                            isActive={orderBy === "tree_name" && order === "asc"}
                          />
                          <StyledArrowDown
                            isActive={orderBy === "tree_name" && order === "desc"}
                          />
                        </SortIconContainer>
                      </TreeRowBoxLevel>
                      <StyledBoxBoderBuilder
                        onMouseDown={handleResizeMouseDownCallback("tree_name")}
                      />
                    </StyledTableHeaderCell>
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
                    const columnAlign = isSpecialColumn ? column.margin || "center" : "left";
                    const colIdentifier = column.key || column.row;
                    return (
                      <StyledTableHeaderCell
                        key={colIdentifier}
                        id={`col-border-tree-${colIdentifier}`}
                        align={columnAlign}
                        isBold
                        onClick={handleSortClick(colIdentifier)}
                        styleWidth={
                          columnWidths[colIdentifier]
                            ? `${columnWidths[colIdentifier]}px`
                            : (isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width)
                        }
                        styleMinWidth={
                          columnWidths[colIdentifier]
                            ? `${columnWidths[colIdentifier]}px`
                            : (isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width)
                        }
                        styleMaxWidth={
                          columnWidths[colIdentifier]
                            ? `${columnWidths[colIdentifier]}px`
                            : (isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width)
                        }
                      >
                        <HeaderCellContainer align={columnAlign}>
                          {column.name}
                          <SortIconContainer>
                            <StyledArrowUp
                              isActive={orderBy === colIdentifier && order === "asc"}
                            />
                            <StyledArrowDown
                              isActive={orderBy === colIdentifier && order === "desc"}
                            />
                          </SortIconContainer>
                        </HeaderCellContainer>
                        <StyledBoxBoderBuilder
                          onMouseDown={handleResizeMouseDownCallback(colIdentifier)}
                        />
                      </StyledTableHeaderCell>
                    );
                  })}
                  <StyledTableCellActions index={0}>
                    {!isSmallScreen && <span>Hành động</span>}
                  </StyledTableCellActions>
                </StyledTableRow>
              </StyledTableHead>

              <TableBody>
                {data.length === 0 ? (
                  <StyledTableRow>
                    <StyledTableCell
                      styleTextAlign
                      colSpan={
                        activeColumns.length + (visibleColumns.includes("tree_name") ? 1 : 0) + 1
                      }
                      align="center"
                    >
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
                  </>
                )}
              </TableBody>
            </StyledTable>
          </StyledTableContainer>
          {!isSmallScreen && (
            <BeautifulPaginationContainer isCentered={false}>
              <BeautifulInfoBox isCentered={false}>
                <Typography variant="body2">
                  Hiển thị{" "}
                  <strong>{page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, total)}</strong>
                  {" "}trong tổng số{" "}
                  <strong>{total?.toLocaleString()}</strong>{" "}bản ghi
                </Typography>
              </BeautifulInfoBox>

              <BeautifulRowsPerPageStack>
                <BeautifulRowsPerPageBox>
                  <BeautifulDisplayTypography>Hiển thị</BeautifulDisplayTypography>
                  <BeautifulRowsPerPageSelect
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                    size="small"
                  >
                    {rowsPerPageOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </BeautifulRowsPerPageSelect>
                </BeautifulRowsPerPageBox>

                <BeautifulStyledPagination
                  count={totalPages || Math.ceil(total / rowsPerPage)}
                  page={page + 1}
                  onChange={handlePageChange}
                  renderItem={(item) => (
                    <PaginationItem
                      slots={{ previous: () => 'Trước', next: () => 'Sau' }}
                      {...item}
                    />
                  )}
                  shape="rounded"
                  variant="text"
                  showFirstButton={false}
                  showLastButton={false}
                  siblingCount={1}
                  boundaryCount={1}
                />
              </BeautifulRowsPerPageStack>
            </BeautifulPaginationContainer>
          )}
          {children}
          {isSmallScreen && (
            <BeautifulPaginationContainer isCentered={true}>
              <BeautifulInfoBox isCentered={true}>
                <Typography variant="body2">
                  Hiển thị{" "}
                  <strong>{page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, total)}</strong>{" "}
                  trong tổng số{" "}
                  <strong>{total?.toLocaleString()}</strong>{" "}bản ghi
                </Typography>
              </BeautifulInfoBox>

              <BeautifulRowsPerPageStack>
                <BeautifulRowsPerPageBox>
                  <BeautifulRowsPerPageSelect
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                    size="small"
                  >
                    {rowsPerPageOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </BeautifulRowsPerPageSelect>
                </BeautifulRowsPerPageBox>

                <BeautifulStyledPagination
                  count={totalPages || Math.ceil(total / rowsPerPage)}
                  page={page + 1}
                  onChange={handlePageChange}
                  renderItem={(item) => (
                    <PaginationItem
                      slots={{ previous: () => 'Trước', next: () => 'Sau' }}
                      {...item}
                    />
                  )}
                  shape="rounded"
                  variant="text"
                  showFirstButton={false}
                  showLastButton={false}
                  siblingCount={0}
                  boundaryCount={1}
                />
              </BeautifulRowsPerPageStack>
            </BeautifulPaginationContainer>
          )}
        </StyledPaper>
      </StyleBoxTittle>

      <PopperStyled
        open={openFilePopper}
        anchorEl={filePopoverAnchorEl}
        placement="bottom-start"
        modifiers={[
          {
            name: "flip",
            enabled: true,
            options: {
              altBoundary: true,
              rootBoundary: "viewport",
              padding: 8,
            },
          },
          {
            name: "preventOverflow",
            enabled: true,
            options: {
              altBoundary: true,
              tether: false,
              rootBoundary: "viewport",
              padding: 8,
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handleClosePopper}>
          <FilePopoverContainer
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handleCloseFilePopoverWithDelay}
          >
            {currentFiles.map((file) => (
              <MenuItemStyled
                key={file.id || file.url || file.name}
                onClick={handleFileClick(file, currentFiles.indexOf(file))}
              >
                <FileContentBox>
                  <StyledAttachFileIconSmall />
                  {file.fileName || file.name || "File không tên"}
                </FileContentBox>
                {loadingFileIndex === currentFiles.indexOf(file) && <CircularProgress size={16} />}
              </MenuItemStyled>
            ))}
          </FilePopoverContainer>
        </ClickAwayListener>
      </PopperStyled>

      <LoadingDialog open={loadingDate}>
        <SkyTypography>Đang cập nhật danh sách, vui lòng chờ trong giây lát...</SkyTypography>
      </LoadingDialog>
    </>
  );
};

CustomTableBorderTreeJob.propTypes = {
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
  onCellClick: PropTypes.func,
  onSelectView: PropTypes.func,

  setReloadData: PropTypes.func,
  onMyAssign: PropTypes.func,
  onMyDirector: PropTypes.func,
  onMySupporter: PropTypes.func,
  activeTaskView: PropTypes.oneOf(['myDirector', 'mySupporter', 'myAssign', 'both', null]),
  addButtonLabel: PropTypes.string,
  paramChildren: PropTypes.object,
};
CustomTableBorderTreeJob.defaultProps = {
  disableCheckbox: false,
  disableDetail: false,
  disableDelete: false,
  disableMore: false,
  disableAdd: false,
  disableSynchronize: false,
  enableViewConfig: false,
  codeModule: "",
};

export default CustomTableBorderTreeJob;