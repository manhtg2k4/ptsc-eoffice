/* eslint-disable no-restricted-syntax */
/* eslint-disable react/forbid-component-props */
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import PropTypes from "prop-types";
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import {
  StyledTableContainer,
  StyledTableRow,
  StyledCheckbox,
  StyledTableCellActions,
  HeaderCellContainer,
  SortIconContainer,
  StyledArrowUp,
  StyledTable as StyledTableBorder,
  StyleBoxActionsBoder,
  StyledTableCellActionsSpecial,
  StyledTableCellWrap,
  StyledArrowDown,
  StyledBox,
  StyledBoxBoder,
  StyledBoxBoderBox,
  StyledBoxBoderBuilder,
  StyledBoxContainer,
  StyledBoxTable,
  StyledBoxTableBoder,
  // StyledButtonTable,
  StyledCheckboxTable,
  StyledFormControlTable,
  StyledIconButton,
  StyledTableHead,
  MobileActionsIconButton,
  PopoverActionButton,
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
  BoxStyed,
  ToggleButton,
  NodeName,
  TreeTableCell,
  StyledActionMenuItem,
  SkeletonW80,
  SkeletonW20,
  SkeletonWH,
  // StyledFilePopover,
  // FilePopper,
} from "@styles/customTableBorder.style"; // ✅ CHỈ IMPORT TỪ FILE NÀY
import {
  StyledTableHeaderCell,
  StyledTableCell,
  TreeLoadingBox,
  TreeLoadMoreRow,
  TreeLoadMoreBox,
  StyleSkyTableCell,
} from "@styles/CustomTable.styles";
import {
  Box,
  Button,
  MenuItem,
  Popover,
  Select,
  Tooltip,
  IconButton,
  Typography,
  FormControlLabel,
  TableBody,
  InputLabel,
  Popper,
  Checkbox,
  CircularProgress,

} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from "@mui/material/styles"; // ✅ Import đúng
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import configTable from "./config";
import { addDataFieldConfig } from "@redux/slices/FormDesign/formDesignSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  API_DYNAMIC,
  API_STAR_CHANGE,
  // API_CUSTOM_SENDER_UNITS,
  // APP_DHVB_BASE,
  APP_BASE,
  API_ADD_COMMON_WORK,
} from "@EnvironmentFile/constants/urlConfig";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DebounceTextField from "@components/DynamicForm/DebouncedTextField";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import { globalComponentRegistry } from "../../builder-table/components/componentRegistry";
import { upDateColumnTable } from "@redux/slices/CustomTable/CustomTableSlice";
import { Close, Pause, PersonAddAlt, PlayArrow } from "@mui/icons-material";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import LoadingDialog from "@components/LoadingDialog";
import DOMPurify from "dompurify";
import EditIcon from "@mui/icons-material/Edit";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import axiosInstance from "@utils/axiosInstance";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

export const StyledEditableDateBox = styled(Box)({
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

const EditableDateCell = ({ row, content, apiUrl, setReloadData, toast, setLoadingDate }) => {
  const pickerContainerRef = useRef(null);

  const getParsedDate = useCallback((val) => {
    if (!val) return null;
    const parsed = dayjs(val, ["DD/MM/YYYY HH:mm", "DD/MM/YYYY", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true);
    return parsed.isValid() ? parsed : dayjs(val);
  }, []);

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
    const parentStartDateStr = row?.deadlineStartParentISO ?? row?.deadlineStartParent;
    const parentEndDateStr = row?.deadlineEndParentISO ?? row?.deadlineEndParent;
    const parentStartDate = getParsedDate(parentStartDateStr);
    const parentEndDate = getParsedDate(parentEndDateStr);

    const effectiveParentEndDate = parentEndDateStr && !parentEndDateStr.includes(':')
      ? parentEndDate.endOf('day')
      : parentEndDate;

    const newStart = selectedDates.startDate ? dayjs(selectedDates.startDate) : null;
    const newEnd = selectedDates.endDate ? dayjs(selectedDates.endDate) : null;

    // 1. Kiểm tra ngày bắt đầu phải trước hoặc bằng ngày kết thúc
    if (newStart && newEnd && newEnd.isBefore(newStart)) {
      toast("Hạn xử lý phải lớn hơn hoặc bằng ngày bắt đầu", "error");
      return;
    }

    // 2. Kiểm tra ràng buộc so với công việc cha
    if (parentStartDateStr || parentEndDateStr) {
      if (newStart && parentStartDate && parentStartDate.isValid() && newStart.isBefore(parentStartDate)) {
        toast(`Ngày bắt đầu không được trước ngày bắt đầu của công việc cha (${parentStartDate.format('DD/MM/YYYY HH:mm')})`, "error");
        return;
      }
      if (newStart && effectiveParentEndDate && effectiveParentEndDate.isValid() && newStart.isAfter(effectiveParentEndDate)) {
        toast(`Ngày bắt đầu không được vượt quá hạn kết thúc của công việc cha (${effectiveParentEndDate.format('DD/MM/YYYY HH:mm')})`, "error");
        return;
      }
      if (newEnd && effectiveParentEndDate && effectiveParentEndDate.isValid() && newEnd.isAfter(effectiveParentEndDate)) {
        toast(`Hạn xử lý không được vượt quá hạn kết thúc của công việc cha (${effectiveParentEndDate.format('DD/MM/YYYY HH:mm')})`, "error");
        return;
      }
    }

    // Tiến hành gọi API bất đồng bộ sau khi đã vượt qua tất cả kiểm thử
    const executePatch = async () => {
      setLoadingDate(true)
      try {
        let cleanUrl = apiUrl || "/api/tasks";
        if (cleanUrl && cleanUrl.includes("?")) {
          cleanUrl = cleanUrl.split("?")[0];
        }
        let finalUrl = cleanUrl;
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
          const path = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
          const prefix = path.startsWith("/api") ? "" : "/api";
          finalUrl = `${APP_BASE}${prefix}${path}`;
        }

        const id = row.id || row._id || row.documentId || row.bookDocumentId;
        const payload = {
          startDate: selectedDates.startDate ? dayjs(selectedDates.startDate).toISOString() : null,
          endDate: selectedDates.endDate ? dayjs(selectedDates.endDate).toISOString() : null,
        };

        await axiosInstance.patch(`${finalUrl}/${id}`, payload);
        toast("Cập nhật thời gian thành công!", "success");
        setLoadingDate(false)
        setReloadData?.(new Date() * 1);
      } catch (error) {
        setLoadingDate(false)
        toast(error?.response?.data?.message || "Cập nhật thời gian thất bại!", "error");
      } finally {
        setLoadingDate(false);
      }
    };

    executePatch();
  }, [row, apiUrl, toast, setReloadData, getParsedDate, setLoadingDate]);

  const parentStartDateStr = row?.deadlineStartParentISO;
  const parentEndDateStr = row?.deadlineEndParentISO;
  const parentStartDate = getParsedDate(parentStartDateStr);
  const parentEndDate = getParsedDate(parentEndDateStr);

  const hasParentConstraints = !!(parentStartDateStr || parentEndDateStr);

  const minDate = hasParentConstraints && parentStartDate && parentStartDate.isValid()
    ? parentStartDate
    : dayjs().startOf("day");
  const maxDate = hasParentConstraints && parentEndDate && parentEndDate.isValid()
    ? (parentEndDateStr && !parentEndDateStr.includes(':') ? parentEndDate.endOf('day') : parentEndDate)
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

// Options will be created dynamically inside the component
const LoadMoreRow = React.memo(({ onVisible, level, colSpan, loading, parentId }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(parentId);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [onVisible, loading, parentId]);

  return (
    <TreeLoadMoreRow ref={ref}>
      <StyleSkyTableCell colSpan={colSpan}>
        <TreeLoadMoreBox level={level}>
          {loading && <CircularProgress size="30px" aria-label="Loading…" />}
        </TreeLoadMoreBox>
      </StyleSkyTableCell>
    </TreeLoadMoreRow>
  );
});

LoadMoreRow.displayName = 'LoadMoreRow';

const iconOptions = [
  { name: "Add", icon: <AddOutlinedIcon />, displayName: "Thêm mới", code: 'hideAdd' },
  { name: "Edit", icon: <EditOutlinedIcon />, displayName: "Cập nhật" },
  { name: "Delete", icon: <DeleteOutlinedIcon />, displayName: "Xóa", code: 'hideDelete' },
  { name: "Search", icon: <SearchOutlinedIcon />, displayName: "Tìm kiếm" },
  { name: "Save", icon: <SaveOutlinedIcon />, displayName: "Lưu" },
  {
    name: "Download",
    icon: <DownloadOutlinedIcon />,
    displayName: "Tải xuống",
  },
  { name: "Settings", icon: <SettingsOutlinedIcon />, displayName: "Cài đặt" },
  {
    name: "Visibility",
    icon: <VisibilityOutlinedIcon />,
    displayName: "Xem chi tiết",
  },
  {
    name: "Reason",
    icon: <RateReviewOutlinedIcon />,
    displayName: "Thu hồi",
  },
  {
    name: 'personadd',
    icon: <PersonAddAlt />,
    displayName: 'Giao việc',
    code: 'isAssignWork'
  },
  { name: "Cancel", icon: <HighlightOffIcon />, displayName: "Hủy lịch" },
  { name: "Pause", icon: <Pause />, displayName: "Tạm dừng", code: 'hidePause' },
  { name: "Play", icon: <PlayArrow />, displayName: "Tiếp tục", code: 'hidePlay' },
  { name: "Close", icon: <Close />, displayName: "Kết thúc", code: 'hideClose' },
];

