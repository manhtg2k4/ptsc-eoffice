import {
  useState,
  useMemo,
  useCallback,
  memo,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";
import { Tooltip, ClickAwayListener, Checkbox, FormControlLabel, Popover, Box } from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import { ChevronLeft, ChevronRight, Search as SearchIcon, GetApp as GetAppIcon, PictureAsPdf as PdfIcon, TableChart as ExcelIcon, Add as AddIcon } from "@mui/icons-material";
import TuneIcon from "@builder-table/components/TuneIcon";
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  parse,
  isValid,
  differenceInDays,
  // differenceInHours,
  differenceInCalendarMonths,
  startOfDay,
  getMonth,
  getYear,
  addMonths,
  subMonths,
} from "date-fns";
import DOMPurify from "dompurify";
import DependencyArrows from "./DependencyArrows";
import useDependencyDrag from "./useDependencyDrag";
import {
  GanttWrapper,
  GanttContainer,
  MonthHeaderRowContainer,
  DayHeaderRowContainer,
  TaskBodyWrapper,
  TaskRowContainer,
  HeaderLeftText,
  HeaderRightWrapper,
  MonthHeaderCell,
  DayCell,
  TaskLeftCell,
  TaskHeaderRow,
  TaskDetailsSection,
  StatusBadge,
  TaskDetailRow,
  FlagIconWrapper,
  ProgressInfo,
  TaskRightWrapper,
  BarContainer,
  PlannedBar,
  ActualBar,
  ProgressText,
  LegendWrapper,
  LegendItem,
  LegendBox,
  ExpandIconButton,
  ExpandPlaceholder,
  TaskNameText,
  StyledCheckbox,
  TooltipContent,
  TooltipTitle,
  TooltipDetail,
  TooltipDetailWrapper,
  SmallArrowDown,
  SmallArrowRight,
  SmallFlagIcon,
  GANTT_CONSTANTS,
  GanttContent,
  StickyHeaderGrantt,
  LinkHandle,
  TaskRowHighlight,
  SmallLinkIcon,
  NavButton,
  StickyGanttMonthNav,
  GanttInlineMonthText,
  MergedHeaderLeftCell,
  GanttTopBar,
  TopBarMonthText,
  TopBarNavButtonGroup,
  TopBarNavButton,
  TopBarTodayButton,
} from "@styles/Gantt/Grantt.styles";

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
  StyledToolbarGantt,
} from "@styles/CustomTable.styles";

import { StyledPopoverActionButton } from "@styles/CustomTableTree.styles";

import { clearWidthSpace } from "@utils/Common/Common";
import { API_ADD_COMMON_WORK } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useToast } from "@components/common/ToastProvider";
import LoadingDialog from "@components/LoadingDialog";
// ===== Pill Search UI (giống CustomTableBorderTreeJob) =====
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
    borderColor: "#0062AD",
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

// Wrapper thay thế Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}
const SearchRowWrapper = styled('div')({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
});

// Wrapper thay thế Box sx={{ position: 'relative', height: '100%' }}
const FilterRelativeWrapper = styled('div')({
  position: 'relative',
  height: '100%',
});

dayjs.extend(customParseFormat);

const { DAY_WIDTH, } = GANTT_CONSTANTS;
const parseTaskDate = (dateStr) => {
  if (!dateStr) return null;

  // Thử parse theo định dạng dd/MM/yyyy
  const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
  if (isValid(parsed)) return parsed;

  // Fallback cho các định dạng khác (ISO, etc.)
  const date = new Date(dateStr);
  return isValid(date) ? date : null;
};

const getStatusColor = (status) => {
  const statusStr = String(status || "").trim();
  switch (statusStr) {
    case "1":
    case "Công việc mới":
      return "#9e9e9e"; // Công việc mới (Xám)
    case "2":
    case "Đang thực hiện":
      return "#2196f3"; // Đang thực hiện (Xanh dương)
    case "3":
    case "Chờ phê duyệt":
      return "#fdd835"; // Chờ phê duyệt (Màu vàng)
    case "4":
    case "Hoàn thành":
      return "#4caf50"; // Hoàn thành (Xanh lá)
    case "5":
    case "Từ chối phê duyệt":
      return "#F44336"; // Từ chối phê duyệt (Đỏ)
    case "6":
    case "Chờ điều chỉnh":
      return "#ff9800"; // Chờ điều chỉnh (Màu cam)
    case "7":
    case "Từ chối điều chỉnh":
      return "#F44336"; // Từ chối điều chỉnh (Đỏ)
    case "8":
    case "Hủy":
      return "#F44336"; // Hủy (Đỏ)
    default:
      return "#9e9e9e"; // Không xác định
  }
};
const getStatusLabel = (status) => {
  const statusStr = String(status || "").trim();
  switch (statusStr) {
    case "1":
    case "Công việc mới":
      return "Công việc mới";
    case "2":
    case "Đang thực hiện":
      return "Đang thực hiện";
    case "3":
    case "Chờ phê duyệt":
      return "Chờ phê duyệt";
    case "4":
    case "Hoàn thành":
      return "Hoàn thành";
    case "5":
    case "Từ chối phê duyệt":
      return "Từ chối phê duyệt";
    case "6":
    case "Chờ điều chỉnh":
      return "Chờ điều chỉnh";
    case "7":
    case "Từ chối điều chỉnh":
      return "Từ chối điều chỉnh";
    case "8":
    case "Hủy":
      return "Hủy";
    default:
      return (typeof status === "string" && status.length > 0)
        ? status
        : "Không xác định";
  }
};

const getTimeStatusInfo = (task) => {
  const endDate = parseTaskDate(task.endDate || task.end);
  const progress = Number(task.progress) || 0;

  if (!endDate) return null;

  const now = new Date();
  const diffMs = now - endDate;
  const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;

  const buildText = (prefix) => {
    if (days > 0 && hours > 0) return `${prefix} ${days} ngày ${hours} giờ`;
    if (days > 0) return `${prefix} ${days} ngày`;
    return `${prefix} ${hours} giờ`;
  };

  // Đã hoàn thành
  if (progress >= 100) {
    if (diffMs < 0) return { text: "Hoàn thành sớm", color: "#007222" };
    return { text: "Hoàn thành" };
  }

  // Chưa hoàn thành
  if (diffMs > 0) {
    return { text: buildText("Quá"), color: "#F44336" };
  }
  if (diffMs === 0) {
    return { text: "Đến hạn hôm nay", color: "#0062AD" };
  }
  return { text: buildText("Còn"), color: "#0062AD" };
};

