import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import PropTypes from "prop-types";
import {
  StyledTableContainer,
  StyledTableRow,
  StyledCheckbox,
  StyledTableCellActions,
  HeaderCellContainer,
  SortIconContainer,
  StyledArrowUp,
  StyledTable as StyledTableBorder, // ✅ Đổi tên để khớp với cách dùng
  StyleBoxActionsBoder,
  StyledTableCellActionsSpecial,
  StyledTableCellWrap,
  StyledArrowDown, //
  StyledBox, //
  StyledBoxBoder, //
  StyledBoxBoderBox, //
  StyledBoxBoderBuilder, //
  StyledBoxContainer, //
  StyledBoxTable, //
  StyledBoxTableBoder, //
  // StyledButtonTable,
  StyledCheckboxTable, //
  StyledFormControlTable, //
  StyledIconButton, //
  StyledTableHead, //
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
  // StyledBoxss,
  StyledActionMenuItem,
  SkeletonWH,
  SkeletonW20,
  SkeletonW80,
  // StyledFilePopover,
  // FilePopper,
} from "@styles/customTableBorder.style"; // ✅ CHỈ IMPORT TỪ FILE NÀY
import {
  StyledTableHeaderCell,
  StyledTableCell,
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
  // FormControl,
  InputLabel,
  Popper,
  Checkbox,
  CircularProgress,
  Skeleton,
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
  APP_BASE,
} from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import AddIcon from "@mui/icons-material/Add";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import PlaylistAddCheckCircleRoundedIcon from '@mui/icons-material/PlaylistAddCheckCircleRounded';
import MoreVertIcon from "@mui/icons-material/MoreVert";
import './CustomCss.css';
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DebounceTextField from "@components/DynamicForm/DebouncedTextField";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import { globalComponentRegistry } from "../../builder-table/components/componentRegistry";
import { upDateColumnTable } from "@redux/slices/CustomTable/CustomTableSlice";
import DraftsIcon from '@mui/icons-material/Drafts';
import ReplyIcon from '@mui/icons-material/Reply';
import PostAddRoundedIcon from '@mui/icons-material/PostAddRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { manualActions } from "../../builder-table/components/actionRegistry";
import DOMPurify from "dompurify";
// import { encodeHTML } from "@/utils/securityUtils";

const logger = console;
// Options will be lazily evaluated

const iconOptions = [
  { name: "Add", icon: <AddOutlinedIcon />, displayName: "Thêm mới" },
  { name: "Edit", icon: <EditOutlinedIcon />, displayName: "Cập nhật" },
  { name: "Delete", icon: <DeleteOutlinedIcon />, displayName: "Xóa" },
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
    // code: ['canRecallMeeting ']
  },
  { name: "Draft", icon: <DraftsIcon />, displayName: "Tạo dự thảo", code: 'canTaoDuThao' },
  { name: "Reply", icon: <ReplyIcon />, displayName: "Từ chối", code: 'canReject' },
  { name: "RelatedWorkProfile", icon: <PostAddRoundedIcon />, displayName: "Hồ sơ công việc liên quan" },
  { name: "ExtendProcessingTime", icon: <EventRepeatRoundedIcon />, displayName: "Đặt hạn xử lý" },
  { name: "Submit", icon: <FactCheckOutlinedIcon />, displayName: "Trình duyệt", code: 'canSubmitNews' },
  { name: "Published", icon: <PublicOutlinedIcon />, displayName: "Xuất bản", codes: ['canPublishDirectly', 'canPublished'] },

  { name: "Cancel", icon: <HighlightOffIcon />, displayName: "Hủy lịch",},
  { name: "ApprovePassport", icon: <PlaylistAddCheckCircleRoundedIcon />, displayName: "Phê duyệt yc mượn hộ chiếu", code: 'canApprovePassport' },
  { name: "RefusePassportDV", icon: <HighlightOffIcon />, displayName: "Từ chối yc mượn hộ chiếu (chdv)", code: 'canRefusePassportDV' },
  { name: "TransferPassport", icon: <PlaylistAddCheckCircleRoundedIcon />, displayName: "Chuyển xử lý yc mượn hộ chiếu", code: 'canTransferPassport' },
  { name: "RefusePassportVP", icon: <HighlightOffIcon />, displayName: "Từ chối yc mượn hộ chiếu (chvp)", code: 'canRefusePassportVP' },
  { name: "ReceptionPassport", icon: <PlaylistAddCheckCircleRoundedIcon />, displayName: "Tiếp nhận yc mượn hộ chiếu", code: 'canReceptionPassport' },
  { name: "RefusePassportBPCT", icon: <HighlightOffIcon />, displayName: "Từ chối yc mượn hộ chiếu (bpct)", code: 'canRefusePassportBPCT' },
  { name: "Transfer", icon: <SwapHorizOutlinedIcon />, displayName: "Chuyển xử lý" },
  { name: "Reject", icon: <CancelOutlinedIcon />, displayName: "Từ chối" },
  { name: "Coordinate", icon: <AssignmentIndOutlinedIcon />, displayName: "Điều phối" },
  { name: "Warning", icon: <WarningAmberOutlinedIcon />, displayName: "Cảnh báo" },
  { name: "SubmitRecordExploitation", icon: <FactCheckOutlinedIcon />, displayName: "Trình phê duyệt" },
];

// const colorOptions = [
//   "primary",
//   "secondary",
//   "success",
//   "error",
//   "warning",
//   "info",
// ];

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

const IconStyled = styled(IconButton)(() => ({
  padding: 0,
  marginRight: "4px",
  "&:hover": {
    backgroundColor: "transparent",
  },
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

const FileLoadingSpinner = styled(CircularProgress)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  color: theme.palette.text.secondary,
}));

const TypographyStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== "rowcolor",
})(({ rowcolor }) => ({
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  whiteSpace: "normal",
  marginLeft: "5px",
  color: rowcolor || "inherit",
}));

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
  ({ action, onChange, onRemove, selectOptions, columns }) => {
    // const handleCheckboxChangeExport = useCallback(
    //   (event) => {
    //     onChange(action.id, "isExport", event.target.checked);
    //   },
    //   [action.id, onChange]
    // );

    const handleDeleteApiUrlChange = useCallback(
      (e) => {
        onChange(action.id, "deleteApiUrl", e.target.value);
      },
      [action.id, onChange]
    );

    const handleDeleteTitleChange = useCallback(
      (e) => {
        onChange(action.id, "deleteTitle", e.target.value);
      },
      [action.id, onChange]
    );

    const handleDeleteFieldsChange = useCallback(
      (e) => {
        onChange(action.id, "deleteFields", e.target.value);
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

    // const handleSelectColor = useCallback(
    //   (e) => {
    //     const selectedColor = e.currentTarget.dataset.color;
    //     onChange(action.id, "color", selectedColor);
    //   },
    //   [action.id, onChange]
    // );

    const handleSelectActionType = useCallback(
      (e) => {
        onChange(action.id, "actionType", e.target.value);
      },
      [onChange, action.id]
    );

    const handleDisplayTypeChange = useCallback(
      (e) => {
        const newDisplayType = e.target.value;
        onChange(action.id, "displayType", newDisplayType);
        // Reset componentKey và popupName khi thay đổi displayType
        // để tránh trường hợp component được chọn không phù hợp với displayType mới
        onChange(action.id, "componentKey", "");
        onChange(action.id, "popupName", "");
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

    // FIX: Bổ sung handler cho checkbox "Ẩn cấu hình" (đồng bộ với CustomTableBorderTree.js)
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
							<Tooltip title={opt.displayName}>
              	{opt.icon}
							</Tooltip>
            </StyledIconButtonBorder>
          ))}
        </StyledBoxTable>

        {/* <Typography variant="subtitle2">Chọn màu</Typography>
        <StyledBoxTable mb={1}>
          {colorOptions.map((color) => (
            <StyledButtonTable
              key={color}
              // color={color}
              styleColor={color}
              variant="contained"
              onClick={handleSelectColor}
            />
          ))}
        </StyledBoxTable> */}

        <Typography variant="subtitle2" mt={1}>
          Loại hành động
        </Typography>
        <Select
          fullWidth
          size="small"
          value={action.config.actionType || ""}
          onChange={handleSelectActionType}
        >
          <MenuItem value="update">Cập nhật</MenuItem>
          <MenuItem value="view">Chỉ xem</MenuItem>
          <MenuItem value="delete">Xóa</MenuItem>
          <MenuItem value="export">Xuất biểu mẫu</MenuItem>
          <MenuItem value="draft">Dự thảo</MenuItem>
          <MenuItem value="relatedWorkProfile">Hồ sơ công việc liên quan</MenuItem>
          <MenuItem value="extendProcessingTime">Đặt hạn xử lý</MenuItem>
          <MenuItem value="approveRequest">Phê duyệt y/c mượn hộ chiếu (CHDV)</MenuItem>
          <MenuItem value="rejectRequest">Từ chối y/c mượn hộ chiếu (CHDV)</MenuItem>
          <MenuItem value="transferProcessing">Chuyển xử lý y/c mượn hộ chiếu (CHVP)</MenuItem>
          <MenuItem value="rejectOfficeCommanderRequest">Từ chối y/c mượn hộ chiếu (CHVP)</MenuItem>
          <MenuItem value="receiveRequest">Tiếp nhận y/c mượn hộ chiếu (BPCT)</MenuItem>
          <MenuItem value="rejectSpecialDeptReq">Từ chối y/c mượn hộ chiếu (BPCT)</MenuItem>
          <MenuItem value="submitRecordExploitation">Trình phê duyệt yêu cầu khai thác hồ sơ</MenuItem>
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
            <Typography variant="subtitle2" mt={1}>
              Tiêu đề xóa
            </Typography>
            <DebounceTextField
              fullWidth
              size="small"
              label="Nhập tiêu đề xóa"
              value={action.config.deleteTitle || ""}
              onChange={handleDeleteTitleChange}
            />
            <Typography variant="subtitle2" mt={1}>
              Chọn trường hiển thị dữ liệu
            </Typography>
            <StyledFormControlTable fullWidth size="small">
              <Select
                multiple
                displayEmpty
                value={action.config.deleteFields || []}
                onChange={handleDeleteFieldsChange}
                renderValue={(selected) => {
                  if (selected.length === 0) return <em>Chọn trường</em>;
                  return columns
                    .filter((c) => selected.includes(c.key))
                    .map((c) => c.label)
                    .join(", ");
                }}
              >
                {columns
                  .filter((col) => col.isShow)
                  .map((col) => (
                    <MenuItem key={col.key} value={col.key}>
                      {col.label}
                    </MenuItem>
                  ))}
              </Select>
            </StyledFormControlTable>
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
                  displayType={action.config.displayType}
                  // onChange={(key, value) => onChange(action.id, key, value)}
                  onChange={handleComponentSelectorChange}
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
                    // onChange={(e) => {
                    // 	onChange(action.id, "size", e.target.value);
                    // }}
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

        {/* FIX: Bổ sung checkbox "Ẩn cấu hình" (đồng bộ với CustomTableBorderTree.js) */}
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
  columns: PropTypes.array,
  featureType: PropTypes.string.isRequired,
};

const CustomTableBorder = ({
  type,
  data = [],
  // color = "primary",
  onSelect,
  onSelectAll,
  selectAll,
  defaultValues = [],
  disabled = false,
  formatId = "id",
  dataColumn,
  mode = "runtime",
  item,
  onPropChange,
  onAction = () => { },
  funcDataForm,
  overrideConfigs,
  onOrder,
  isMobile,
  // onAdvancedSearch,
  onCellClick,
  reload,
  allowColumnDrag = false,
  isAuthorized,
  authorizedFunction,
  fnCode,
  loading,
  uiVariant,
  setReloadData,
}) => {
  const { dataUser } = useSelector((state) => state.auth);
  const userData = useMemo(() => dataUser || {}, [dataUser]);

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
      dataFields?.filter(
        (field) =>
          field.filter === true &&
          (field.type === "date" ||
            field.type === "enum" ||
            field.type === "autocomplete")
      ).length >= 3,
    [dataFields]
  );

  const [starOverrides, setStarOverrides] = useState({});

  const safeData = useMemo(() => {
    const sourceData = data || [];
    const overrideKeys = Object.keys(starOverrides);

    if (overrideKeys.length === 0) {
      return sourceData;
    }

    return sourceData.map((row) => {
      const documentId = row?.documentId;
      if (!documentId) return row;

      const overrideKey = String(documentId);
      if (!(overrideKey in starOverrides)) return row;

      const nextIsStar = starOverrides[overrideKey];
      if (row.isStar !== undefined) {
        return { ...row, isStar: nextIsStar };
      }

      if (row.flagsProcess?.isStar !== undefined) {
        return {
          ...row,
          flagsProcess: { ...row.flagsProcess, isStar: nextIsStar },
        };
      }

      return { ...row, isStar: nextIsStar };
    });
  }, [data, starOverrides]);

  const dispatch = useDispatch();

  const [columns, setColumns] = useState([]);

  const [selectedRows, setSelectedRows] = useState(defaultValues || []);

  const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  // State cho popover hành động trên mobile
  const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
  const [currentRowForPopover, setCurrentRowForPopover] = useState(null);
  // State cho popover danh sách file
  const [filePopoverAnchorEl, setFilePopoverAnchorEl] = useState(null);
  // ✅ Sử dụng useRef để quản lý timeout, tránh re-render không cần thiết
  const filePopoverTimeoutRef = useRef(null);

  const [currentFiles, setCurrentFiles] = useState([]);
  const [currentFileContext, setCurrentFileContext] = useState(null);

  const [loadingFileIndex, setLoadingFileIndex] = useState(null);

  // ✅ Hàm xử lý khi click vào ngôi sao
  const handleStarClick = useCallback(
    async (row) => {
      if (!row.documentId) {
        toast("Không tìm thấy ID của văn bản.", "error");
        return;
      }

      try {
        const userId = userData?._id || userData?.id || userData?.user?._id || userData?.user?.id;
        const params = isAuthorized === true ? { isAuthorized: true } : undefined;
        if (!userId) {
          toast("Không tìm thấy thông tin người dùng.", "error");
          return;
        }

        const moduleCode =
          isAuthorized === true && authorizedFunction
            ? authorizedFunction
            : fnCode;

        const payload = {
          documentIds: [row.documentId],
          starObj: {
            [moduleCode]: [userId],
          },
          isStar: !(row.isStar ?? row.flagsProcess?.isStar),
        };

        const documentKey = String(row.documentId);
        const previousIsStar = row.isStar ?? row.flagsProcess?.isStar;
        const nextIsStar = !previousIsStar;

        // Optimistic update: đổi trạng thái sao ngay trên UI, không cần reload danh sách
        setStarOverrides((prev) => ({
          ...prev,
          [documentKey]: nextIsStar,
        }));

        await api.post(API_STAR_CHANGE, payload, { params });
        toast("Cập nhật trạng thái thành công!", "success");
      } catch (error) {
        const documentKey = String(row.documentId);
        const previousIsStar = row.isStar ?? row.flagsProcess?.isStar;
        setStarOverrides((prev) => {
          const next = { ...prev };
          if (previousIsStar === undefined) {
            delete next[documentKey];
          } else {
            next[documentKey] = previousIsStar;
          }
          return next;
        });

        toast(
          error.response?.data?.message || "Cập nhật trạng thái thất bại!",
          "error"
        );
      }
    },
    [toast, fnCode, isAuthorized, authorizedFunction, userData]
  );

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
        await axiosInstance.patch(`${APP_BASE}/api/project/${id}`, {
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

  const handleOpenActionsPopover = (event, row) => {
    setPopoverAnchorEl(event.currentTarget);
    setCurrentRowForPopover(row);
  };

  const handleCloseActionsPopover = () => {
    setPopoverAnchorEl(null);
    setCurrentRowForPopover(null);
  };

  // State cho popover "Xem thêm" trên desktop khi có > 3 actions
  const [moreActionsAnchorEl, setMoreActionsAnchorEl] = useState(null);
  const [moreActionsRow, setMoreActionsRow] = useState(null);

  const handleOpenMoreActions = useCallback((event, row) => {
    setMoreActionsAnchorEl(event.currentTarget);
    setMoreActionsRow(row);
  }, []);

  const handleCloseMoreActions = useCallback(() => {
    setMoreActionsAnchorEl(null);
    setMoreActionsRow(null);
  }, []);

  const handleMoreActionsClick = useCallback(
    (row) => (event) => {
      handleOpenMoreActions(event, row);
    },
    [handleOpenMoreActions]
  );

  const handleMoreActionItemClick = useCallback(
    (action, row) => () => {
      if (action.onClick) {
        action.onClick(row);
      } else {
        handleActionClick(action, row)();
      }
      handleCloseMoreActions();
    },
    [handleActionClick, handleCloseMoreActions]
  );

  // ✅ Tối ưu hóa: Tạo callback ổn định cho event handler
  const handleOpenActionsPopoverCallback = useCallback(
    (row) => (event) => {
      handleOpenActionsPopover(event, row);
    },
    []
  ); // Dependencies rỗng vì handleOpenActionsPopover đã ổn định

  // ✅ Tối ưu hóa: Tạo callback ổn định cho các action trong popover
  const handlePopoverActionClick = useCallback(
    (action, row) => () => {
      handleActionClick(action, row)();
      handleCloseActionsPopover(); // Đóng popover
    },
    [handleActionClick]
  ); // Dependency là handleActionClick

  const [settingMoreAnchor, setSettingMoreAnchor] = useState(null);
  const [actionConfigAnchor, setActionConfigAnchor] = useState(null);

  const [actions, setActions] = useState(item?.props?.configs || []);

  const featureType = item?.props?.featureType;

  const getInitialSort = () => {
    return { initialOrderBy: null, initialOrder: "asc" };
  };

  const { initialOrderBy, initialOrder } = getInitialSort();
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

  // const pickColor = { primary: "#0D66D0" };

  const allPossibleColumns = useMemo(() => {
    if (dataColumn?.length) {
      return dataColumn.map(({ name, isShow, showInList, ...rest }) => ({
        ...rest,
        key: name,
        name,
        isShow:
          showInList === true || showInList === false
            ? showInList
            : isShow ?? true,
      }));
    }
    return (configTable[type] || []).map((c) => ({ ...c, isShow: true }));
  }, [type, dataColumn]);

  useEffect(() => {
    if (reload !== null) {
      setSelectedRows([]);
    }
  }, [reload]);

  useEffect(() => {
    setSelectedRows([]);
    if (onSelect) {
      onSelect([], []);
    }
    if (onSelectAll) {
      onSelectAll(false);
    }
  }, [data, onSelect, onSelectAll]);

  useEffect(() => {
    if (overrideConfigs && overrideConfigs.length > 0) {
      setActions(overrideConfigs);
    } else {
      setActions(item?.props?.configs || []);
    }
  }, [item?.props?.configs, overrideConfigs]);

  useEffect(() => {
    // ✅ Chỉ set cột từ prop một lần khi component được tạo hoặc dataColumn thay đổi
    // Điều này ngăn việc reset cột khi re-render không cần thiết
    if (allPossibleColumns.length > 0) {
      setColumns(allPossibleColumns);
      dispatch(addDataFieldConfig(allPossibleColumns));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, dataColumn, dispatch]); // Chỉ chạy lại khi các prop này thực sự thay đổi

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

  useEffect(() => {
    // Khi data mới từ server đã đồng bộ trạng thái sao, xoá override cục bộ
    setStarOverrides((prev) => {
      const prevKeys = Object.keys(prev);
      if (prevKeys.length === 0) return prev;

      const sourceMap = new Map(
        (data || [])
          .filter((row) => row?.documentId !== undefined && row?.documentId !== null)
          .map((row) => [String(row.documentId), row])
      );

      let changed = false;
      const next = { ...prev };

      prevKeys.forEach((documentKey) => {
        const sourceRow = sourceMap.get(documentKey);
        if (!sourceRow) {
          delete next[documentKey];
          changed = true;
          return;
        }

        const sourceIsStar = sourceRow.isStar ?? sourceRow.flagsProcess?.isStar;
        if (sourceIsStar === prev[documentKey]) {
          delete next[documentKey];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [data]);

  const handleCheckboxChange = useCallback(
    (rowId, rows) => {
      const newSelected = selectedRows.includes(rowId)
        ? selectedRows.filter((id) => id !== rowId)
        : [...selectedRows, rowId];
      setSelectedRows(newSelected);
      // if (onSelect && item?.props?.multiDelete) onSelect(newSelected);
      if (onSelect) onSelect(newSelected, rows);
    },
    [selectedRows, onSelect]
  );

  // Hàm chuẩn hoá lấy rowId — dùng chung cho header (select all) và từng hàng
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

  const handleSelectAll = useCallback(
    (event) => {
      const isChecked = event.target.checked;

      if (isChecked) {
        const newSelected = safeData.map(
          (item, index) =>
            item[formatId] ||
            item._id ||
            item.id ||
            item.documentId ||
            item.bookDocumentId ||
            index
        );
        setSelectedRows(newSelected);
        onSelect?.(newSelected, safeData);
        onSelectAll?.(true); // ✅ Gọi callback từ parent
      } else {
        setSelectedRows([]);
        onSelect?.([], []);
        onSelectAll?.(false); // ✅ Gọi callback từ parent
      }
    },
    [safeData, formatId, onSelect, onSelectAll]
  );
// hàm xử lý khi click vào một hàng rediect sang màn chi tiết
  const handleRowClick = useCallback(
    (row) => (e) => {
      if (mode === "builder") return;

      const isInteractive =
        e.target.closest("button") ||
        e.target.closest("input") ||
        e.target.closest(".MuiCheckbox-root") ||
        e.target.closest(".MuiIconButton-root") ||
        e.target.closest(".MuiTooltip-root");

      if (isInteractive) return;

      // Tìm hành động "Xem chi tiết" (thường có icon Visibility hoặc actionType view)
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
      // Some browsers require setData to be called for the drag to start reliably
      e.dataTransfer.setData("text/plain", String(index));
    } catch (err) {
      // ignore if not supported
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
      logger.log("newColumns", newColumns);
      if (allowColumnDrag) {
        try {
          const body = {
            columns: newColumns,
            module:
              isAuthorized === true && authorizedFunction
                ? authorizedFunction
                : fnCode,
          };
          await dispatch(upDateColumnTable(body)).unwrap();
          toast("Lưu cấu hình vị trí cột thành công", "success");
        } catch (err) {
          logger.log("Failed to save column config:", err);
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
                module:
                  isAuthorized === true && authorizedFunction
                    ? authorizedFunction
                    : fnCode,
              };
              await dispatch(upDateColumnTable(body)).unwrap();
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
  }, [
    resizingCol,
    startX,
    startWidth,
    columns,
    dispatch,
    allowColumnDrag,
    toast,
    fnCode,
    isAuthorized,
    authorizedFunction,
  ]);

  const handleSettingsClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleToggleColumn = useCallback(
    (columnKey) => {
      const targetColumn = columns.find((c) => c.key === columnKey);
      const visibleColumnsCount = columns.filter((c) => c.isShow && !c.hiddenInFlow).length;

      if (visibleColumnsCount <= 1 && targetColumn?.isShow) {
        return;
      }

      const newColumns = columns.map((c) =>
        c.key === columnKey ? { ...c, isShow: !c.isShow } : c
      );
      setColumns(newColumns);
      dispatch(addDataFieldConfig(newColumns));
    },
    [columns, dispatch]
  );

  // const handleResetColumns = useCallback(() => {
  //   setColumns(allPossibleColumns);
  //   dispatch(addDataFieldConfig(allPossibleColumns));
  //   handleSettingsClose();
  // }, [allPossibleColumns, dispatch, handleSettingsClose]);

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
  const handleClickStar = (row) => () => {
    handleStarClick(row);
  };

  settingMoreAnchor;

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
      const newOrder = isCurrentColumn
        ? order === "asc"
          ? "desc"
          : "asc"
        : "asc";

      const sort = { [columnName]: newOrder === "asc" ? 1 : -1 };
      const finalSort = { sort };
      onOrder && onOrder(finalSort);
      setOrder(newOrder);
      setOrderBy(columnName);
    },
    [order, orderBy, onOrder]
  );

  // const handleToggleColumnClick = useCallback(
  //   (key) => () => {
  //     handleToggleColumn(key);
  //     handleSettingsClose(); // Đóng popover sau khi toggle cột
  //   },
  //   [handleToggleColumn, handleSettingsClose]
  // );

  const handleToggleColumnClick = useCallback(
    (columnKey) => (event) => {
      event.stopPropagation(); // chặn Popover tự đóng
      handleToggleColumn(columnKey); // toggle column
      // handleSettingsClose();      // bỏ comment nếu muốn đóng Popover sau click
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

  const handleShowStarFilterChange = useCallback(
    (e) => {
      onPropChange(item.id, "showStarFilterConfig", e.target.checked);
    },
    [onPropChange, item.id]
  );

  // Handler cho sort
  const handleSortClick = useCallback(
    (columnName) => () => {
      handleSort(columnName);
    },
    [handleSort]
  );

  // Handler cho resize
  const handleResizeMouseDownCallback = useCallback(
    (colName) => (e) => {
      handleMouseDownResize(e, colName);
    },
    [handleMouseDownResize]
  );

  const handleCheckboxChangeEvent = useCallback(
    (rowId, safeData) => () => {
      handleCheckboxChange(rowId, safeData); // Gọi hàm xử lý gốc
    },
    [handleCheckboxChange]
  );

  // Hàm mở popover khi hover vào icon
  const handleFileIconMouseEnter = useCallback((event, files, row, key) => {
    // ✅ Xóa timeout đóng popover nếu có
    if (filePopoverTimeoutRef.current) {
      clearTimeout(filePopoverTimeoutRef.current);
    }
    // Mở popover mới
    setFilePopoverAnchorEl(event.currentTarget);
    setCurrentFiles(files);
    setCurrentFileContext({ row, key });
  }, []);

  // Hàm đóng popover (có độ trễ)
  const handleCloseFilePopoverWithDelay = useCallback(() => {
    if (loadingFileIndex !== null) return;
    // ✅ Đặt timeout để đóng và lưu ID vào ref
    filePopoverTimeoutRef.current = setTimeout(() => {
      setFilePopoverAnchorEl(null);
    }, 200); // Độ trễ 200ms
  }, [loadingFileIndex]);

  // Hàm giữ popover mở khi di chuột vào nó
  const handlePopoverMouseEnter = useCallback(() => {
    // ✅ Xóa timeout đóng popover khi chuột đã vào bên trong
    if (filePopoverTimeoutRef.current) {
      clearTimeout(filePopoverTimeoutRef.current);
    }
  }, []);

  const openFilePopper = Boolean(filePopoverAnchorEl);

  // ✅ Di chuyển ra ngoài để Popover có thể truy cập và khai báo trước khi được sử dụng
  // const createCellClickHandler = useCallback(
  //   (row, key, file) => (e) => {
  //     e.stopPropagation();
  //     onCellClick?.(row, key, file);
  //   },
  //   [onCellClick]
  // );
  // ✅ Tách hàm xử lý click file ra riêng để code sạch hơn
  const handleFileClick = useCallback(
    (file, index) => async (e) => {
      if (currentFileContext) {
        e.stopPropagation();
        setLoadingFileIndex(index);
        try {
          await onCellClick?.(currentFileContext.row, currentFileContext.key, file);
        } catch (error) {
          logger.error(error);
        } finally {
          setLoadingFileIndex(null);
          setFilePopoverAnchorEl(null);
          setCurrentFiles([]);
          setCurrentFileContext(null);
        }
      }
    },
    [currentFileContext, onCellClick]
  );
  const handleMouseEnterFileIcon = (row, key) => (e) => {
    handleFileIconMouseEnter(e, row[key], row, key);
  };

  // Handler cho checkbox "Tất cả"
  const handleToggleAllColumns = (event) => {
    event.stopPropagation && event.stopPropagation();
    const checked = event.target.checked;
    const newColumns = columns.map((col) => {
      if (col.hiddenInFlow) return col;
      return { ...col, isShow: checked };
    });
    setColumns(newColumns);
    dispatch(addDataFieldConfig(newColumns));
  };

  return (
    <StyledBoxTableBoder >
      {/* {loading && (
        <StyledBoxss >
          <CircularProgress />
        </StyledBoxss>
      )} */}
      {mode === "builder" && (
        <StyledBoxBoder>
          <Tooltip title="Cấu hình cột">
            <BuilderIconButton onClick={handleSettingsClick}>
              <ViewColumnIcon />
            </BuilderIconButton>
          </Tooltip>

          <Tooltip title="Cấu hình hành động">
            <BuilderIconButton
              onClick={handleOpenActionConfig}
              disabled={disabled}
            >
              <SettingsIcon />
            </BuilderIconButton>
          </Tooltip>

          <Tooltip title="Cấu hình thêm">
            <BuilderIconButton
              onClick={handleOpenSettingMore}
              disabled={disabled}
            >
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
                <StyleButtonH
                  variant="text"
                  size="small"
                  onClick={handleSettingsClose}
                >
                  Hủy
                </StyleButtonH>
                <StyleButtonAD
                  variant="contained"
                  size="small"
                  onClick={handleSettingsClose}
                >
                  Áp dụng
                </StyleButtonAD>
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
              <Typography variant="h6" mb={1}>
                Cấu hình hành động
              </Typography>
              {actions.map((action) => (
                <ActionConfigItem
                  key={action.id}
                  action={action}
                  onChange={handleActionPropChange}
                  onRemove={handleRemoveAction}
                  selectOptions={selectOptions}
                  columns={columns}
                  featureType={featureType}
                />
              ))}
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={handleAddAction}
                fullWidth
              >
                Thêm hành động
              </Button>
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
              <Typography variant="h6" mb={1}>
                Cấu hình thêm
              </Typography>

              <FormControlLabel
                control={
                  <StyledCheckboxTable
                    checked={item?.props?.isShowSTT}
                    onChange={handleIsShowSTTChange(item.id)}
                  />
                }
                label="Hiện STT"
              />

              <FormControlLabel
                control={
                  <StyledCheckboxTable
                    checked={item?.props?.multiDelete}
                    onChange={handlePropChange(item.id, "multiDelete")}
                  />
                }
                label="Hiện nút xóa nhiều"
              />
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
                  {/* <Typography variant="subtitle2" mt={1}>
                    Tiêu đề xóa nhiều
                  </Typography> */}
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
                        .filter((col) => col.isShow)
                        .map((col) => (
                          <MenuItem key={col.key} value={col.key}>
                            {col.label}
                          </MenuItem>
                        ))}
                    </Select>
                  </StyledFormControlTable>
                </>
              )}

              <FormControlLabel
                control={
                  <StyledCheckboxTable
                    checked={item?.props?.hasTabs}
                    onChange={handlePropChange(item.id, "hasTabs")}
                  />
                }
                label="Hiện thị các tab ở trong chi tiết"
              />
              <FormControlLabel
                control={
                  <StyledCheckboxTable
                    checked={item?.props?.showStarFilterConfig || false}
                    onChange={handleShowStarFilterChange}
                  />
                }
                label="Bộ lọc bản ghi quan trọng"
              />
            </StyledBoxBoderBox>
          </Popover>
        </StyledBoxBoder>
      )}

      <StyledTableContainer styledDynamicMaxHeight={hasField} uiVariant={uiVariant}>
        <StyledTableBorder uiVariant={uiVariant}>
          <StyledTableHead>
            <StyledTableRow>
              {!item?.props?.isShowSTT && (
                <StyledTableCell isBold styleWidthCell={70}>
                  <StyledCheckbox
                    disabled={disabled}
                    checked={
                      selectAll ||
                      (safeData.length > 0 &&
                        selectedRows.length === safeData.length)
                    }
                    onChange={handleSelectAll}
                    indeterminate={
                      !selectAll &&
                      selectedRows.length > 0 &&
                      selectedRows.length < safeData.length
                    }
                  />
                </StyledTableCell>
              )}
              {item?.props?.isShowSTT && (
                <StyledTableCell isBold styleWidthCell={70}>
                  STT
                </StyledTableCell>
              )}
              {columns
                .map((col, originalIndex) => ({ ...col, originalIndex }))
                .filter((c) => c.isShow && !c.hiddenInFlow)
                // eslint-disable-next-line no-unused-vars
                .map(({ label, align, width, margin, name, key,originalIndex }, index) => {
                  const isSpecialColumn =
                    label?.toLowerCase().includes("trạng thái") ||
                    label?.toLowerCase().includes("tình trạng") ||
                    label?.toLowerCase().includes("hành động");
                  const columnAlign = isSpecialColumn
                    ? margin || "center"
                    : "left";
                  return (
                    <StyledTableHeaderCell
                      key={label}
                      onClick={handleSortClick(name)}
                      id={`col-border-${name || key}`}
                      align={columnAlign}
                      isBold
                      draggable={mode === "builder" || allowColumnDrag}
                      styleWidth={
                        columnWidths[name || key]
                          ? `${columnWidths[name || key]}px`
                          : width
                      }
                      styleMinWidth={
                        columnWidths[name || key]
                          ? `${columnWidths[name || key]}px`
                          : width
                      }
                      styleMaxWidth={
                        columnWidths[name || key]
                          ? `${columnWidths[name || key]}px`
                          : width
                      }
                      {...((mode === "builder" || allowColumnDrag) && {
                        onDragStart: (e) => handleDragStart(e, originalIndex),
                        onDragOver: handleDragOver,
                        onDrop: (e) => handleDrop(e, originalIndex),
                      })}
                    >
                      {/* {} */}
                      <HeaderCellContainer align={columnAlign}>
                        {label}
                        <SortIconContainer>
                          <StyledArrowUp
                            isActive={orderBy === name && order === "asc"}
                          />
                          <StyledArrowDown
                            isActive={orderBy === name && order === "desc"}
                          />
                        </SortIconContainer>
                      </HeaderCellContainer>

                      {(mode === "builder" || allowColumnDrag) && (
                        <StyledBoxBoderBuilder
                          onMouseDown={handleResizeMouseDownCallback(
                            name || key
                          )}
                        />
                      )}
                    </StyledTableHeaderCell>
                  );
                })}
              {actions.length > 0 && (
                <StyledTableCellActions isBold styleWidthCell={100} alignCenter>
                  Hành động
                </StyledTableCellActions>
              )}
            </StyledTableRow>
          </StyledTableHead>

          <TableBody>
            {loading ? (
              Array.from(new Array(9)).map((_, index) => (
                <StyledTableRow key={`skeleton-${index}`}>
                  {!item?.props?.isShowSTT && (
                    <StyledTableCell>
                      <SkeletonWH variant="circular" />
                    </StyledTableCell>
                  )}
                  {item?.props?.isShowSTT && (
                    <StyledTableCell>
                      <SkeletonW20 variant="text" />
                    </StyledTableCell>
                  )}
                  {columns
                    .filter((c) => c.isShow && !c.hiddenInFlow)
                    .map(({ key, width, margin, name, label }) => (
                      <StyledTableCellWrap
                        key={`skeleton-cell-${key}-${index}`}
                        align={
                          label?.toLowerCase().includes("trạng thái") ||
                            label?.toLowerCase().includes("tình trạng") ||
                            label?.toLowerCase().includes("hành động")
                            ? margin || "center"
                            : "left"
                        }
                        styleWidth={width || columnWidths[name || key]}
                      >
                        <Skeleton variant="text" />
                      </StyledTableCellWrap>
                    ))}
                  {actions.length > 0 && (
                    <StyledTableCellActionsSpecial>
                      <SkeletonW80 variant="text" />
                    </StyledTableCellActionsSpecial>
                  )}
                </StyledTableRow>
              ))
            )
              : safeData?.length > 0 ? (
                safeData.map((row, rowIndex) => {
                  const rowId = getRowId(row, rowIndex);
                  const rowRenderKey = `${String(rowId)}-${rowIndex}`;
                  const dynamicTextColor = row.color || null;
                  const createCellClickHandlerEr = (row, key) => () => {
                    onCellClick?.(row, key);
                  };
                  return (
                    <StyledTableRow 
                      key={rowRenderKey} 
                      index={rowIndex} 
                      selected={selectedRows.includes(rowId)}
                      onClick={handleRowClick(row)}
                      rowcolor={dynamicTextColor}
                    >
                      {!item?.props?.isShowSTT && (
                        <StyledTableCell onClick={handleStopPropagation}>
                          <StyledCheckbox
                            disabled={disabled}
                            checked={selectedRows.includes(rowId)}
                            data-row-id={rowId}
                            onChange={handleCheckboxChangeEvent(rowId, safeData)}
                          />
                        </StyledTableCell>
                      )}
                      {item?.props?.isShowSTT && (
                        <StyledTableCell>{rowIndex + 1}</StyledTableCell>
                      )}
                      {columns
                        .filter((c) => c.isShow && !c.hiddenInFlow)
                        .map(({ key, width, margin, name, label }, colIndex) => {
                          const isSpecialColumn = key === "toBook" || key === "releaseNo" || key === "release_no";
                          const isTitleColumn = key === "title";
                          const cellColor = isTitleColumn
                            ? "#2364B0"
                            : (isSpecialColumn && row.colorDocumentNumber)
                            ? row.colorDocumentNumber
                            : dynamicTextColor;
                          return (
                            <StyledTableCellWrap
                              key={key}
                              align={
                                label?.toLowerCase().includes("trạng thái") ||
                                  label?.toLowerCase().includes("tình trạng") ||
                                  label?.toLowerCase().includes("hành động")
                                  ? margin || "center"
                                  : "left"
                              }
                              styleWidth={width || columnWidths[name || key]}
                              rowcolor={cellColor}
                              isBold={isSpecialColumn}
                              isTitle={isTitleColumn}
                            >
                            <StyledBoxs>
                              {((row.isStar !== undefined || row.flagsProcess?.isStar !== undefined) && colIndex === 0) && (
                                <IconButtonStyled size="small" onClick={handleClickStar(row)}>
                                  {(row.isStar ?? row.flagsProcess?.isStar) ? (
                                    <img src="/Vector.png" alt="starred" style={{ height: "16px", width: "16px" }} />
                                  ) : (
                                    <img src="/Vector1.png" alt="not starred" style={{ height: "16px", width: "16px" }} />
                                  )}
                                </IconButtonStyled>
                              )}
                              {("isCertifiedCopy" in row && colIndex === 0) && (
                                <IconStyled>
                                  {row?.isCertifiedCopy ? (
                                    <img src="/bookmark.png" alt="bookmark" style={{ marginLeft: "10px", height: "17.57px", width: "12px" }} />
                                  ) : null}
                                </IconStyled>
                              )}
                              {((authorizedFunction === "qldanew" || fnCode === "qldanew" || item?.props?.fnCode === "qldanew") && colIndex === 0) && (
                                (() => {
                                  let content = row.flag;
                                  
                                  // Fallback: Nếu không có row.flag nhưng có row.priority thì sinh Icon cờ theo độ ưu tiên
                                  if (!content && row.priority) {
                                    const priorityVal = typeof row.priority === 'object' && row.priority !== null 
                                      ? (row.priority.value || row.priority.code || row.priority.id || row.priority._id) 
                                      : row.priority;
                                    const currentPriority = String(priorityVal || "").toLowerCase();
                                    const isUrgent = currentPriority === "gap" || currentPriority === "gấp" || currentPriority === "1";
                                    
                                    return (
                                      <div 
                                        onClick={handleFlagClick(row)}
                                        style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", marginRight: "6px" }}
                                      >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path fillRule="evenodd" clipRule="evenodd" d="M6.5 1.75C6.5 1.55109 6.42098 1.36032 6.28033 1.21967C6.13968 1.07902 5.94891 1 5.75 1C5.55109 1 5.36032 1.07902 5.21967 1.21967C5.07902 1.36032 5 1.55109 5 1.75V21.75C5 21.9489 5.07902 22.1397 5.21967 22.2803C5.36032 22.421 5.55109 22.5 5.75 22.5C5.94891 22.5 6.13968 22.421 6.28033 22.2803C6.42098 22.1397 6.5 21.9489 6.5 21.75V1.75Z" fill="#4B5563"/>
                                          <g filter="url(#filter0_d_9313_10393)">
                                            <path d="M13.349 3.79048L13.145 3.70848C11.5819 3.08474 9.8715 2.92773 8.221 3.25648L6.5 3.60048V13.6005L8.22 13.2565C9.87082 12.9275 11.5816 13.0845 13.145 13.7085C14.8386 14.3855 16.7025 14.5118 18.472 14.0695L18.686 14.0165C18.9898 13.9406 19.2596 13.7654 19.4524 13.5186C19.6452 13.2718 19.75 12.9677 19.75 12.6545V5.28748C19.7499 5.10525 19.7084 4.92542 19.6284 4.76165C19.5485 4.59787 19.4324 4.45445 19.2887 4.34226C19.1451 4.23008 18.9779 4.15207 18.7996 4.11416C18.6214 4.07625 18.4368 4.07944 18.26 4.12348C16.6286 4.53105 14.9102 4.41518 13.349 3.79048Z" fill={isUrgent ? "#ef5350" : "white"}/>
                                            <path d="M8.26953 3.50195C9.8724 3.18269 11.5338 3.33432 13.0518 3.94043L13.2559 4.02246C14.8659 4.66668 16.6381 4.7864 18.3203 4.36621C18.4603 4.33135 18.6069 4.32839 18.748 4.3584C18.889 4.38842 19.0212 4.45038 19.1348 4.53906C19.2484 4.6278 19.3401 4.74158 19.4033 4.87109C19.4665 5.00061 19.4999 5.143 19.5 5.28711V12.6543C19.5 12.9115 19.4141 13.1615 19.2559 13.3643C19.0974 13.5671 18.8747 13.7111 18.625 13.7734L18.4121 13.8271H18.4111C16.6929 14.2566 14.8829 14.1339 13.2383 13.4766H13.2373C11.6291 12.8348 9.86908 12.6733 8.1709 13.0117L6.75 13.2949V3.80469L8.26953 3.50195Z" stroke="black" strokeOpacity="0.3" strokeWidth="0.5"/>
                                          </g>
                                          <defs>
                                            <filter id="filter0_d_9313_10393" x="2.5" y="3.08887" width="21.25" height="19.2393" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                                              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                                              <feOffset dy="4"/>
                                              <feGaussianBlur stdDeviation="2"/>
                                              <feComposite in2="hardAlpha" operator="out"/>
                                              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                                              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_9313_10393"/>
                                              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_9313_10393" result="shape"/>
                                            </filter>
                                          </defs>
                                        </svg>
                                      </div>
                                    );
                                  }

                                  if (!content) return null;

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
                                      onClick={handleFlagClick(row)} 
                                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                                    >
                                      {String(content)}
                                    </div>
                                  );
                                })()
                              )}
                              {(() => {
                                const cell = row[key];
                                if (key === "progressView" ) {
                                  return (
                                    <div style={{ width: '100%' }}>                                        
                                      <div  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cell) }} />
                                    </div>
                                  );
                                }
                                if (key === "files" && Array.isArray(cell) && cell.length > 0 && (cell[0]?.fileName || cell[0]?.path || cell[0]?.fileId)) {
                                  return (
                                    <>
                                      <FileIconButton size="small" onMouseEnter={handleMouseEnterFileIcon(row, key)} onMouseLeave={handleCloseFilePopoverWithDelay}>
                                        <StyledAttachFileIcon />
                                      </FileIconButton>
                                      {cell.length > 1 && <FileCountTypography variant="caption">({cell.length})</FileCountTypography>}
                                    </>
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
                                    return <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decoded) }} />;
                                  }

                                  return <TruncatedCell content={decoded} onClick={createCellClickHandlerEr(row, key)} rowcolor={cellColor} />;
                                }

                                // Fallback for other types
                                return <TruncatedCell content={cell} onClick={createCellClickHandlerEr(row, key)} rowcolor={cellColor} />;
                              })()}
                            </StyledBoxs>
                          </StyledTableCellWrap>
                        );
                      })}
                      {actions.length > 0 && (
                        <StyledTableCellActionsSpecial index={rowIndex} onClick={handleStopPropagation}>
                          <StyleBoxActionsBoder>
                            {isMobile ? (
                              <>
                                <MobileActionsIconButton
                                  size="small"
                                  onClick={handleOpenActionsPopoverCallback(row)}
                                >
                                  <MoreVertIcon />
                                </MobileActionsIconButton>
                                <Popover
                                  open={
                                    Boolean(popoverAnchorEl) &&
                                    getRowId(currentRowForPopover, 0) ===
                                    getRowId(row, rowIndex)
                                  }
                                  anchorEl={popoverAnchorEl}
                                  onClose={handleCloseActionsPopover}
                                  anchorOrigin={{
                                    vertical: "bottom",
                                    horizontal: "right",
                                  }}
                                  transformOrigin={{
                                    vertical: "top",
                                    horizontal: "right",
                                  }}
                                  elevation={0}
                                  onBackdropClick={handleCloseActionsPopover}
                                >
                                  <StyledBox
                                    stylePadding="12px"
                                    styleDisplay="flex"
                                    styleFlexDirection="column"
                                    styleGap={0.5}
                                  >
                                    {actions.filter(action => {
                                      // FIX: Ẩn cấu hình - nếu hideInDropdown = true thì ẩn khỏi popover mobile
                                      if (action.config?.hideInDropdown) return false;
                                      if (action.config?.icon === 'Edit' && row?.isNotEdit === true) return false;
                                      if (action.config?.icon === 'Cancel' && row?.isNotCancel === true) return false;
                                      if (action.config?.icon === 'Delete' && row?.isNotDelete === true) return false;
                                      return true;
                                    }).map((action) => {
                                      const IconComp = iconOptions.find(
                                        (i) => i.name === action.config.icon
                                      )?.icon;
                                      const tooltipTitle =
                                        action.config.displayName ||
                                        iconOptions.find(
                                          (i) => i.name === action.config.icon
                                        )?.displayName ||
                                        action.config.icon;
                                      return (
                                        <PopoverActionButton
                                          key={action.id}
                                          startIcon={IconComp}
                                          onClick={handlePopoverActionClick(
                                            action,
                                            row
                                          )}
                                          size="small"
                                          styleColor={
                                            action.config.color || "inherit"
                                          }
                                        >
                                          {tooltipTitle}
                                        </PopoverActionButton>
                                      );
                                    })}
                                  </StyledBox>
                                </Popover>
                              </>
                            ) : (
                              // Nếu <= 3 icon thì hiển thị tất cả, nếu > 3 thì hiển thị 1 icon đầu + icon 3 chấm
                              (() => {
                                 const manuals = manualActions({ onAction });
                                 const allActions = [
                                   ...actions,
                                   ...manuals.map(m => ({
                                     id: m.key,
                                     config: { 
                                       icon: m.icon || (m.key === 'canPublished' ? 'Published' : 'Download'), 
                                       displayName: m.label 
                                     },
                                     onClick: m.onClick,
                                     isManual: true,
                                     key: m.key
                                   }))
                                 ];

                                 const shouldCollapse = allActions.length > 0;
                                 const visibleActions = shouldCollapse ? allActions.slice(0, 0) : allActions;
                                 const hiddenActions = shouldCollapse ? allActions.slice(0) : [];
                                 const hasMoreActions = hiddenActions.length > 0;
                                 
                                 const iconOptionsFilter = iconOptions.filter((e) => {
                                   if (e.codes) {
                                     return e?.codes?.some((c) => row?.flags?.[c]);
                                   }
                                   return !e.code || row?.flags?.[e.code];
                                 });

                                  const filterActionByFlag = (action, row, filteredIcons) => {
                                    // FIX: Ẩn cấu hình - nếu hideInDropdown = true thì ẩn khỏi popover "Xem thêm"
                                    if (action.config?.hideInDropdown) {
                                      return false;
                                    }

                                    // Ẩn nút Cập nhật nếu bản ghi có isNotEdit = true
                                    if (action.config?.icon === 'Edit' && row?.isNotEdit === true) {
                                      return false;
                                    }

                                    // Ẩn nút Hủy lịch nếu bản ghi có isNotCancel = true
                                    if (action.config?.icon === 'Cancel' && row?.isNotCancel === true) {
                                      return false;
                                    }

                                    // Ẩn nút Xóa nếu bản ghi có isNotDelete = true
                                    if (action.config?.icon === 'Delete' && row?.isNotDelete === true) {
                                      return false;
                                    }

                                    // Đặc biệt cho Chuyển xử lý, ưu tiên check availableActions từ BE nếu có
                                    if (action.key === 'canTransferRoom' && row?.availableActions) {
                                      const hasTransfer = (row.availableActions || []).some(
                                        (act) => act.type === "transfer" && act.label?.includes("THÊM XỬ LÝ")
                                      );
                                      if (hasTransfer) return true;
                                    }
                                    if (action.key) {
                                      if (row?.flags && row.flags[action.key] !== undefined) {
                                        return !!row.flags[action.key];
                                      }
                                      return false;
                                    }

                                    // Nếu KHÔNG có key, Fallback check theo icon registry (Vẫn hiện bt)
                                    const iconName = action.config?.icon || 'Download';
                                    const iconData = filteredIcons.find(i => i.name === iconName);
                                    return !!(iconData && iconData.icon);
                                  };


                                return (
                                  <>
                                    {visibleActions.map((action) => {
                                      const IconComp = iconOptionsFilter.find(
                                        (i) => i.name === (action.config.icon || 'Download')
                                      )?.icon;
                                      const tooltipTitle =
                                        action.config.displayName ||
                                        iconOptionsFilter.find(
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
                                            getRowId(moreActionsRow, 0) === getRowId(row, rowIndex)
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
                                            {hiddenActions
                                               .filter((action) => {
                                                 return filterActionByFlag(action, row, iconOptionsFilter);
                                               })
                                              .map((action) => {
                                                 const iconData = iconOptions.find(
                                                   (i) => i.name === (action.config?.icon || 'Download')
                                                 );
                                                 const tooltipTitle =
                                                   action.config?.displayName ||
                                                   iconData?.displayName ||
                                                   action.config?.icon;

                                                return (
                                                  <StyledActionMenuItem 
                                                    key={action.id} 
                                                    onClick={handleMoreActionItemClick(action, row)}
                                                  >
                                                    <PopoverActionButton
                                                       startIcon={iconOptions.find(i => i.name === (action.config?.icon || 'Download'))?.icon}
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
                  );
                })
              ) : (
                <>
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

                </>
              )}
          </TableBody>
        </StyledTableBorder>
        <PopperStyled
          open={openFilePopper}
          anchorEl={filePopoverAnchorEl}
          placement="bottom-start"
          modifiers={[
            {
              name: "flip",
              enabled: true,
              options: { fallbackPlacements: ["top-start", "right-start"] },
            },
            {
              name: "preventOverflow",
              enabled: true,
              options: { boundary: "viewport" },
            },
          ]}
        >
          <FilePopoverContainer
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handleCloseFilePopoverWithDelay}
          >
            {currentFiles.map((file, fileIndex) => (
              <MenuItem
                key={file.fileId || fileIndex}
                onClick={handleFileClick(file, fileIndex)}
                disabled={loadingFileIndex !== null}
              >
                <Typography variant="body2">{file.fileName}</Typography>
                {loadingFileIndex === fileIndex && <FileLoadingSpinner size={16} />}
              </MenuItem>
            ))}
          </FilePopoverContainer>
        </PopperStyled>
      </StyledTableContainer>
    </StyledBoxTableBoder>
  );
};

CustomTableBorder.propTypes = {
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
  loading: PropTypes.bool,
  uiVariant: PropTypes.oneOf(["leadershipDutySchedule"]),
  setReloadData: PropTypes.func,
};

export default CustomTableBorder;