const StyledIconButtonBorder = styled(IconButton)(({ theme, isSelected }) => ({
  backgroundColor: isSelected ? theme.palette.action.selected : "transparent",
  color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StyledBoxs = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 1,
}));

const IconButtonStyled = styled(IconButton)(() => ({
  padding: 0,
  marginRight: "4px",
}));

const PopperStyled = styled(Popper)(() => ({
  zIndex: 1000,
}));

const BuilderIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "white" : "inherit",
}));

const FileCountTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginLeft: theme.spacing(0.5),
}));

const StyledAttachFileIcon = styled(InsertDriveFileIcon)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(20),
  color: "#2196f5",
}));

const FileIconButton = styled(IconButton)({});

const FilePopoverContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.5, 0),
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  maxHeight: 200,
  overflowY: "auto",
}));

const TypographyStyled = styled(Box)(() => ({
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  whiteSpace: "normal",
  marginLeft: "5px",
}));

const TruncatedCell = ({ content, onClick }) => {
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
      >
        {text}
      </TypographyStyled>
    </Tooltip>
  );
};

const ComponentSelector = ({ componentKey, onChange, displayType }) => {
  const componentRegistryOptions = useMemo(() => {
    return Object.keys(globalComponentRegistry).map((key) => ({
      key,
      ...globalComponentRegistry[key],
    }));
  }, []);

  const handleComponentChange = (e) => {
    const selectedKey = e.target.value;
    const selectedComponent = componentRegistryOptions.find(
      (c) => c.key === selectedKey
    );
    onChange("componentKey", selectedKey);
    if (selectedComponent) {
      onChange("popupName", selectedComponent.title);
    }
  };

  // Lọc components dựa trên displayType
  const filteredComponents = componentRegistryOptions.filter(opt => {

    if (displayType === 'popup') {
      // Khi chọn popup, chỉ hiển thị các component có type:'popup'
      return opt.type === 'popup';
    } else {
      // Khi chọn swiper, hiển thị các component không có type:'popup' hoặc không có type
      return !opt.type || opt.type !== 'popup';
    }
  });

  return (
    <>
      <Typography variant="subtitle2" mt={1}>
        Chọn Component hiển thị
      </Typography>
      <Select
        fullWidth
        size="small"
        value={componentKey || ""}
        onChange={handleComponentChange}
      >
        {filteredComponents.map((opt) => (
          <MenuItem key={opt.key} value={opt.key}>
            {opt.title}
          </MenuItem>
        ))}
      </Select>
    </>
  );
};

const sizeOptions = ["xs", "sm", "md", "lg", "xl"];