const TaskTooltipContent = ({ task }) => {
  // Ưu tiên dùng startDateNotHTML/endDateNotHTML (ngày sạch, không chứa HTML)
  const startDateStr = task.startDateNotHTML || task.startDate || task.start;
  const endDateStr = task.endDateNotHTML || task.endDate || task.end;

  return (
    <TooltipContent>
      <TooltipDetailWrapper>
        <TaskHeaderRow>
          {task.flag && (
            <FlagIconWrapper flagType={task.flag}>
              <SmallFlagIcon />
            </FlagIconWrapper>
          )}
          <TooltipTitle variant="subtitle2">{task.name}</TooltipTitle>
        </TaskHeaderRow>
        {task.detail?.nguoiChuTri && (
          <TooltipDetail variant="caption">
            <strong>Người chủ trì:</strong> {task.detail.nguoiChuTri}
          </TooltipDetail>
        )}
        {task.detail?.nguoiGiao && (
          <TooltipDetail variant="caption">
            <strong>Người giao:</strong> {task.detail.nguoiGiao}
          </TooltipDetail>
        )}
        <TooltipDetail variant="caption">
          <strong>Ngày bắt đầu:</strong>{" "}
          {startDateStr}
        </TooltipDetail>
        <TooltipDetail variant="caption">
          <strong>Ngày kết thúc:</strong>{" "}
          {endDateStr}
        </TooltipDetail>
      </TooltipDetailWrapper>
    </TooltipContent>
  );
};