const ActionConfigItem = React.memo(
  ({ action, onChange, onRemove, selectOptions }) => {
    const handleDeleteApiUrlChange = useCallback(
      (e) => {
        onChange(action.id, "deleteApiUrl", e.target.value);
      },
      [action.id, onChange]
    );

    const handlePopupNameChange = useCallback(
      (e) => {
        onChange(action.id, "popupName", e.target.value);
      },
      [action.id, onChange]
    );

    const getIcon = useCallback(
      (name) => iconOptions.find((opt) => opt.name === name)?.icon,
      []
    );

    const [formOptions, setFormOptions] = useState([]);

    useEffect(() => {
      const fetchData = async () => {
        try {
          const res = await api.get(API_DYNAMIC, {
            params: { limit: 9999 },
          });
          setFormOptions(res.data?.data || []);
        } catch (err) {
          logger.error("Error fetching form data:", err);
        }
      };

      fetchData();
    }, []);

    const handleRemove = useCallback(() => {
      onRemove(action.id);
    }, [onRemove, action.id]);

    const handleDisplayNameChange = useCallback(
      (e) => {
        onChange(action.id, "displayName", e.target.value);
      },
      [onChange, action.id]
    );

    const handleSelectIcon = useCallback(
      (event) => {
        const iconName = event.currentTarget.dataset.iconName;
        onChange(action.id, "icon", iconName);
      },
      [action.id, onChange]
    );

    const handleSelectActionType = useCallback(
      (e) => {
        onChange(action.id, "actionType", e.target.value);
      },
      [onChange, action.id]
    );

    const handleDisplayTypeChange = useCallback(
      (e) => {
        onChange(action.id, "displayType", e.target.value);
      },
      [onChange, action.id]
    );

    const handleComponentSelectorChange = useCallback(
      (key, value) => {
        onChange(action.id, key, value);
      },
      [onChange, action.id]
    );

    const handleSizeChange = useCallback(
      (e) => {
        onChange(action.id, "size", e.target.value);
      },
      [onChange, action.id]
    );

    const handleFnCodeExportChange = useCallback(
      (e) => {
        onChange(action.id, "fnCodeExport", e.target.value);
      },
      [onChange, action.id]
    );

    const handleMultiFormsChange = useCallback(
      (e) => {
        onChange(action.id, "multiForms", e.target.value);
      },
      [onChange, action.id]
    );

    const handleAllowSignDigitalChange = useCallback(
      (e) => {
        onChange(action.id, "allowSignDigital", e.target.checked);
      },
      [onChange, action.id]
    );

    const handleAllowSignInitialChange = useCallback(
      (e) => {
        onChange(action.id, "allowSignInitial", e.target.checked);
      },
      [onChange, action.id]
    );

    const handleHideInDropdownChange = useCallback(
      (e) => {
        onChange(action.id, "hideInDropdown", e.target.checked);
      },
      [onChange, action.id]
    );

    return (
      <StyledBoxContainer>
        <StyledBox
          styleAlignItems="center"
          styleJustifyContent="space-between"
          mb={1}
        >
          <Tooltip title={action.config.displayName}>
            <StyledIconButton styleColor={action.config.color}>
              {getIcon(action.config.icon)}
            </StyledIconButton>
          </Tooltip>
          <StyledIconButton
            size="small"
            styleColor="error"
            onClick={handleRemove}
          >
            <DeleteOutlineIcon size="small" /> Xóa
          </StyledIconButton>
        </StyledBox>

        <DebounceTextField
          fullWidth
          size="small"
          label="Tên hiển thị (Tooltip)"
          value={action.config.displayName || ""}
          onChange={handleDisplayNameChange}
        />

        <Typography variant="subtitle2">Chọn Icon</Typography>
        <StyledBoxTable mb={1}>
          {iconOptions.map((opt) => (
            <StyledIconButtonBorder
              key={opt.name}
              data-icon-name={opt.name}
              onClick={handleSelectIcon}
              isSelected={action.config.icon === opt.name}
            >
              {opt.icon}
            </StyledIconButtonBorder>
          ))}
        </StyledBoxTable>

        <Typography variant="subtitle2" mt={1}>
          Loại hành động
        </Typography>
        <Select
          fullWidth
          size="small"
          value={action.config.actionType || ""}
          onChange={handleSelectActionType}
        >
          <MenuItem value="add">Tạo mới công việc con</MenuItem>
          <MenuItem value="update">Cập nhật</MenuItem>
          <MenuItem value="view">Chỉ xem</MenuItem>
          <MenuItem value="delete">Xóa</MenuItem>
          <MenuItem value="export">Xuất biểu mẫu</MenuItem>
        </Select>

        {action.config.actionType === "delete" && (
          <>
            <Typography variant="subtitle2" mt={1}>
              URL API Xóa
            </Typography>
            <DebounceTextField
              fullWidth
              size="small"
              label="Nhập URL API"
              value={action.config.deleteApiUrl || ""}
              onChange={handleDeleteApiUrlChange}
            />
          </>
        )}
        {action.config.actionType !== "delete" &&
          action.config.actionType !== "export" && (
            <>
              <>
                <Typography variant="subtitle2" mt={1}>
                  Loại hiển thị
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={action.config.displayType || "popup"}
                  onChange={handleDisplayTypeChange}
                >
                  <MenuItem value="popup">Popup</MenuItem>
                  <MenuItem value="swiper">Swiper</MenuItem>
                </Select>
              </>

              {action.config.displayType === "swiper" && (
                <ComponentSelector
                  componentKey={action.config.componentKey}
                  onChange={handleComponentSelectorChange}
                  displayType={action.config.displayType}
                />
              )}
              {action.config.displayType === "popup" && (
                <ComponentSelector
                  componentKey={action.config.componentKey}
                  displayType={action.config.displayType}
                  // onChange={(key, value) => onChange(action.id, key, value)}
                  onChange={handleComponentSelectorChange}
                />
              )}

              {action.config.displayType === "popup" && (
                <>
                  <Typography variant="subtitle1" mt={1}>
                    Chọn kích thước
                  </Typography>
                  <Select
                    fullWidth
                    value={action.config?.size}
                    onChange={handleSizeChange}
                  >
                    {sizeOptions.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </>
              )}

              <Box mt={1}>
                <DebounceTextField
                  fullWidth
                  size="small"
                  label="Tên popup"
                  value={action.config.popupName || ""}
                  onChange={handlePopupNameChange}
                />
              </Box>
            </>
          )}

        {action.config.actionType === "export" && (
          <>
            <Select
              fullWidth
              size="small"
              value={action.config.fnCodeExport || ""}
              onChange={handleFnCodeExportChange}
            >
              <MenuItem value="">None</MenuItem>
              {selectOptions.map((opt) => (
                <MenuItem key={opt._id} value={opt.code}>
                  {opt.name}
                </MenuItem>
              ))}
            </Select>
            <StyledFormControlTable fullWidth size="small">
              <InputLabel id="multi-form-select-label">
                Chọn nhiều biểu mẫu
              </InputLabel>
              <Select
                labelId="multi-form-select-label"
                multiple
                value={action.config.multiForms || []}
                onChange={handleMultiFormsChange}
                renderValue={(selected) =>
                  formOptions
                    .filter((f) => selected.includes(f.code))
                    .map((f) => f.name)
                    .join(", ")
                }
              >
                {formOptions.map((opt) => (
                  <MenuItem key={opt._id} value={opt.code}>
                    {opt.name}
                  </MenuItem>
                ))}
              </Select>
            </StyledFormControlTable>
          </>
        )}

        <FormControlLabel
          control={
            <StyledCheckboxTable
              checked={action.config.allowSignDigital || false}
              onChange={handleAllowSignDigitalChange}
            />
          }
          label="Cho phép ký số"
        />

        <FormControlLabel
          control={
            <StyledCheckboxTable
              checked={action.config.allowSignInitial || false}
              onChange={handleAllowSignInitialChange}
            />
          }
          label="Cho phép ký nháy"
        />

        <FormControlLabel
          control={
            <StyledCheckboxTable
              checked={action.config.hideInDropdown || false}
              onChange={handleHideInDropdownChange}
            />
          }
          label="Ẩn cấu hình"
        />
      </StyledBoxContainer>
    );
  }
);

ActionConfigItem.displayName = "ActionConfigItem";

ActionConfigItem.propTypes = {
  action: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  selectOptions: PropTypes.array.isRequired,
  featureType: PropTypes.string.isRequired,
};

const CustomTableBorderTree = ({
  type,
  data = [],
  onSelect,
  onSelectAll,
  // selectAll,
  defaultValues = [],
  disabled = false,
  formatId = "id",
  dataColumn,
  mode = "runtime",
  item,
  onPropChange,
  onAction = () => { },
  funcDataForm,
  onOrder,
  isMobile,
  onCellClick,
  reload,
  setReloadData,
  allowColumnDrag = false,
  isAuthorized,
  authorizedFunction,
  fnCode,
  loading,
  apiUrl,
  apiUrlChildren,
  paramsChild = {},
  expandTree = false,
}) => {
  logger.log
  const { dataUser } = useSelector((state) => state.auth);
  // const { crmSource } = useSelector((state) => state.config);
  const userData = useMemo(() => dataUser || {}, [dataUser]);
  const [loadingDate, setLoadingDate] = useState(false);

  const handleActionClick = useCallback(
    (action, row) => () => {
      onAction(action, row);
    },
    [onAction]
  );
  const toast = useToast();

  const dataFields = useSelector((state) => state.formDesign.dataFieldTable);
  const hasField = useMemo(
    () =>
      dataFields.filter(
        (field) =>
          field.filter === true &&
          (field.type === "date" ||
            field.type === "optiontthc" ||
            field.type === "enum" ||
            field.type === "autocomplete")
      ).length >= 3,
    [dataFields]
  );

  const safeData = useMemo(() => data || [], [data]);

  const dispatch = useDispatch();

  const [columns, setColumns] = useState([]);


  const [selectedRows, setSelectedRows] = useState(defaultValues || []);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
  const [currentRowForPopover, setCurrentRowForPopover] = useState(null);
  const [filePopoverAnchorEl, setFilePopoverAnchorEl] = useState(null);
  const filePopoverTimeoutRef = useRef(null);
  const [currentFiles, setCurrentFiles] = useState([]);
  const [currentFileContext, setCurrentFileContext] = useState(null);
  const [moreActionsAnchorEl, setMoreActionsAnchorEl] = useState(null);
  const [moreActionsRow, setMoreActionsRow] = useState(null);
  const [settingMoreAnchor, setSettingMoreAnchor] = useState(null);
  const [actionConfigAnchor, setActionConfigAnchor] = useState(null);
  const [actions, setActions] = useState(item?.props?.configs || []);
  const featureType = item?.props?.featureType;
  const { initialOrderBy, initialOrder } = useMemo(() => ({ initialOrderBy: null, initialOrder: "asc" }), []);
  const [order, setOrder] = useState(initialOrder);
  const [orderBy, setOrderBy] = useState(initialOrderBy);
  const selectOptions = funcDataForm;
  const [columnWidths, setColumnWidths] = useState(() => {
    const map = {};
    (columns || []).forEach((c) => {
      if (c?.width) map[c.name || c.key] = c.width;
    });
    return map;
  });
  const [resizingCol, setResizingCol] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Tree State
  const [expanded, setExpanded] = useState({});
  const loadingRef = useRef({});
  const prevExpandTreeRef = useRef(false);
  const [childDataMap, setChildDataMap] = useState({});
  const [childPaginationMap, setChildPaginationMap] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});

  const getRowId = useCallback(
    (row, index) =>
      row?.[formatId] ||
      row?._id ||
      row?.id ||
      row?.documentId ||
      row?.bookDocumentId ||
      index,
    [formatId]
  );

  const collectDescendantIds = useCallback(
    (parentId, map = childDataMap) => {
      const descendantIds = [];
      const stack = [parentId];

      while (stack.length) {
        const currentId = stack.pop();
        const children = map[currentId] || [];
        children.forEach((child, index) => {
          const childId = getRowId(child, index);
          if (childId !== undefined && childId !== null) {
            descendantIds.push(childId);
            stack.push(childId);
          }
        });
      }

      return descendantIds;
    },
    [childDataMap, getRowId]
  );

  const fetchChildren = useCallback(async (parentId, page = 1) => {
    if (loadingRef.current[parentId]) return;

    loadingRef.current[parentId] = true;
    setLoadingChildren((prev) => ({ ...prev, [parentId]: true }));
    try {
      const params = { page, limit: 10 , ...paramsChild};
      // Sử dụng apiUrlChildren nếu được truyền vào, ngược lại dùng API_ADD_COMMON_WORK mặc định
      const baseUrl = apiUrlChildren ? `${APP_BASE}/api${apiUrlChildren}/${parentId}` : `${API_ADD_COMMON_WORK}/${parentId}/children`;

      const response = await api.get(`${baseUrl}`, { params });

      const resData = response.data;
      const newItems = resData.data || [];
      const totalPages = resData.totalPages || 0;
      const total = resData.total || 0;

      setChildDataMap((prev) => {
        const updated = {
          ...prev,
          [parentId]: page === 1 ? newItems : [...(prev[parentId] || []), ...newItems],
        };

        if (selectedRows.includes(parentId)) {
          const descendantIds = collectDescendantIds(parentId, updated);
          setSelectedRows((prevSelected) =>
            Array.from(new Set([...prevSelected, ...descendantIds]))
          );
        }

        return updated;
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
  }, [collectDescendantIds, selectedRows, toast, apiUrlChildren, paramsChild]);

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

  const handleStarClick = useCallback(
    async (row) => {
      if (!row.documentId) {
        toast("Không tìm thấy ID của văn bản.", "error");
        return;
      }
      try {
        const userId = userData?._id || userData?.id || userData?.user?._id || userData?.user?.id;
        if (!userId) {
          toast("Không tìm thấy thông tin người dùng.", "error");
          return;
        }
        const moduleCode = isAuthorized === true && authorizedFunction ? authorizedFunction : fnCode;
        const payload = {
          documentIds: [row.documentId],
          starObj: { [moduleCode]: [userId] },
          isStar: !row.isStar,
        };
        await api.post(API_STAR_CHANGE, payload);
        toast("Cập nhật trạng thái thành công!", "success");
        if (setReloadData) {
          setReloadData((prev) => prev + 1);
        }
      } catch (error) {
        toast(error.response?.data?.message || "Cập nhật trạng thái thất bại!", "error");
      }
    },
    [toast, setReloadData, fnCode, isAuthorized, authorizedFunction, userData]
  );

  const handleOpenActionsPopover = (event, row) => {
    setPopoverAnchorEl(event.currentTarget);
    setCurrentRowForPopover(row);
  };

  const handleCloseActionsPopover = useCallback(() => {
    setPopoverAnchorEl(null);
    setCurrentRowForPopover(null);
  }, []);

  const handleOpenMoreActions = (event, row) => {
    setMoreActionsAnchorEl(event.currentTarget);
    setMoreActionsRow(row);
  };

  const handleCloseMoreActions = useCallback(() => {
    setMoreActionsAnchorEl(null);
    setMoreActionsRow(null);
  }, []);

  const handleMoreActionsClick = useCallback((row) => (event) => {
    handleOpenMoreActions(event, row);
  }, []);

  const handleMoreActionItemClick = useCallback(
    (action, row) => () => {
      handleActionClick(action, row)();
      handleCloseMoreActions();
    },
    [handleActionClick]
  );

  const handleOpenActionsPopoverCallback = useCallback((row) => (event) => {
    handleOpenActionsPopover(event, row);
  }, []);

  const handlePopoverActionClick = useCallback(
    (action, row) => () => {
      handleActionClick(action, row)();
      handleCloseActionsPopover();
    },
    [handleActionClick]
  );

  const allPossibleColumns = useMemo(() => {
    if (dataColumn?.length) {
      return dataColumn.map(({ name, showInList, ...rest }) => ({
        ...rest,
        key: name || rest.key,
        name: name || rest.name,
        isShow: showInList !== undefined ? showInList : (rest.isShow !== undefined ? rest.isShow : true),
      }));
    }
    return (configTable[type] || []).map((c) => ({ ...c, isShow: true }));
  }, [type, dataColumn]);

  useEffect(() => {
    if (reload !== null) {
      setSelectedRows([]);
      // Reset tree state để khi expand lại sẽ fetch data mới
      setExpanded({});
      setChildDataMap({});
      setChildPaginationMap({});
      loadingRef.current = {};
    }
  }, [reload]);

  // Tự động mở rộng (expand) cây và tải dữ liệu con cháu chắt khi expandTree = true
  useEffect(() => {
    if (expandTree) {
      if (safeData && safeData.length > 0) {
        // Thu thập tất cả các node hiện có (nút gốc + các nút con đã được tải)
        const allNodes = [];
        allNodes.push(...safeData);
        Object.values(childDataMap).forEach((children) => {
          if (Array.isArray(children)) {
            allNodes.push(...children);
          }
        });

        let hasNewExpand = false;
        const newExpanded = { ...expanded };

        allNodes.forEach((node, index) => {
          const rowId = getRowId(node, index);
          if (rowId !== undefined && rowId !== null && node?.flags?.hasChildren) {
            if (!newExpanded[rowId]) {
              newExpanded[rowId] = true;
              hasNewExpand = true;
            }
            // Tải dữ liệu con nếu chưa có và không đang tải
            if (!childDataMap[rowId] && !loadingRef.current[rowId]) {
              fetchChildren(rowId, 1);
            }
          }
        });

        if (hasNewExpand) {
          setExpanded(newExpanded);
        }
      }
    } else {
      // Chỉ thu gọn cây về mặc định nếu expandTree vừa chuyển từ true sang false
      if (prevExpandTreeRef.current) {
        setExpanded({});
      }
    }
    prevExpandTreeRef.current = expandTree;
  }, [expandTree, safeData, getRowId, fetchChildren, childDataMap, expanded]);

  useEffect(() => {
    setSelectedRows([]);
    if (onSelect) onSelect([], []);
    if (onSelectAll) onSelectAll(false);
  }, [data, onSelect, onSelectAll]);

  useEffect(() => {
    setActions(item?.props?.configs || []);
  }, [item?.props?.configs]);

  useEffect(() => {
    if (allPossibleColumns.length > 0) {
      setColumns(allPossibleColumns);
      dispatch(addDataFieldConfig(allPossibleColumns));
    }
  }, [type, dataColumn, dispatch, allPossibleColumns]);

  useEffect(() => {
    const map = {};
    (columns || []).forEach((c) => {
      if (c?.width) map[c.name || c.key] = c.width;
    });
    setColumnWidths((prev) => ({ ...prev, ...map }));
  }, [columns]);

  useEffect(() => {
    setSelectedRows(defaultValues || []);
  }, [defaultValues]);

  useEffect(() => {
    if (onPropChange) {
      onPropChange(item.id, "configs", actions);
    }
  }, [actions, onPropChange, item?.id]);

  // const getAllTreeRows = useCallback(() => {
  //   const rows = [];
  //   const stack = [...safeData];

  //   while (stack.length) {
  //     const row = stack.pop();
  //     const rowId = getRowId(row);
  //     rows.push(row);
  //     const children = childDataMap[rowId] || [];
  //     stack.push(...children);
  //   }

  //   return rows;
  // }, [safeData, childDataMap, getRowId]);

  // const getAllTreeRowIds = useCallback(() => {
  //   return getAllTreeRows().map((row, index) => getRowId(row, index));
  // }, [getAllTreeRows, getRowId]);

  const handleCheckboxChange = useCallback(
    (rowId, rows, event) => {
      event?.stopPropagation?.();
      const isCurrentlySelected = selectedRows.includes(rowId);
      let newSelected;

      if (isCurrentlySelected) {
        const idsToRemove = new Set([rowId, ...collectDescendantIds(rowId)]);
        newSelected = selectedRows.filter((id) => !idsToRemove.has(id));
      } else {
        const descendantIds = collectDescendantIds(rowId);
        newSelected = Array.from(new Set([...selectedRows, rowId, ...descendantIds]));
      }

      setSelectedRows(newSelected);
      if (onSelect) onSelect(newSelected, rows);
    },
    [collectDescendantIds, onSelect, selectedRows]
  );

  // const handleSelectAll = useCallback(
  //   (event) => {
  //     event.stopPropagation();
  //     const isChecked = event.target.checked;
  //     if (isChecked) {
  //       const allRows = getAllTreeRows();
  //       const newSelected = getAllTreeRowIds();
  //       setSelectedRows(newSelected);
  //       onSelect?.(newSelected, allRows);
  //       onSelectAll?.(true);
  //     } else {
  //       setSelectedRows([]);
  //       onSelect?.([], []);
  //       onSelectAll?.(false);
  //     }
  //   },
  //   [getAllTreeRowIds, getAllTreeRows, onSelect, onSelectAll]
  // );
  // hàm xử lý khi click vào một hàng rediect sang màn chi tiết
  const handleRowClick = useCallback(
    (row) => (e) => {
      if (mode === "builder") return;

      const isInteractive =
        e.target.closest("button") ||
        e.target.closest("input") ||
        e.target.closest(".MuiCheckbox-root") ||
        e.target.closest(".MuiIconButton-root");

      if (isInteractive) return;

      // Tìm hành động "Xem chi tiết" (thường có icon Visibility, actionType view hoặc id tương ứng)
      const viewAction = actions.find(
        (action) =>

          action.config?.icon === "Visibility"
      );

      if (viewAction) {
        onAction(viewAction, row);
      }
    },
    [actions, mode, onAction]
  );

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);


  const handleDragStart = useCallback((e, index) => {
    setDraggedColumnIndex(index);
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch (err) {
      // ignore
    }
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e, dropIndex) => {
      e.preventDefault();
      if (draggedColumnIndex === null || draggedColumnIndex === dropIndex) {
        setDraggedColumnIndex(null);
        return;
      }
      const newColumns = [...columns];
      const [draggedItem] = newColumns.splice(draggedColumnIndex, 1);
      newColumns.splice(dropIndex, 0, draggedItem);
      setColumns(newColumns);
      dispatch(addDataFieldConfig(newColumns));
      setDraggedColumnIndex(null);
      if (allowColumnDrag) {
        try {
          const body = {
            columns: newColumns,
            module: isAuthorized === true && authorizedFunction ? authorizedFunction : fnCode,
          };
          await dispatch(upDateColumnTable(body)).unwrap();
          toast("Lưu cấu hình vị trí cột thành công", "success");
        } catch (err) {
          toast("Lưu cấu hình vị trí cột thất bại", "error");
        }
      }
    },
    [columns, dispatch, draggedColumnIndex, allowColumnDrag, toast, fnCode, authorizedFunction, isAuthorized]
  );

  const handleMouseDownResize = useCallback((e, colName) => {
    e.preventDefault();
    const el = document.getElementById(`col-border-${colName}`);
    const curWidth = el ? el.offsetWidth : 120;
    setResizingCol(colName);
    setStartX(e.clientX);
    setStartWidth(curWidth);
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
      setColumnWidths(async (currentWidths) => {
        const updatedColumns = columns.map((col) => {
          const colIdentifier = col.name || col.key;
          if (currentWidths[colIdentifier]) {
            const newWidth = parseFloat(currentWidths[colIdentifier]);
            return { ...col, width: `${newWidth}px` };
          }
          return col;
        });
        dispatch(addDataFieldConfig(updatedColumns));
        setColumns(updatedColumns);
        if (allowColumnDrag) {
          (async () => {
            try {
              const body = {
                columns: updatedColumns,
                module: isAuthorized === true && authorizedFunction ? authorizedFunction : fnCode,
              };
              await dispatch(upDateColumnTable(body)).unwrap();
              toast("Lưu cấu hình độ rộng cột thành công", "success");
            } catch (err) {
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
  }, [resizingCol, startX, startWidth, columns, dispatch, allowColumnDrag, toast, fnCode, isAuthorized, authorizedFunction]);

  const handleSettingsClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleToggleColumn = useCallback(
    (columnKey) => {
      const visibleColumnsCount = columns.filter((c) => c.isShow).length;
      const targetColumn = columns.find((c) => c.key === columnKey);
      if (visibleColumnsCount <= 1 && targetColumn?.isShow) return;
      const newColumns = columns.map((c) =>
        c.key === columnKey ? { ...c, isShow: !c.isShow } : c
      );
      setColumns(newColumns);
      dispatch(addDataFieldConfig(newColumns));
    },
    [columns, dispatch]
  );

  const handleOpenActionConfig = useCallback((e) => {
    setActionConfigAnchor(e.currentTarget);
  }, []);

  const handleOpenSettingMore = useCallback((e) => {
    setSettingMoreAnchor(e.currentTarget);
  }, []);

  const handleCloseActionConfig = useCallback(() => {
    setActionConfigAnchor(null);
  }, []);

  const handleCloseSettingMore = useCallback(() => {
    setSettingMoreAnchor(null);
  }, []);

  const handleClickStar = useCallback((row) => () => {
    handleStarClick(row);
  }, [handleStarClick]);

  // const urgencyOptions = useMemo(
  //   () => crmSource?.find((item) => item.code === "DOUUTIEN")?.data || [],
  //   [crmSource]
  // );

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
        
        if (fnCode === "cvllpb" || authorizedFunction === "cvllpb") {
          await axiosInstance.put(`${APP_BASE}/api/tasks/recurring/${id}`, {
            priority: newPriorityValue
          });
        } else {
          await axiosInstance.patch(`${APP_BASE}/api/tasks/${id}`, {
            priority: newPriorityValue
          });
        }

        toast("Cập nhật độ ưu tiên thành công!", "success");
        setReloadData?.(Date.now());
      } catch (error) {
        toast(error?.response?.data?.message || "Cập nhật độ ưu tiên thất bại!", "error");
      }
    },
    [setReloadData, toast, fnCode, authorizedFunction]
  );

  const handleActionPropChange = useCallback((id, key, value) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, config: { ...a.config, [key]: value } } : a
      )
    );
  }, []);

  const handleAddAction = useCallback(() => {
    setActions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        config: { icon: "Edit", color: "primary", url: "" },
      },
    ]);
  }, []);

  const handleRemoveAction = useCallback((id) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSort = useCallback(
    (columnName) => {
      const isCurrentColumn = orderBy === columnName;
      const newOrder = isCurrentColumn ? (order === "asc" ? "desc" : "asc") : "asc";
      const sort = { [columnName]: newOrder === "asc" ? 1 : -1 };
      const finalSort = { sort };
      onOrder?.(finalSort);
      setOrder(newOrder);
      setOrderBy(columnName);
    },
    [order, orderBy, onOrder]
  );

  const handleToggleColumnClick = useCallback(
    (columnKey) => (event) => {
      event.stopPropagation();
      handleToggleColumn(columnKey);
    },
    [handleToggleColumn]
  );

  const handleIsShowSTTChange = useCallback(
    (itemId) => (e) => {
      onPropChange(itemId, "isShowSTT", e.target.checked);
    },
    [onPropChange]
  );

  const handlePropChange = useCallback(
    (itemId, propKey) => (e) => {
      onPropChange(itemId, propKey, e.target.checked);
    },
    [onPropChange]
  );

  const handleMultiDeleteApiUrlChange = useCallback(
    (e) => {
      onPropChange(item.id, "multiDeleteApiUrl", e.target.value);
    },
    [onPropChange, item.id]
  );

  const handleShowStarFilterChange = useCallback(
    (e) => {
      onPropChange(item.id, "showStarFilterConfig", e.target.checked);
    },
    [onPropChange, item.id]
  );

  const handleSortClick = useCallback((columnName) => () => handleSort(columnName), [handleSort]);
  const handleResizeMouseDownCallback = useCallback((colName) => (e) => handleMouseDownResize(e, colName), [handleMouseDownResize]);
  const handleCheckboxChangeEvent = useCallback((rowId, safeData) => (event) => handleCheckboxChange(rowId, safeData, event), [handleCheckboxChange]);

  const handleFileIconMouseEnter = useCallback((event, files, row, key) => {
    if (filePopoverTimeoutRef.current) clearTimeout(filePopoverTimeoutRef.current);
    setFilePopoverAnchorEl(event.currentTarget);
    setCurrentFiles(files);
    setCurrentFileContext({ row, key });
  }, []);

  const handleCloseFilePopoverWithDelay = useCallback(() => {
    filePopoverTimeoutRef.current = setTimeout(() => {
      setFilePopoverAnchorEl(null);
    }, 200);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    if (filePopoverTimeoutRef.current) clearTimeout(filePopoverTimeoutRef.current);
  }, []);

  const openFilePopper = Boolean(filePopoverAnchorEl);

  const createCellClickHandler = useCallback((row, key, file) => (e) => {
    e.stopPropagation();
    onCellClick?.(row, key, file);
  }, [onCellClick]);

  const handleFileClick = useCallback(
    (file) => (e) => {
      if (currentFileContext) {
        createCellClickHandler(currentFileContext.row, currentFileContext.key, file)(e);
        setFilePopoverAnchorEl(null);
        setCurrentFiles([]);
        setCurrentFileContext(null);
      }
    },
    [currentFileContext, createCellClickHandler]
  );

  const handleMouseEnterFileIcon = useCallback((row, key) => (e) => {
    handleFileIconMouseEnter(e, row[key], row, key);
  }, [handleFileIconMouseEnter]);

  const handleMultiDeleteTitleChange = useCallback(
    (e) => {
      onPropChange(item.id, "multiDeleteTitle", e.target.value);
    },
    [onPropChange, item.id]
  );
  const handleMultiDeleteFieldsChange = useCallback(
    (e) => {
      onPropChange(item.id, "multiDeleteFields", e.target.value);
    },
    [onPropChange, item.id]
  );
  const handleToggleAllColumns = (event) => {
    event.stopPropagation?.();
    const checked = event.target.checked;
    const newColumns = columns.map((col) => ({ ...col, isShow: checked }));
    setColumns(newColumns);
    dispatch(addDataFieldConfig(newColumns));
  };

  const renderCellContent = useCallback((row, col) => {
    const { key } = col;
    const createCellClickHandlerEr = (row, key) => () => onCellClick?.(row, key);

    const content = (
      <StyledBoxs>
        {'isStar' in row && ((key === "release_no" && "release_no" in row) || (key === "files" && !("release_no" in row))) && (
          <IconButtonStyled size="small" onClick={handleClickStar(row)}>
            <img src={row.isStar ? "/Vector.png" : "/Vector1.png"} alt={row.isStar ? "starred" : "not starred"} style={{ height: "16px", width: "16px" }} />
          </IconButtonStyled>
        )}
        {key === "files" && Array.isArray(row[key]) && row[key].length > 0 && (row[key][0]?.fileName || row[key][0]?.path || row[key][0]?.fileId) ? (
          <>
            <FileIconButton size="small" onMouseEnter={handleMouseEnterFileIcon(row, key)} onMouseLeave={handleCloseFilePopoverWithDelay}>
              <StyledAttachFileIcon />
            </FileIconButton>
            {row[key].length > 1 && <FileCountTypography variant="caption">({row[key].length})</FileCountTypography>}
          </>
        ) : (
          (() => {
            const cell = row[key];
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
                return <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decoded) }} />;
              }
              return <TruncatedCell content={decoded} onClick={createCellClickHandlerEr(row, key)} />;
            }
            return <TruncatedCell content={cell} onClick={createCellClickHandlerEr(row, key)} />;
          })()
        )}
      </StyledBoxs>
    );

    if (key === "startDate" || key === "endDate") {
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
            col={col}
            content={content}
            apiUrl={apiUrl}
            setReloadData={setReloadData}
            toast={toast}
            setLoadingDate={setLoadingDate}
          />
        );
      }

      return tooltipWrapper(content);
    }

    // Wrap with Tooltip if column is progressView and row has slowReason
    if (key === "progressView" && row.slowReason) {
      return (
        <div
        // title={<div dangerouslySetInnerHTML={{ __html: row.slowReason }} />}
        // arrow
        // placement="top"
        >
          <div style={{ width: '100%' }}>{content}</div>
        </div>
      );
    }

    return content;
  }, [onCellClick, handleClickStar, handleMouseEnterFileIcon, handleCloseFilePopoverWithDelay, apiUrl, setReloadData, toast]);

  const renderRows = useCallback((rowsToRender, level = 0, parentLines = []) => {

    return rowsToRender?.map((row, index) => {
      const rowId = getRowId(row, index);
      const fetchedChildren = childDataMap[rowId] || [];
      const childNodes = fetchedChildren;

      const hasChildren = row?.flags?.hasChildren
      const isExpanded = expanded[rowId];
      const handleToggleExpand = (e) => {
        e.stopPropagation();
        toggleExpand(rowId);
      };
      const visibleColumns = columns.filter((c) => c.isShow && !c.hiddenInFlow);
      const pagination = childPaginationMap[rowId];
      const hasMore = pagination && pagination.page < pagination.totalPages;

      return (
        <React.Fragment key={rowId}>
          <StyledTableRow index={index} onClick={handleRowClick(row)}>
            {item?.props?.isShowSTT && <StyledTableCell onClick={handleStopPropagation}>{index + 1}</StyledTableCell>}

            {visibleColumns.map((col, colIndex) => {
              const cellContent = renderCellContent(row, col);
              const isSpecialColumn =
                col.label?.toLowerCase().includes("trạng thái") ||
                col.label?.toLowerCase().includes("tình trạng") ||
                col.label?.toLowerCase().includes("hành động");
              const columnAlign = isSpecialColumn ? col.margin || "center" : "left";

              if (colIndex === 0) {
                return (
                  <StyledTableCellWrap key={col.key} align={columnAlign} styleWidth={col.width || columnWidths[col.name || col.key]}>
                    <TreeTableCell $level={level}>
                      {/* Tree Toggle */}
                      {hasChildren ? (
                        <ToggleButton size="small" onClick={handleToggleExpand}>
                          {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                        </ToggleButton>
                      ) : (
                        <BoxStyed />
                      )}

                      {/* Checkbox */}
                      {!item?.props?.isShowSTT && (
                        <div onClick={handleStopPropagation} style={{ display: 'flex', alignItems: 'center' }}>
                          <StyledCheckbox
                            disabled={disabled}
                            checked={selectedRows.includes(rowId)}
                            indeterminate={
                              hasChildren && !selectedRows.includes(rowId) &&
                              childDataMap[rowId]?.length > 0 &&
                              childDataMap[rowId].some((child) => selectedRows.includes(getRowId(child))) &&
                              !childDataMap[rowId].every((child) => selectedRows.includes(getRowId(child)))
                            }
                            data-row-id={rowId}
                            onChange={handleCheckboxChangeEvent(rowId, safeData)}
                            size="small"
                          />
                        </div>
                      )}

                      {/* Flag Icon */}
                      {row.flag ? (
                        (() => {
                          let content = row.flag;
                          if (typeof content === "string") {
                            let decoded = content;
                            if (
                              decoded.includes("&lt;") ||
                              decoded.includes("&gt;") ||
                              decoded.includes("&amp;") ||
                              decoded.includes("&quot;")
                            ) {
                              decoded = decoded
                                .replace(/&lt;/g, "<")
                                .replace(/&gt;/g, ">")
                                .replace(/&quot;/g, '"')
                                .replace(/&amp;/g, "&");
                            }

                            const hasHtml = /<[^>]+>/.test(decoded);
                            if (hasHtml) {
                              return (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decoded) }} 
                                  onClick={handleFlagClick(row)}
                                  style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                                />
                              );
                            }

                            return (
                              <div 
                                onClick={handleFlagClick(row)} 
                                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                              >
                                {decoded}
                              </div>
                            );
                          }

                          return (
                            <div 
                              onClick={(e) => handleFlagClick(e, row)} 
                              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                            >
                              {String(content)}
                            </div>
                          );
                        })()
                      ) : null}

                      {/* Node Name / Content */}
                      <NodeName>{cellContent}</NodeName>
                    </TreeTableCell>
                  </StyledTableCellWrap>
                );
              }

              return (
                <StyledTableCellWrap key={col.key} align={columnAlign} styleWidth={col.width || columnWidths[col.name || col.key]}>
                  {cellContent}
                </StyledTableCellWrap>
              );
            })}

            {actions.length > 0 && (
              <StyledTableCellActionsSpecial index={index} onClick={handleStopPropagation}>
                <StyleBoxActionsBoder>
                  {isMobile ? (
                    <>
                      <MobileActionsIconButton size="small" onClick={handleOpenActionsPopoverCallback(row)}>
                        <MoreVertIcon />
                      </MobileActionsIconButton>
                      <Popover
                        open={Boolean(popoverAnchorEl) && getRowId(currentRowForPopover, 0) === getRowId(row, index)}
                        anchorEl={popoverAnchorEl}
                        onClose={handleCloseActionsPopover}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        elevation={0}
                        onBackdropClick={handleCloseActionsPopover}
                      >
                        <StyledBox stylePadding="12px" styleDisplay="flex" styleFlexDirection="column" styleGap={0.5}>
                          {actions.filter((action) => {
                            // Ẩn cấu hình: nếu hideInDropdown = true thì ẩn khỏi dropdown
                            if (action?.config?.hideInDropdown) return false;

                            // Lấy flags từ row
                            const rowFlags = row?.flags || {};

                            // Tìm icon config để lấy code
                            const iconConfig = iconOptions.find((i) => i.name === action?.config?.icon);
                            const flagCode = iconConfig?.code;

                            // Nếu icon không có code, luôn hiển thị (backward compatible)
                            if (!flagCode) {
                              return true;
                            }

                            // Nếu flag không được định nghĩa trong row, luôn hiển thị
                            if (rowFlags[flagCode] === undefined) {
                              return true;
                            }

                            // Kiểm tra flag: chỉ hiển thị khi flag = true
                            return rowFlags[flagCode] === true;
                          }).map((action) => {
                            const IconComp = iconOptions.find((i) => i.name === action.config.icon)?.icon;
                            const tooltipTitle = action.config.displayName || iconOptions.find((i) => i.name === action.config.icon)?.displayName || action.config.icon;
                            return (
                              <PopoverActionButton key={action.id} startIcon={IconComp} onClick={handlePopoverActionClick(action, row)} size="small" styleColor={action.config.color || "inherit"}>
                                {tooltipTitle}
                              </PopoverActionButton>
                            );
                          })}
                        </StyledBox>
                      </Popover>
                    </>
                  ) : (
                    (() => {
                      const allActions = actions;
                      const shouldCollapse = allActions.length > 0;
                      const visibleActions = shouldCollapse ? allActions.slice(0, 0) : allActions;
                      const hiddenActions = shouldCollapse ? allActions.slice(0) : [];
                      const hasMoreActions = hiddenActions.length > 0;

                      return (
                        <>
                          {visibleActions.map((action) => {
                            const IconComp = iconOptions.find(
                              (i) => i.name === (action.config.icon || 'Download')
                            )?.icon;
                            const tooltipTitle =
                              action.config.displayName ||
                              iconOptions.find(
                                (i) => i.name === (action.config.icon || 'Download')
                              )?.displayName ||
                              action.config.icon;
                            return (
                              <Tooltip title={tooltipTitle} key={action.id}>
                                <StyledIconButton
                                  size="small"
                                  onClick={handleActionClick(action, row)}
                                  styleColor={
                                    action.config.color || "inherit"
                                  }
                                >
                                  {IconComp}
                                </StyledIconButton>
                              </Tooltip>
                            );
                          })}
                          {hasMoreActions && (
                            <>
                              <Tooltip title="Xem thêm">
                                <StyledIconButton
                                  size="small"
                                  onClick={handleMoreActionsClick(row)}
                                  styleColor="#565D6D"
                                >
                                  <MenuIcon />
                                </StyledIconButton>
                              </Tooltip>
                              <Popover
                                open={
                                  Boolean(moreActionsAnchorEl) &&
                                  getRowId(moreActionsRow, 0) === getRowId(row, index)
                                }
                                anchorEl={moreActionsAnchorEl}
                                onClose={handleCloseMoreActions}
                                anchorOrigin={{
                                  vertical: "bottom",
                                  horizontal: "right",
                                }}
                                transformOrigin={{
                                  vertical: "top",
                                  horizontal: "right",
                                }}
                                PaperProps={{  // ← THÊM DÒNG NÀY
                                  sx: (theme) => ({
                                    backgroundColor: theme.palette.mode === "dark"
                                      ? theme.palette.background.paper
                                      : "#FFFFFF",
                                  })
                                }}  // ← ĐẾN ĐÂY
                              >
                                <StyledBox
                                  stylePadding="8px"
                                  styleDisplay="flex"
                                  styleFlexDirection="column"
                                  styleGap={0.5}
                                >
                                  {hiddenActions.filter((action) => {
                                    // Ẩn cấu hình: nếu hideInDropdown = true thì ẩn khỏi dropdown
                                    if (action?.config?.hideInDropdown) return false;

                                    // Lấy flags từ row
                                    const rowFlags = row?.flags || {};

                                    // Tìm icon config để lấy code
                                    const iconConfig = iconOptions.find((i) => i.name === action?.config?.icon);
                                    const flagCode = iconConfig?.code;

                                    // Nếu icon không có code, luôn hiển thị (backward compatible)
                                    if (!flagCode) {
                                      return true;
                                    }

                                    // Nếu flag không được định nghĩa trong row, luôn hiển thị
                                    if (rowFlags[flagCode] === undefined) {
                                      return true;
                                    }

                                    // Kiểm tra flag: chỉ hiển thị khi flag = true
                                    return rowFlags[flagCode] === true;
                                  }).map((action) => {
                                    const IconComp = iconOptions.find(
                                      (i) => i.name === (action.config.icon || 'Download')
                                    )?.icon;
                                    const tooltipTitle =
                                      action.config.displayName ||
                                      iconOptions.find(
                                        (i) => i.name === (action.config.icon || 'Download')
                                      )?.displayName ||
                                      action.config.icon;
                                    return (
                                      <StyledActionMenuItem key={action.id}>  {/* ← THÊM wrap này */}
                                        <PopoverActionButton
                                          startIcon={IconComp}
                                          onClick={handleMoreActionItemClick(action, row)}
                                          size="small"
                                          styleColor={action.config.color || "inherit"}
                                        >
                                          {tooltipTitle}
                                        </PopoverActionButton>
                                      </StyledActionMenuItem>
                                    );
                                  })}
                                </StyledBox>
                              </Popover>
                            </>
                          )}
                        </>
                      );
                    })()
                  )}
                </StyleBoxActionsBoder>
              </StyledTableCellActionsSpecial>
            )}
          </StyledTableRow>
          {isExpanded && (
            <>
              {renderRows(childNodes, level + 1, [...parentLines, true])}
              {loadingChildren[rowId] && (
                <StyledTableRow>
                  <StyleSkyTableCell colSpan={visibleColumns.length + (item?.props?.isShowSTT ? 1 : 0) + (actions.length > 0 ? 1 : 0)}>
                    <TreeLoadingBox level={level + 1}>
                      <CircularProgress size="30px" aria-label="Loading…" />
                    </TreeLoadingBox>
                  </StyleSkyTableCell>
                </StyledTableRow>
              )}
              {hasMore && !loadingChildren[rowId] && (
                <LoadMoreRow
                  onVisible={handleLoadMore}
                  parentId={rowId}
                  level={level + 1}
                  colSpan={visibleColumns.length + (item?.props?.isShowSTT ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  loading={loadingChildren[rowId]}
                />
              )}
            </>
          )}
        </React.Fragment>
      );
    });
  }, [
    safeData,
    columns,
    getRowId,
    disabled,
    selectedRows,
    handleCheckboxChangeEvent,
    item?.props?.isShowSTT,
    expanded,
    toggleExpand,
    columnWidths,
    actions,
    isMobile,
    handleActionClick,
    handleMoreActionsClick,
    handleMoreActionItemClick,
    handleOpenActionsPopoverCallback,
    handlePopoverActionClick,
    moreActionsAnchorEl,
    moreActionsRow,
    popoverAnchorEl,
    currentRowForPopover,
    handleCloseActionsPopover,
    handleCloseMoreActions,
    renderCellContent,
    childDataMap,
    childPaginationMap,
    loadingChildren,
    handleLoadMore,
    handleRowClick,
    handleStopPropagation,
  ]);

  return (
    <StyledBoxTableBoder>
      {mode === "builder" && (
        <StyledBoxBoder>
          <Tooltip title="Cấu hình cột">
            <BuilderIconButton onClick={handleSettingsClick}>
              <ViewColumnIcon />
            </BuilderIconButton>
          </Tooltip>
          <Tooltip title="Cấu hình hành động">
            <BuilderIconButton onClick={handleOpenActionConfig} disabled={disabled}>
              <SettingsIcon />
            </BuilderIconButton>
          </Tooltip>
          <Tooltip title="Cấu hình thêm">
            <BuilderIconButton onClick={handleOpenSettingMore} disabled={disabled}>
              <AutoAwesomeIcon />
            </BuilderIconButton>
          </Tooltip>
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleSettingsClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            onBackdropClick={handleSettingsClose}
            PaperProps={{ sx: { borderRadius: 2, boxShadow: 3, minWidth: 340, p: 0 } }}
          >
            <StyleBoxCH>
              <StyleBoxDropDown>
                <StyleTyprographyDropDown variant="subtitle1">Cấu hình bảng</StyleTyprographyDropDown>
                <StyleIconDropDown />
              </StyleBoxDropDown>
              <StyleBoxDrop>
                <StyleFomControl
                  control={
                    <Checkbox
                      checked={columns.filter(c => !c.hiddenInFlow).every((c) => c.isShow)}
                      indeterminate={columns.filter(c => !c.hiddenInFlow).some((c) => c.isShow) && !columns.filter(c => !c.hiddenInFlow).every((c) => c.isShow)}
                      onChange={handleToggleAllColumns}
                      size="small"
                    />
                  }
                  label="Tất cả"
                />
              </StyleBoxDrop>
              <StyleBoxDrown>
                {columns
                  .filter(c => !c.hiddenInFlow)
                  .map((colConfig) => (
                    <StyleFomControl
                      key={colConfig.key}
                      control={
                        <Checkbox
                          checked={colConfig.isShow}
                          onChange={handleToggleColumnClick(colConfig.key)}
                          size="small"
                        />
                      }
                      label={colConfig.label}
                    />
                  ))}
              </StyleBoxDrown>
              <StyleBoxButton>
                <StyleButtonH variant="text" size="small" onClick={handleSettingsClose}>Hủy</StyleButtonH>
                <StyleButtonAD variant="contained" size="small" onClick={handleSettingsClose}>Áp dụng</StyleButtonAD>
              </StyleBoxButton>
            </StyleBoxCH>
          </Popover>
          <Popover
            open={Boolean(actionConfigAnchor)}
            anchorEl={actionConfigAnchor}
            onClose={handleCloseActionConfig}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            onBackdropClick={handleCloseActionConfig}
          >
            <StyledBoxBoderBox p={2}>
              <Typography variant="h6" mb={1}>Cấu hình hành động</Typography>
              {actions.map((action) => (
                <ActionConfigItem key={action.id} action={action} onChange={handleActionPropChange} onRemove={handleRemoveAction} selectOptions={selectOptions} featureType={featureType} />
              ))}
              <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddAction} fullWidth>Thêm hành động</Button>
            </StyledBoxBoderBox>
          </Popover>
          <Popover
            open={Boolean(settingMoreAnchor)}
            anchorEl={settingMoreAnchor}
            onClose={handleCloseSettingMore}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            onBackdropClick={handleCloseSettingMore}
          >
            <StyledBoxBoderBox p={2}>
              <Typography variant="h6" mb={1}>Cấu hình thêm</Typography>
              <FormControlLabel control={<StyledCheckboxTable checked={item?.props?.isShowSTT} onChange={handleIsShowSTTChange(item.id)} />} label="Hiện STT" />
              <FormControlLabel control={<StyledCheckboxTable checked={item?.props?.multiDelete} onChange={handlePropChange(item.id, "multiDelete")} />} label="Hiện nút xóa nhiều" />
              {item?.props?.multiDelete && (
                <>
                  {/* <Typography variant="subtitle2" mt={1}>
                    URL API Xóa nhiều
                  </Typography> */}
                  <DebounceTextField
                    fullWidth
                    size="small"
                    label="Nhập URL API xóa nhiều"
                    value={item?.props?.multiDeleteApiUrl || ""}
                    onChange={handleMultiDeleteApiUrlChange}
                  />
                  <Typography variant="subtitle2" mt={1}>
                    Tiêu đề xóa nhiều
                  </Typography>
                  <DebounceTextField
                    fullWidth
                    size="small"
                    label="Nhập tiêu đề xóa nhiều"
                    value={item?.props?.multiDeleteTitle || ""}
                    onChange={handleMultiDeleteTitleChange}
                  />
                  <Typography variant="subtitle2" mt={1}>
                    Chọn trường hiển thị dữ liệu
                  </Typography>
                  <StyledFormControlTable fullWidth size="small">
                    <Select
                      multiple
                      displayEmpty
                      value={item?.props?.multiDeleteFields || []}
                      onChange={handleMultiDeleteFieldsChange}
                      renderValue={(selected) => {
                        if (selected.length === 0) return <em>Chọn trường</em>;
                        return columns
                          .filter((c) => selected.includes(c.key))
                          .map((c) => c.label)
                          .join(", ");
                      }}
                    >
                      {columns
                        .filter((col) => col.isShow && !col.hiddenInFlow)
                        .map((col) => (
                          <MenuItem key={col.key} value={col.key}>
                            {col.label}
                          </MenuItem>
                        ))}
                    </Select>
                  </StyledFormControlTable>
                </>
              )}
              <FormControlLabel control={<StyledCheckboxTable checked={item?.props?.hasTabs} onChange={handlePropChange(item.id, "hasTabs")} />} label="Hiện thị các tab ở trong chi tiết" />
              <FormControlLabel control={<StyledCheckboxTable checked={item?.props?.showStarFilterConfig || false} onChange={handleShowStarFilterChange} />} label="Bộ lọc bản ghi quan trọng" />
            </StyledBoxBoderBox>
          </Popover>
        </StyledBoxBoder>
      )}

      <StyledTableContainer styledDynamicMaxHeight={hasField}>
        <StyledTableBorder>
          <StyledTableHead>
            <StyledTableRow>
              {item?.props?.isShowSTT && <StyledTableCell isBold styleWidthCell={70}>STT</StyledTableCell>}
              {columns
                .filter((c) => c.isShow && !c.hiddenInFlow)
                .map((col, index) => {
                  const headerAlign =
                    col.label?.toLowerCase().includes("trạng thái") ||
                      col.label?.toLowerCase().includes("tình trạng") ||
                      col.label?.toLowerCase().includes("hành động")
                      ? col.margin || "center"
                      : "left";

                  return (
                    <StyledTableHeaderCell
                      key={col.label}
                      onClick={handleSortClick(col.name)}
                      id={`col-border-${col.name || col.key}`}
                      align={headerAlign}
                      isBold
                      draggable={mode === "builder" || allowColumnDrag}
                      styleWidth={
                        columnWidths[col.name || col.key]
                          ? `${columnWidths[col.name || col.key]}px`
                          : col.width
                      }
                      styleMinWidth={
                        columnWidths[col.name || col.key]
                          ? `${columnWidths[col.name || col.key]}px`
                          : col.width
                      }
                      styleMaxWidth={
                        columnWidths[col.name || col.key]
                          ? `${columnWidths[col.name || col.key]}px`
                          : col.width
                      }
                      {...((mode === "builder" || allowColumnDrag) && {
                        onDragStart: (e) => handleDragStart(e, index),
                        onDragOver: handleDragOver,
                        onDrop: (e) => handleDrop(e, index),
                      })}
                    >
                      <HeaderCellContainer align={headerAlign}>
                        {index === 0 && !item?.props?.isShowSTT && (
                          <div style={{ marginRight: '8px', display: 'flex', alignItems: 'center', visibility: 'hidden' }}>
                            <BoxStyed />
                            <StyledCheckbox size="small" />
                          </div>
                        )}
                        {col.label}
                        <SortIconContainer>
                          <StyledArrowUp
                            isActive={orderBy === col.name && order === "asc"}
                          />
                          <StyledArrowDown
                            isActive={orderBy === col.name && order === "desc"}
                          />
                        </SortIconContainer>
                      </HeaderCellContainer>
                      {(mode === "builder" || allowColumnDrag) && (
                        <StyledBoxBoderBuilder
                          onMouseDown={handleResizeMouseDownCallback(
                            col.name || col.key
                          )}
                        />
                      )}
                    </StyledTableHeaderCell>
                  );
                })}
              {actions.length > 0 && <StyledTableCellActions isBold styleWidthCell={150} alignCenter>Hành động</StyledTableCellActions>}
            </StyledTableRow>
          </StyledTableHead>

          <TableBody>
            {loading && safeData?.length === 0 ? (
              Array.from(new Array(9)).map((_, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <StyledTableRow key={`skeleton-row-${index}`}>
                  {item?.props?.isShowSTT && (
                    <StyledTableCell>
                      <SkeletonW20 variant="text" />
                    </StyledTableCell>
                  )}

                  {columns
                    .filter((c) => c.isShow && !c.hiddenInFlow)
                    .map(({ key, width, name, label }, colIndex) => {
                      const isSpecialColumn =
                        label?.toLowerCase().includes("trạng thái") ||
                        label?.toLowerCase().includes("tình trạng") ||
                        label?.toLowerCase().includes("hành động");
                      const columnAlign = isSpecialColumn ? "center" : "left";

                      return (
                        // eslint-disable-next-line react/no-array-index-key
                        <StyledTableCellWrap
                          key={`skeleton-cell-${key}-${colIndex}`}
                          align={columnAlign}
                          styleWidth={width || columnWidths[name || key]}
                        >
                          {colIndex === 0 ? (
                            <TreeTableCell $level={0}>
                              <BoxStyed />
                              {!item?.props?.isShowSTT && <SkeletonWH variant="circular" />}
                              <BoxStyed />
                              <SkeletonW80 variant="text" />
                            </TreeTableCell>
                          ) : (
                            <SkeletonW80 variant="text" />
                          )}
                        </StyledTableCellWrap>
                      );
                    })}

                  {/* Skeleton cho actions */}
                  {actions.length > 0 && (
                    <StyledTableCellActionsSpecial>
                      <SkeletonW80 variant="text" />
                    </StyledTableCellActionsSpecial>
                  )}
                </StyledTableRow>
              ))
            ) : safeData?.length > 0 ? (
              <>
                {renderRows(safeData.filter((row) => {
                  const pId = row.parent?.id || row.parent || row.parentId;
                  if (!pId) return true;

                  // Kiểm tra xem ID của cha có tồn tại trong danh sách hiện tại hay không
                  const parentExists = safeData.some(item => {
                    const itemId = item.id || item._id;
                    return String(itemId) === String(pId);
                  });

                  return !parentExists;
                }))}
              </>
            ) : (
              <StyledTableRow>
                <StyledTableCell
                  styleTextAlign
                  colSpan={
                    columns.filter((c) => c.isShow && !c.hiddenInFlow).length +
                    (item?.props?.isShowSTT ? 1 : 0) +
                    (item?.props?.multiDelete ? 1 : 0) +
                    (actions.length > 0 ? 1 : 0)
                  }
                  align="center"
                >
                  Không có dữ liệu
                </StyledTableCell>
              </StyledTableRow>
            )}
          </TableBody>
        </StyledTableBorder>
        <PopperStyled open={openFilePopper} anchorEl={filePopoverAnchorEl} placement="bottom-start" modifiers={[{ name: "flip", enabled: true, options: { fallbackPlacements: ["top-start", "right-start"] } }, { name: "preventOverflow", enabled: true, options: { boundary: "viewport" } }]}>
          <FilePopoverContainer onMouseEnter={handlePopoverMouseEnter} onMouseLeave={handleCloseFilePopoverWithDelay}>
            {currentFiles.map((file, fileIndex) => (
              <MenuItem key={file.fileId || fileIndex} onClick={handleFileClick(file)}>
                <Typography variant="body2">{file.fileName}</Typography>
              </MenuItem>
            ))}
          </FilePopoverContainer>
        </PopperStyled>
      </StyledTableContainer>
      <LoadingDialog open={loading || loadingDate}>
        <StyledDialogContent>
          {"Đang cập nhật danh sách, vui lòng chờ trong giây lát..."}
        </StyledDialogContent>
      </LoadingDialog>
    </StyledBoxTableBoder>
  );
};