const TaskRowItem = memo(function TaskRowItem({
  task,
  days,
  todayIndex,
  barStyle,
  statusColor,
  selectedTasks,
  tooltipProps,
  onRowClick,
  onExpandClick,
  onCheckboxChange,
  disbleCheckbox,
  // Dependency props
  isDragging,
  isHighlighted,
  isValidTarget,
  onDragStart,
  onTaskHover,
  onTaskLeave,
  registerTaskBar,
}) {
  // logger.log("TaskRowItem", task);
  const barRef = useRef(null);

  // Đăng ký ref cho task bar
  useEffect(() => {
    if (barRef.current) {
      registerTaskBar?.(task.id, barRef.current);
    }
    return () => {
      registerTaskBar?.(task.id, null);
    };
  }, [task.id, registerTaskBar]);

  // Xử lý sự kiện click vào hàng công việc
  // Không trigger nếu đang kéo dependency
  // const handleRowClick = () => {
  //   if (isDragging) return;
  //   onRowClick(task);
  // };

  const handleLeftCellClick = () => {
    if (isDragging) return;
    onRowClick(task);
  };
  // logger.log("task", task);
  // Xử lý sự kiện click nút mở rộng/thu gọn công việc con
  const handleExpandClick = (e) => {
    onExpandClick(e, task.id);
  };

  // Xử lý sự kiện thay đổi checkbox chọn công việc
  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onCheckboxChange(e, task.id);
  };

  // Xử lý bắt đầu kéo từ link handle
  const handleLinkDragStart = (e) => {
    e.stopPropagation();
    onDragStart?.(e, task.id);
  };

  // Xử lý hover khi đang kéo
  const handleMouseEnter = () => {
    if (isDragging) {
      onTaskHover?.(task.id);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      onTaskLeave?.();
    }
  };

  // const endDate = parseTaskDate(task.endDate || task.end);
  // const isOverdue = endDate && differenceInDays(new Date(), endDate) > 0 && (task.progress || 0) < 100;

  // Sử dụng TaskRowHighlight khi đang kéo và được highlight
  const RowComponent = isDragging ? TaskRowHighlight : TaskRowContainer;

  return (
    <RowComponent
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      isHighlighted={isHighlighted}
      isValidTarget={isValidTarget}
    >
      <TaskLeftCell level={task.level} onClick={handleLeftCellClick}>
        {" "}
        <Tooltip
          title={<TaskTooltipContent task={task} />}
          placement="top"
          arrow
          componentsProps={tooltipProps}
        >
          <TaskHeaderRow>
            {task.flags.hasChildren || task?.hasChildren ? (
              <ExpandIconButton size="small" onClick={handleExpandClick}>
                {task.isExpanded ? <SmallArrowDown /> : <SmallArrowRight />}
              </ExpandIconButton>
            ) : (
              <ExpandPlaceholder />
            )}
            {!disbleCheckbox && (
              <StyledCheckbox
                size="small"
                checked={selectedTasks.includes(task.id)}
                onChange={handleCheckboxChange}
              />
            )}

            {/* {task.flag && (
              <FlagIconWrapper flagType={task.flag}>
                <SmallFlagIcon />
              </FlagIconWrapper>
            )} */}
            {task.flag && (
              <FlagIconWrapper
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.flag) }}
              />
            )}

            <TaskNameText variant="body2">{task.name}</TaskNameText>
          </TaskHeaderRow>
          {/*  Trạng thái và tiến độ coogn việc */}
          <TaskDetailsSection>
            <TaskDetailRow>
              {(() => {
                const timeInfo = getTimeStatusInfo(task);
                if (timeInfo) {
                  return (
                    <ProgressInfo
                      // style={timeInfo.color ? { color: timeInfo.color, fontWeight: 600 } : undefined}
                      timeColor={timeInfo.color}
                    >
                      {timeInfo.text}
                    </ProgressInfo>
                  );
                }
                return (
                  <ProgressInfo>
                    {`Tiến độ: ${task.progress || 0}%`}
                  </ProgressInfo>
                );
              })()}
              <StatusBadge statusType={task.processStatus}>
                {getStatusLabel(task.processStatus)}
              </StatusBadge>
            </TaskDetailRow>
          </TaskDetailsSection>
        </Tooltip>
      </TaskLeftCell>
      <TaskRightWrapper dayWidth={days.length * DAY_WIDTH}>
        {todayIndex !== -1 && (
          <div
            style={{
              position: "absolute",
              left: todayIndex * DAY_WIDTH,
              width: DAY_WIDTH,
              top: 0,
              bottom: 0,
              backgroundColor: "rgba(73, 125, 184, 0.1)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        )}
        {barStyle && (
          <BarContainer
            ref={barRef}
            barLeft={barStyle.left}
            barWidth={barStyle.width}
          >
            {/* Link handle bên trái - để nhận kết nối */}
            <LinkHandle
              handlePosition="left"
              title="Kết nối từ task khác"
            />

            <PlannedBar barColor={statusColor}>
              <ActualBar barColor={statusColor} progress={task.progress || 0}>
                {task.progress >= 20 && (
                  <ProgressText>{task.progress}%</ProgressText>
                )}
              </ActualBar>
            </PlannedBar>

            {/* Link handle bên phải - để bắt đầu kéo */}
            <LinkHandle
              handlePosition="right"
              onMouseDown={handleLinkDragStart}
              title="Kéo để tạo liên kết"
            >
              <SmallLinkIcon />
            </LinkHandle>
          </BarContainer>
        )}
      </TaskRightWrapper>
    </RowComponent>
  );
});

/**
 * Component biểu đồ Gantt tùy chỉnh
 * Hiển thị danh sách công việc theo dạng timeline với thanh tiến độ
 * Hỗ trợ: Phân cấp công việc, chọn nhiều, mở rộng/thu gọn, điều hướng tháng
 * Hỗ trợ: Tạo dependency bằng kéo thả giữa các công việc
 *
 * @param {Array} tasks - Danh sách công việc (có thể có children)
 * @param {Date} currentDate - Ngày hiện tại để hiển thị (controlled)
 * @param {Array} selectedTasks - Danh sách ID công việc đã chọn (controlled)
 * @param {Array} expandedTasks - Danh sách ID công việc đang mở rộng (controlled)
 * @param {Array} dependencies - Danh sách dependency [{id, fromId, toId, type}]
 * @param {Function} onMonthChange - Callback khi chuyển tháng
 * @param {Function} onTaskSelect - Callback khi chọn/bỏ chọn công việc
 * @param {Function} onTaskExpand - Callback khi mở rộng/thu gọn công việc
 * @param {Function} onTaskClick - Callback khi click vào công việc
 * @param {Function} onDependencyCreate - Callback khi tạo dependency mới
 * @param {Function} onDependencyDelete - Callback khi xóa dependency
 * @param {Function} fetchDependencies - Async function để fetch dependencies từ API (từ GanttExample)
 * @param {Function} createDependencyApi - Async function để tạo dependency qua API (từ GanttExample)
 * @param {boolean} showDetails - Hiển thị chi tiết công việc hay không
 * @param {boolean} enableDependencies - Cho phép tạo dependency hay không
 */
function CustomGantt({
  tasks = [],
  currentDate: controlledDate,
  selectedTasks: controlledSelected,
  expandedTasks: controlledExpanded,
  dependencies: controlledDependencies,
  onMonthChange,
  onTaskSelect,
  onTaskExpand,
  onTaskClick,
  onDependencyCreate,
  fetchDependencies,
  createDependencyApi,
  showDetails = true,
  enableDependencies = true,
  renderAfterSearch,
  onSearch,
  filterOptions = [],
  onAdd,
  onExport,
  onAdvancedFilterClick,
  addButtonLabel,
  onMyAssign,
  onMyDirector,
  onMySupporter,
  activeTaskView,
}) {
  const theme = useTheme();
  const [internalDate, setInternalDate] = useState(new Date());
  const [internalSelected, setInternalSelected] = useState([]);
  const [internalExpanded, setInternalExpanded] = useState([]);
  const [internalDependencies, setInternalDependencies] = useState([]);
  const [, setIsLoadingDependencies] = useState(false);

  // Lazy-load children: map từ parentId -> danh sách task con đã fetch
  const [childDataMap, setChildDataMap] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});

  // States for infinite horizontal scrolling
  const [pastBuffer, setPastBuffer] = useState(6);
  const [futureBuffer, setFutureBuffer] = useState(6);

  const [searchText, setSearchText] = useState("");
  const [openFilter, setOpenFilter] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(
    filterOptions?.map((col) => col.name) || []
  );
  const [tempSelectedColumns, setTempSelectedColumns] = useState(selectedColumns);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  const currentDate = controlledDate ?? internalDate;
  // ... rest of state initialization ...
  const selectedTasks = controlledSelected ?? internalSelected;
  const expandedTasks = controlledExpanded ?? internalExpanded;
  const dependencies = controlledDependencies ?? internalDependencies;

  const [visibleMonthDate, setVisibleMonthDate] = useState(new Date());
  const visibleMonthDateRef = useRef(new Date());

  useEffect(() => {
    visibleMonthDateRef.current = visibleMonthDate;
  }, [visibleMonthDate]);

  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [taskAnchors, setTaskAnchors] = useState({});

  // ===== Fetch dependencies khi component mount =====
  useEffect(() => {
    const loadDependencies = async () => {
      if (!fetchDependencies) return;

      setIsLoadingDependencies(true);
      try {
        const data = await fetchDependencies();
        // data phải có dạng: [{ id, fromId, toId, type?, color? }]
        if (Array.isArray(data)) {
          setInternalDependencies(data);
        }
      } catch (error) {
        logger.error("Failed to fetch dependencies:", error);
      } finally {
        setIsLoadingDependencies(false);
      }
    };

    loadDependencies();
  }, [fetchDependencies]);

  /**
   * Xử lý tạo dependency mới
   * Nếu có createDependencyApi thì gọi API từ GanttExample
   * Không thì optimistic update internal state
   */
  const handleDependencyCreate = useCallback(async (newDep) => {
    // newDep = { fromId, toId, type: "FS" }

    if (createDependencyApi) {
      // ✅ GỌI API TẠO DEPENDENCY TỪ GanttExample
      try {
        const result = await createDependencyApi(newDep);
        // result = { id: "server-id", fromId, toId, ... }

        if (result && result.id) {
          // Thêm dependency mới vào state với ID từ server
          setInternalDependencies((prev) => [...prev, result]);
        }

        return result;
      } catch (error) {
        logger.error("Failed to create dependency:", error);
        throw error;
      }
    } else if (onDependencyCreate) {
      // Gọi callback từ parent (nếu có)
      try {
        const result = await onDependencyCreate(newDep);
        if (result && result.id) {
          setInternalDependencies((prev) => [...prev, result]);
        }
        return result;
      } catch (error) {
        logger.error("Failed to create dependency:", error);
        throw error;
      }
    } else {
      // Optimistic update cho internal state (không có API)
      const tempId = `temp-${Date.now()}`;
      const dependencyWithId = { ...newDep, id: tempId };
      setInternalDependencies((prev) => [...prev, dependencyWithId]);
      return dependencyWithId;
    }
  }, [createDependencyApi, onDependencyCreate]);

  // Custom hook quản lý dependency drag
  const {
    dragState,
    hoveredTaskId,
    isValidTarget,
    isDragging,
    handleDragStart,
    handleTaskHover,
    handleTaskLeave,
    registerTaskBar,
    calculateTaskAnchors,
  } = useDependencyDrag({
    contentRef,
    dependencies,
    onDependencyCreate: handleDependencyCreate,
  });
  const toast = useToast();

  // Cập nhật task anchors khi scroll hoặc khi flatTasks thay đổi
  const updateAnchors = useCallback(() => {
    const anchors = calculateTaskAnchors();
    setTaskAnchors(anchors);
  }, [calculateTaskAnchors]);

  /**
   * Chuyển đổi danh sách phẳng (có parent field) thành cấu trúc cây (có children)
   * @param {Array} flatList - Danh sách phẳng các công việc có trường parent
   * @returns {Array} - Danh sách công việc dạng cây với children
   */
  const buildTreeFromFlatList = useCallback((flatList) => {
    if (!Array.isArray(flatList) || flatList.length === 0) return [];

    // Tạo map để tra cứu nhanh task theo id
    const taskMap = new Map();
    const tree = [];

    // Bước 1: Tạo map và khởi tạo children array cho mỗi task
    flatList.forEach((task) => {
      const normalizedTask = {
        ...task,
        children: [],
        startDate: task.startDateNotHTML || task.startDate || task.start,
        endDate: task.endDateNotHTML || task.endDate || task.end,
      };
      taskMap.set(task.id, normalizedTask);
    });

    // Bước 2: Xây dựng cây bằng cách gán children vào parent
    flatList.forEach((task) => {
      const currentTask = taskMap.get(task.id);
      if (task.parent) {
        // Nếu có parent, tìm parent và thêm vào children
        const parentTask = taskMap.get(task.parent);
        if (parentTask) {
          parentTask.children.push(currentTask);
        } else {
          // Nếu không tìm thấy parent, coi như root
          tree.push(currentTask);
        }
      } else {
        // Không có parent, là root task
        tree.push(currentTask);
      }
    });

    return tree;
  }, []);

  // Chuyển đổi tasks từ flat list sang tree structure (nếu cần)
  const treeTasks = useMemo(() => {
    // Kiểm tra xem tasks đã có cấu trúc cây chưa
    const hasTreeStructure = tasks?.some(
      (task) => task.children && task.children.length > 0
    );
    // Kiểm tra xem có trường parent không
    const hasFlatStructure = tasks?.some((task) => task.parent);

    if (hasFlatStructure && !hasTreeStructure) {
      // Nếu là flat list với parent field, chuyển sang tree
      return buildTreeFromFlatList(tasks);
    }

    // Nếu đã là tree hoặc không có parent field, giữ nguyên
    return tasks;
  }, [tasks, buildTreeFromFlatList]);

  // Tự động tính số tháng cần hiển thị dựa trên dữ liệu tasks
  const { days, monthStart, displayEnd, displayStart, todayIndex } = useMemo(() => {
    const todayStart = startOfMonth(new Date(currentDate));

    // Tìm ngày bắt đầu sớm nhất
    let minStartDate = todayStart;
    const findMinStartDate = (taskList, checkExpanded = false) => {
      const list = Array.isArray(taskList) ? taskList : [];
      list.forEach((task) => {
        let taskStart = parseTaskDate(task?.startDate || task?.start);
        if (taskStart) {
          taskStart = startOfDay(taskStart);
          if (taskStart < minStartDate) minStartDate = taskStart;
        }
        if (task.children && task.children.length > 0) {
          if (!checkExpanded || expandedTasks.includes(task.id)) {
            findMinStartDate(task.children, checkExpanded);
          }
        }
      });
    };

    // Tìm ngày kết thúc xa nhất
    let maxEndDate = todayStart;
    const findMaxEndDate = (taskList, checkExpanded = false) => {
      const list = Array.isArray(taskList) ? taskList : [];
      list.forEach((task) => {
        let taskEnd = parseTaskDate(task?.endDate || task?.end);
        if (taskEnd) {
          taskEnd = startOfDay(taskEnd);
          if (taskEnd > maxEndDate) maxEndDate = taskEnd;
        }
        if (task.children && task.children.length > 0) {
          if (!checkExpanded || expandedTasks.includes(task.id)) {
            findMaxEndDate(task.children, checkExpanded);
          }
        }
      });
    };

    findMinStartDate(treeTasks, true);
    Object.values(childDataMap).forEach((item) => findMinStartDate(item, true));

    findMaxEndDate(treeTasks, true);
    Object.values(childDataMap).forEach((item) => findMaxEndDate(item, true));

    const start = startOfMonth(minStartDate); // Bắt đầu từ tháng sớm nhất của CV
    const monthsDiff = differenceInCalendarMonths(maxEndDate, start) + 1;
    const lastMonth = addMonths(start, monthsDiff - 1);
    const displayEndDate = endOfMonth(lastMonth);

    // Áp dụng buffer quá khứ và tương lai cho timeline hiển thị
    const bufferedStart = subMonths(start, pastBuffer);
    const bufferedEnd = addMonths(displayEndDate, futureBuffer);

    const allDays = eachDayOfInterval({ start: bufferedStart, end: bufferedEnd });

    const today = new Date();
    const todayIndex = allDays.findIndex(
      (day) =>
        day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear()
    );

    return {
      days: allDays,
      monthStart: todayStart, // ← Vẫn là tháng hiện tại để tính vị trí bar đúng
      displayEnd: bufferedEnd,
      displayStart: bufferedStart,    // ← Điểm bắt đầu thực sự có kèm buffer quá khứ
      todayIndex,
    };
  }, [currentDate, treeTasks, childDataMap, expandedTasks, pastBuffer, futureBuffer]);


  // Nhóm các ngày theo tháng để hiển thị header tháng
  // Mỗi group chứa: key (năm-tháng), label (tên tháng), days (số ngày)
  const monthGroups = useMemo(
    function calculateMonthGroups() {
      const groups = [];
      let currentGroup = null;
      const baseYear = getYear(monthStart);
      days.forEach((day) => {
        const dayYear = getYear(day);
        const monthKey = `${dayYear}-${getMonth(day)}`;
        const monthName =
          dayYear !== baseYear
            ? `Tháng ${format(day, "M")}/${dayYear}`
            : `Tháng ${format(day, "M")}`;
        if (!currentGroup || currentGroup.key !== monthKey) {
          if (currentGroup) groups.push(currentGroup);
          currentGroup = { key: monthKey, label: monthName, days: 1 };
        } else {
          currentGroup.days += 1;
        }
      });
      if (currentGroup) groups.push(currentGroup);
      return groups;
    },
    [days, monthStart]
  );

  /**
   * Làm phẳng danh sách công việc dạng cây thành mảng 1 chiều
   * Thêm các thuộc tính: level (cấp độ), isExpanded (đang mở), hasChildren (có con)
   * Chỉ hiển thị công việc con khi cha đang mở rộng
   */
  const flattenTasks = useCallback(
    function flattenTasksRecursive(taskList, level) {
      const result = [];
      const list = Array.isArray(taskList) ? taskList : [];
      list.forEach(function processTask(task) {
        const isExpanded = expandedTasks.includes(task.id);
        // Ưu tiên dùng children từ childDataMap (lazy-loaded), fallback về task.children
        const lazyChildren = childDataMap[task.id];
        const staticChildren = task.children && task.children.length > 0 ? task.children : [];
        const mergedChildren = lazyChildren !== undefined ? lazyChildren : staticChildren;
        const hasChildren = task.hasChildren || mergedChildren.length > 0;
        const isLoading = !!loadingChildren[task.id];
        result.push({ ...task, level: level || 0, isExpanded, hasChildren, isLoading });
        if (isExpanded && mergedChildren.length > 0) {
          result.push(
            ...flattenTasksRecursive(mergedChildren, (level || 0) + 1)
          );
        }
      });
      return result;
    },
    [expandedTasks, childDataMap, loadingChildren]
  );

  // Danh sách công việc đã được làm phẳng để render
  const flatTasks = useMemo(
    function computeFlatTasks() {
      return flattenTasks(treeTasks, 0);
    },
    [treeTasks, flattenTasks]
  );

  // Flatten ALL tasks (không phụ thuộc expand/collapse) để tính dependency từ dependentTaskId
  const allTasksFlat = useMemo(() => {
    const result = [];
    const walk = (list) => {
      const arr = Array.isArray(list) ? list : [];
      arr.forEach((t) => {
        result.push(t);
        if (t?.children?.length) walk(t.children);
      });
    };
    walk(treeTasks);
    return result;
  }, [treeTasks]);

  const taskNameById = useMemo(() => {
    const map = new Map();
    allTasksFlat.forEach((t) => {
      map.set(t.id, t?.name ?? String(t.id));
    });
    return map;
  }, [allTasksFlat]);

  // Tạo dependencies dựa trên trường dependentTaskId của task
  const dependenciesFromTasks = useMemo(() => {
    const deps = [];
    const seen = new Set();

    allTasksFlat.forEach((t) => {
      const toId = t?.id;
      const fromId = t?.dependentTaskId;
      if (!fromId || !toId) return;
      if (!taskNameById.has(fromId)) return; // không tìm thấy task nguồn -> bỏ qua
      const key = `${fromId}__${toId}`;
      if (seen.has(key)) return;
      seen.add(key);

      const fromName = taskNameById.get(fromId);
      const toName = taskNameById.get(toId);

      deps.push({
        id: `dependentTaskId-${key}`,
        fromId,
        toId,
        type: "FS",
        label: `Phụ thuộc: "${toName}" phụ thuộc "${fromName}"`,
      });
    });

    return deps;
  }, [allTasksFlat, taskNameById]);

  // Merge dependency từ props/API/kéo-thả với dependency từ dependentTaskId, tránh trùng
  const mergedDependencies = useMemo(() => {
    const merged = [];
    const seen = new Set();

    const add = (dep, fallbackIdPrefix) => {
      if (!dep) return;
      const fromId = dep.fromId;
      const toId = dep.toId;
      if (!fromId || !toId) return;
      const key = `${fromId}__${toId}`;
      if (seen.has(key)) return;
      seen.add(key);

      const fromName = taskNameById.get(fromId);
      const toName = taskNameById.get(toId);
      const label =
        dep.label ||
        (fromName && toName
          ? `Phụ thuộc: "${toName}" phụ thuộc "${fromName}"`
          : `Dependency: ${fromId} → ${toId}`);

      merged.push({
        ...dep,
        id: dep.id || `${fallbackIdPrefix}-${key}`,
        label,
      });
    };

    (Array.isArray(dependencies) ? dependencies : []).forEach((d) => add(d, "dep"));
    dependenciesFromTasks.forEach((d) => add(d, "depField"));

    return merged;
  }, [dependencies, dependenciesFromTasks, taskNameById]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      // scrollHeight phản ánh toàn bộ chiều cao nội dung, kể cả phần nằm ngoài viewport
      setContentHeight(el.scrollHeight);
      // Cập nhật anchors khi đo lại
      updateAnchors();
    };

    measure();

    // Theo dõi thay đổi chiều cao khi API trả về thêm/bớt task, expand/collapse...
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => ro.disconnect();
  }, [flatTasks.length, updateAnchors]);

  // Khi danh sách flatTasks thay đổi (expand/collapse tree), tính lại anchors
  // sau khi tất cả useEffect của TaskRowItem (registerTaskBar) đã chạy xong.
  // Dùng requestAnimationFrame để đảm bảo React đã commit DOM và tất cả refs đã được đăng ký.
  useEffect(() => {
    let rafId;
    // double RAF để đảm bảo browser đã layout xong sau khi React commit
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        updateAnchors();
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [flatTasks, updateAnchors]);



  // Giữ vị trí cuộn khi pastBuffer thay đổi (mở rộng về quá khứ)
  const prevDisplayStartRef = useRef(displayStart);
  useLayoutEffect(() => {
    if (prevDisplayStartRef.current && displayStart) {
      const diffDays = differenceInDays(prevDisplayStartRef.current, displayStart);
      if (diffDays !== 0) {
        const scrollContainer = contentRef.current?.parentElement;
        if (scrollContainer) {
          scrollContainer.scrollLeft += diffDays * DAY_WIDTH;
        }
      }
    }
    prevDisplayStartRef.current = displayStart;
  }, [displayStart]);

  const pastBufferRef = useRef(pastBuffer);
  pastBufferRef.current = pastBuffer;

  const futureBufferRef = useRef(futureBuffer);
  futureBufferRef.current = futureBuffer;

  const daysRef = useRef(days);
  daysRef.current = days;

  // Refs theo dõi buffer dự kiến để ngăn chặn nhiều cập nhật đồng thời khi cuộn nhanh
  const pendingPastBufferRef = useRef(pastBuffer);
  const pendingFutureBufferRef = useRef(futureBuffer);

  useEffect(() => {
    pendingPastBufferRef.current = pastBuffer;
  }, [pastBuffer]);

  useEffect(() => {
    pendingFutureBufferRef.current = futureBuffer;
  }, [futureBuffer]);

  // Lắng nghe scroll để thực hiện:
  // 1. Cập nhật vị trí các liên kết (dependency arrows)
  // 2. Cập nhật tiêu đề tháng động hiển thị ở góc trái (visibleMonthDate)
  // 3. Tự động mở rộng buffer khi cuộn đến biên quá khứ/tương lai (lazy expand)
  useEffect(() => {
    const scrollContainer = contentRef.current?.parentElement;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;

      // 1. Cập nhật anchor positions cho dependency arrows
      if (isDragging || dependencies.length > 0) {
        updateAnchors();
      }

      // 2. Xác định tháng đang hiển thị trên màn hình
      const dayIndex = Math.floor(scrollLeft / DAY_WIDTH);
      const currentVisible = daysRef.current[dayIndex];
      if (currentVisible) {
        const hasMonthChanged =
          currentVisible.getMonth() !== visibleMonthDateRef.current.getMonth() ||
          currentVisible.getFullYear() !== visibleMonthDateRef.current.getFullYear();
        if (hasMonthChanged) {
          visibleMonthDateRef.current = currentVisible;
          setVisibleMonthDate(currentVisible);
        }
      }

      // 3. Phát hiện khi cuộn gần biên trái hoặc phải để lazy expand
      const threshold = 4 * 30 * DAY_WIDTH; // Tăng threshold lên 4 tháng (6000px) để mượt hơn, tránh giật khi cuộn nhanh

      // Cuộn gần biên trái -> Tăng pastBuffer
      if (scrollLeft < threshold) {
        if (pendingPastBufferRef.current === pastBufferRef.current) {
          pendingPastBufferRef.current = pastBufferRef.current + 6;
          setPastBuffer((prev) => prev + 6);
        }
      }
      // Cuộn gần biên phải -> Tăng futureBuffer
      else if (scrollLeft + clientWidth > scrollWidth - threshold) {
        if (pendingFutureBufferRef.current === futureBufferRef.current) {
          pendingFutureBufferRef.current = futureBufferRef.current + 6;
          setFutureBuffer((prev) => prev + 6);
        }
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [isDragging, dependencies.length, updateAnchors]);

  const calculateBarStyle = useCallback(
  function computeBarStyle(task) {
    const taskStart = parseTaskDate(task.startDate || task.start);
    const taskEnd = parseTaskDate(task.endDate || task.end);

    if (!taskStart || !taskEnd) return null;

    // Nếu công việc nằm ngoài vùng hiển thị thì không render thanh
    if (taskEnd < displayStart || taskStart > displayEnd) return null;
    // Cắt ngày bắt đầu/kết thúc nếu vượt ra ngoài vùng hiển thị
    const effectiveStart = taskStart < displayStart ? displayStart : taskStart;
    const effectiveEnd = taskEnd > displayEnd ? displayEnd : taskEnd;
    // Tính vị trí từ trái và độ rộng dựa trên số ngày
    const offset = differenceInDays(effectiveStart, displayStart) * DAY_WIDTH;
    const width = (differenceInDays(effectiveEnd, effectiveStart) + 1) * DAY_WIDTH;
    return { left: offset, width: Math.max(width, DAY_WIDTH) };
  },
  [displayStart, displayEnd] // ← thay monthStart bằng displayStart
);

  /**
   * Xử lý chuyển đổi tháng hiển thị (trước/sau)
   * Nếu có callback onMonthChange thì gọi, không thì cập nhật state nội bộ
   * @param {string} direction - Hướng chuyển: 'prev' hoặc 'next'
   */
  const handleMonthChange = useCallback(
    function changeMonth(direction) {
      if (onMonthChange) {
        onMonthChange(direction);
      } else {
        setInternalDate(function updateDate(prev) {
          if (direction === "today") {
            return new Date();
          }
          return direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1);
        });
      }
    },
    [onMonthChange]
  );

  /**
   * Xử lý mở rộng/thu gọn công việc có con
   * Toggle trạng thái expanded của công việc
   * @param {Event} e - Sự kiện click
   * @param {number} taskId - ID công việc
   */
  const fetchChildren = useCallback(async (parentId) => {
    if (loadingChildren[parentId]) return;
    setLoadingChildren((prev) => ({ ...prev, [parentId]: true }));
    try {
      const response = await api.get(`${API_ADD_COMMON_WORK}/${parentId}/children`);
      const resData = response?.data ?? response;
      const newItems = Array.isArray(resData?.data) ? resData.data
        : Array.isArray(resData) ? resData
          : [];
      setChildDataMap((prev) => ({ ...prev, [parentId]: newItems }));
    } catch (error) {
      toast(error?.response?.data?.message || 'Lỗi không thể lấy dữ liệu công việc!', 'error')
    } finally {
      setLoadingChildren((prev) => ({ ...prev, [parentId]: false }));
    }
  }, [loadingChildren,toast]);

  const handleExpandClick = useCallback(
    function expandTask(e, taskId) {
      e.stopPropagation(); // Ngăn sự kiện lan lên hàng cha

      // Nếu chưa có dữ liệu con trong childDataMap thì fetch
      if (!childDataMap[taskId]) {
        fetchChildren(taskId);
      }

      if (onTaskExpand) {
        onTaskExpand(taskId);
      } else {
        setInternalExpanded(function updateExpanded(prev) {
          return prev.includes(taskId)
            ? prev.filter(function filterOut(id) {
              return id !== taskId;
            })
            : [...prev, taskId];
        });
      }
    },
    [onTaskExpand, childDataMap, fetchChildren]
  );

  /**
   * Xử lý chọn/bỏ chọn công việc bằng checkbox
   * @param {Event} e - Sự kiện change của checkbox
   * @param {number} taskId - ID công việc
   */
  const handleCheckboxChange = useCallback(
    function toggleCheckbox(e, taskId) {
      e.stopPropagation(); // Ngăn sự kiện lan lên hàng cha
      if (onTaskSelect) {
        onTaskSelect(taskId, e.target.checked);
      } else {
        setInternalSelected(function updateSelected(prev) {
          return e.target.checked
            ? [...prev, taskId]
            : prev.filter(function filterOut(id) {
              return id !== taskId;
            });
        });
      }
    },
    [onTaskSelect]
  );

  /**
   * Xử lý click vào hàng công việc
   * Gọi callback onTaskClick nếu được truyền
   * @param {Object} task - Công việc được click
   */
  const handleRowClick = useCallback(
    function clickRow(task) {
      if (onTaskClick) {
        onTaskClick(task);
      }
    },
    [onTaskClick]
  );

  /**
   * Xử lý chọn/bỏ chọn tất cả công việc
   * @param {Event} e - Sự kiện change của checkbox "Chọn tất cả"
   */
  // const handleSelectAll = useCallback(
  //   function selectAllTasks(e) {
  //     const allIds = flatTasks.map(function getId(t) {
  //       return t.id;
  //     });
  //     if (onTaskSelect) {
  //       allIds.forEach(function selectEach(id) {
  //         onTaskSelect(id, e.target.checked);
  //       });
  //     } else {
  //       setInternalSelected(e.target.checked ? allIds : []);
  //     }
  //   },
  //   [flatTasks, onTaskSelect]
  // );

  // Xử lý click nút chuyển về tháng trước
  const handlePrevMonth = useCallback(
    function goToPrevMonth() {
      handleMonthChange("prev");
    },
    [handleMonthChange]
  );

  // Xử lý click nút chuyển đến tháng sau
  const handleNextMonth = useCallback(
    function goToNextMonth() {
      handleMonthChange("next");
    },
    [handleMonthChange]
  );

  // Xử lý click nút quay lại hôm nay
  const handleToday = useCallback(
    function goToToday() {
      handleMonthChange("today");
      
      // Thực hiện cuộn mượt đến ngày hôm nay
      const scrollContainer = contentRef.current?.parentElement;
      if (scrollContainer && todayIndex !== -1) {
        // Căn giữa ngày hôm nay trong khung nhìn
        const targetScrollLeft = todayIndex * DAY_WIDTH - scrollContainer.clientWidth / 2;
        scrollContainer.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: "smooth"
        });
      }
    },
    [handleMonthChange, todayIndex]
  );

  // Lấy text hiển thị cho header điều hướng tháng (VD: "tháng 12 năm 2025")
  const getHeaderText = () => {
    return `Tháng ${format(visibleMonthDate, "MM, yyyy")}`;
  };

  // Cấu hình style cho tooltip (nền, màu chữ, viền, bo góc, bóng)
  const tooltipProps = {
    tooltip: {
      sx: {
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        boxShadow: theme.shadows[4],
      },
    },
  };

  // Render các ô header tháng (VD: "Tháng 12", "Tháng 1/2026"...)
  const renderMonthHeaders = () => {
    return monthGroups.map(function renderGroup(group) {
      return (
        <MonthHeaderCell key={group.key} cellWidth={group.days * DAY_WIDTH}>
          {group.label}
        </MonthHeaderCell>
      );
    });
  };

  // Render các ô header ngày (1, 2, 3... 31)
  const renderDayHeaders = () => {
    const today = new Date();
    return days.map(function renderDay(day) {
      const isToday =
        day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear();
      return (
        <DayCell
          key={day.toISOString()}
          isToday={isToday}
          data-today={isToday ? "true" : undefined}
        >
          {format(day, "d")}
        </DayCell>
      );
    });
  };

  // Render danh sách các hàng công việc
  // Mỗi hàng bao gồm: thông tin công việc (trái) và thanh tiến độ (phải)
  function renderTaskRows() {
    // logger.log("flatTasks", flatTasks);
    return flatTasks.map(function renderTask(task) {
      const barStyle = calculateBarStyle(task);
      const color = getStatusColor(task.processStatus);

      // Kiểm tra task này có đang được highlight khi kéo không
      const isHighlighted = isDragging && hoveredTaskId === task.id;
      // Kiểm tra có phải target hợp lệ không
      const isValid = isHighlighted && isValidTarget;

      return (
        <TaskRowItem
          key={task.id}
          task={task}
          days={days}
          todayIndex={todayIndex}
          barStyle={barStyle}
          statusColor={color}
          selectedTasks={selectedTasks}
          showDetails={showDetails}
          tooltipProps={tooltipProps}
          onRowClick={handleRowClick}
          onExpandClick={handleExpandClick}
          onCheckboxChange={handleCheckboxChange}
          disbleCheckbox
          // Dependency props
          isDragging={isDragging}
          isHighlighted={isHighlighted}
          isValidTarget={isValid}
          onDragStart={enableDependencies ? handleDragStart : undefined}
          onTaskHover={handleTaskHover}
          onTaskLeave={handleTaskLeave}
          registerTaskBar={registerTaskBar}
        />
      );
    });
  }


  // Click ra ngoài để đóng filter
  const handleClickAway = useCallback(() => {
    setOpenFilter(false);
  }, []);

  // Toggle mở/đóng filter
  const handleToggleFilter = useCallback(() => {
    setOpenFilter((prev) => !prev);
  }, []);

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

  const handleSearchButtonClick = useCallback(() => {
    const matchedColumns = filterOptions?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns?.map((col) => col.code);
    if (onSearch) {
      onSearch(searchText, codeValues);
    }
  }, [filterOptions, selectedColumns, onSearch, searchText]);

  const handleApplyFilter = useCallback(() => {
    setSelectedColumns(tempSelectedColumns); // Áp dụng thay đổi
    // handleSearchButtonClick(); // Tìm kiếm lại - Optional, depending on preference
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

  const handleClearSearch = useCallback(() => {
    setSearchText("");
  }, []);

  // Click "Bộ lọc" trong pill → ưu tiên gọi prop từ ngoài, fallback toggle filter nội bộ
  const handleOpenAdvancedFilter = useCallback((e) => {
    if (onAdvancedFilterClick) {
      onAdvancedFilterClick(e);
    } else {
      handleToggleFilter();
    }
  }, [onAdvancedFilterClick, handleToggleFilter]);

  useEffect(() => {
  const todayEl = contentRef.current?.querySelector('[data-today="true"]');
  if (todayEl) {
    todayEl.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
  }
}, []); // Chỉ chạy 1 lần khi mount

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <GanttWrapper>
        {(onSearch || renderAfterSearch) && (
          <StyledToolbarGantt>
            <ToolbarContent>
              <SearchRowWrapper>
                <UnifiedSearchContainer>
                  <ClickAwayListener onClickAway={handleClickAway}>
                    <FilterRelativeWrapper>
                      <PillFilterTrigger onClick={handleOpenAdvancedFilter}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.7398 2.01172L1.33984 2.01172L6.69984 8.34992L6.69984 12.7317L9.37984 14.0717L9.37984 8.34992L14.7398 2.01172Z" stroke="currentColor" strokeWidth="1.34" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Bộ lọc</span>
                      </PillFilterTrigger>

                      {openFilter && (
                        <FilterBox alignRight={false}>
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
                          <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

              {/* Advanced filter — ẩn button gốc "Bộ Lọc", chỉ giữ Popover */}
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
          </StyledToolbarGantt>
        )}

        <GanttTopBar>
          <TopBarMonthText>{getHeaderText()}</TopBarMonthText>
          <TopBarNavButtonGroup>
            <TopBarNavButton size="small" onClick={handlePrevMonth} title="Tháng trước">
              <ChevronLeft />
            </TopBarNavButton>
            <TopBarTodayButton onClick={handleToday}>
              Hôm nay
            </TopBarTodayButton>
            <TopBarNavButton size="small" onClick={handleNextMonth} title="Tháng sau">
              <ChevronRight />
            </TopBarNavButton>
          </TopBarNavButtonGroup>
        </GanttTopBar>


        <GanttContainer>
          {/* TaskBodyWrapper vẫn là scroll container */}
          <TaskBodyWrapper>
            {/* NEW: Content wrapper có position:relative để line bám theo content */}
            <GanttContent ref={contentRef}>
              <StickyHeaderGrantt>
                {/* Cột trái gộp 2 dòng và căn giữa hoàn toàn */}
                <MergedHeaderLeftCell eftCell>
                  <HeaderLeftText>DANH SÁCH CÔNG VIỆC</HeaderLeftText>
                </MergedHeaderLeftCell>

                {/* Phần bên phải chứa 2 hàng header độc lập */}
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: "fit-content" }}>
                  <MonthHeaderRowContainer>
                    <HeaderRightWrapper>
                      <StickyGanttMonthNav>
                        <NavButton size="small" onClick={handlePrevMonth} title="Tháng trước">
                          <ChevronLeft />
                        </NavButton>
                        <GanttInlineMonthText>{getHeaderText()}</GanttInlineMonthText>
                        <NavButton size="small" onClick={handleNextMonth} title="Tháng sau">
                          <ChevronRight />
                        </NavButton>
                      </StickyGanttMonthNav>
                      {renderMonthHeaders()}
                    </HeaderRightWrapper>
                  </MonthHeaderRowContainer>

                  <DayHeaderRowContainer>
                    <HeaderRightWrapper>{renderDayHeaders()}</HeaderRightWrapper>
                  </DayHeaderRowContainer>
                </div>
              </StickyHeaderGrantt>

              {renderTaskRows()}


              {/* Dependency arrows overlay */}
              {enableDependencies && (
                <DependencyArrows
                  dependencies={mergedDependencies}
                  taskAnchors={taskAnchors}
                  dragState={dragState}
                  svgWidth={contentRef.current?.scrollWidth || "100%"}
                  svgHeight={contentHeight || "100%"}
                />
              )}
            </GanttContent>
          </TaskBodyWrapper>
        </GanttContainer>

        <LegendWrapper>
          <LegendItem>
            <LegendBox boxColor="#e0e0e0" isLight={false} />
            <TaskNameText variant="body2">Công việc mới</TaskNameText>
          </LegendItem>
          <LegendItem>
            <LegendBox boxColor="#2196f3" isLight={false} />
            <TaskNameText variant="body2">Tiến độ thực tế</TaskNameText>
          </LegendItem>
          <LegendItem>
            <LegendBox boxColor="#fdd835" isLight={false} />
            <TaskNameText variant="body2">Chờ phê duyệt</TaskNameText>
          </LegendItem>
          <LegendItem>
            <LegendBox boxColor="#4caf50" isLight={false} />
            <TaskNameText variant="body2">Hoàn thành</TaskNameText>
          </LegendItem>
          <LegendItem>
            <LegendBox boxColor="#F44336" isLight={false} />
            <TaskNameText variant="body2">Hủy</TaskNameText>
          </LegendItem>
          <LegendItem>
            <LegendBox boxColor="#ff9800" isLight={false} />
            <TaskNameText variant="body2">Điều chỉnh</TaskNameText>
          </LegendItem>
        </LegendWrapper>

        <LoadingDialog open={Object.values(loadingChildren).some(Boolean)} >
          Đang tải dữ liệu, vui lòng đợi...
        </LoadingDialog>
      </GanttWrapper>
    </div>
  );
}

CustomGantt.displayName = "CustomGantt";

export default memo(CustomGantt);