CustomTableBorderTree.propTypes = {
  formatId: PropTypes.string,
  type: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  color: PropTypes.string,
  showIndexColumn: PropTypes.bool,
  showCheckboxColumn: PropTypes.bool,
  onSelect: PropTypes.func,
  defaultValues: PropTypes.array,
  disabled: PropTypes.bool,
  isDisablePage: PropTypes.bool,
  pagination: PropTypes.shape({
    total: PropTypes.number,
    page: PropTypes.number,
    rowsPerPage: PropTypes.number,
    totalPages: PropTypes.number,
  }),
  onPage: PropTypes.func,
  onSelectAll: PropTypes.func,
  selectAll: PropTypes.bool,
  dataColumn: PropTypes.array,
  mode: PropTypes.string,
  item: PropTypes.object,
  onPropChange: PropTypes.func,
  processId: PropTypes.string,
  onAction: PropTypes.func,
  onOrder: PropTypes.func,
  funcDataForm: PropTypes.array,
  onAdvancedSearch: PropTypes.func,
  isMobile: PropTypes.bool,
  onCellClick: PropTypes.func,
  allowColumnDrag: PropTypes.bool,
  reload: PropTypes.any,
  setReloadData: PropTypes.func,
  isAuthorized: PropTypes.bool,
  authorizedFunction: PropTypes.string,
  fnCode: PropTypes.string,
  loading: PropTypes.bool,
  apiUrl: PropTypes.string,
  apiUrlChildren: PropTypes.string,
  paramsChild: PropTypes.object,
};

export default CustomTableBorderTree;