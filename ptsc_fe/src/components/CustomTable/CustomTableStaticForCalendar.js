import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  TableBody,
  IconButton,
  Box,
  FormControlLabel,
  Checkbox,
  ClickAwayListener,
  Tooltip,
  MenuItem,
  Popover,
  Button,
  FormControl,
  RadioGroup,
  styled,
  alpha,
  Dialog,
  // DialogTitle,
  // DialogContent,
  // DialogActions,
  Grid,
  Typography,
  useTheme,
  useMediaQuery,
  Menu,
  ListItemText,
} from "@mui/material";
import {
  Add,
  CalendarToday,
  Dehaze,
  DeleteOutline,
  DeleteOutlineOutlined,
  Edit,
  EditOutlined,
  FilterAlt,
  LoopOutlined,
  RemoveRedEyeOutlined,
  Search,
  FileDownload,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import ListAltIcon from '@mui/icons-material/ListAlt';
import SaveAsIcon from "@mui/icons-material/SaveAs";
import TaskIcon from "@mui/icons-material/Task";
import RoomPreferencesIcon from "@mui/icons-material/RoomPreferences";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import PropTypes from "prop-types";
import {
  FilterBox,
  HeaderCellContainer,
  SortIconContainer,
  StyledArrowDown,
  StyledArrowUp,
  StyledButton,
  ExportButton,
  StyledCheckbox,
  StyledFilterButton,
  StyledPaper,
  StyledSearchButton,
  StyledSearchField,
  StyledTable,
  SearchContainer,
  ActionsContainer,
  RowsPerPageSelect,
  DeleteStyledButton,
  StyledTableCell,
  StyledTableCellActions,
  StyledTableContainer,
  StyledTableHead,
  StyledTableRow,
  StyledToolbar,
  StyledPagination,
  LoadingDialogTitle,
  LoadingTypography,
  ColumnResizer,
  // PopoverContainer,
  ToolbarContent,
  DatePickerGrid,
  DatePickerBox,
  MoreSearchBox,
  RadioBox,
  PaginationContainer,
  ActionsBox,
  ExtraContentBox,
  RowsPerPageBox,
  PaginationStack,
  StyledRadio,
  CheckboxHeaderCell,
  SearchAdornment,
  STTHeaderCell,

  ActionIconButton,
  AdvancedFilterWrapper,
  DeleteSelectedButton,

  ActionsContainerFooter,
  StyleBoxActionsRespon,
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
  StyledClearIcon,
  StyleActionPage,
  StylePageButton,
  StylePageDots,
  StyledMenuIcon,
  StyledListItemIcon,
  ReportSelectBox,
  SearchBarWrapper,
  UnifiedSearchGroup,
  SearchFilterPopupAnchor,
  SearchLeftFilterTrigger,
  UnifiedInput,
  SearchAdornmentStack,
  ClearIconButton,
  TuneTriggerContainer,
  TuneIconBox,
  UnifiedSearchButton,
 } from "@styles/CustomTable.styles";
import "./CustomCss.css";
import CustomInput from "@components/CustomInput/CustomInput";
import { encodeHTML } from "@/utils/securityUtils";
const ThemedDateRangePicker = styled(Box)(({ theme }) => ({
  "& .rdrCalendarWrapper": {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
  },
  "& .rdrDateDisplayItem": {
    backgroundColor: theme.palette.action.hover,
  },
  "& .rdrDayNumber span": {
    color: theme.palette.text.primary,
  },
}));

const ViewSwitchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '0',
  border: `1px solid ${theme.palette.divider}`,
  height: '40px',
  boxSizing: 'border-box',
  overflow: 'hidden',
  marginLeft: '15px',
}));

const ViewSwitchButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  borderRadius: '0',
  padding: '6px',
  width: '42px',
  height: '100%',
  backgroundColor: active ? theme.palette.primary.main : 'transparent',
  color: active ? '#fff' : theme.palette.primary.main,
  '&:hover': {
    backgroundColor: active ? theme.palette.primary.dark : alpha(theme.palette.primary.main, 0.08),
  },
  '& svg': {
    fontSize: '22px',
  },
}));

const StyledPopoverPaper = styled(Box)(() => ({
  width: '740px',
  maxWidth: '96vw',
  overflow: 'hidden',
}));

const PopoverHeader = styled(Box)(() => ({
  padding: '28px 32px 12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const PopoverContent = styled(Box)(() => ({
  padding: '0 32px 24px',
}));

const PopoverActions = styled(Box)(() => ({
  padding: '16px 32px 32px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '16px',
}));

const ConfigSection = styled(Box)(() => ({
  marginBottom: '16px',
}));

const CancelButton = styled(Button)(() => ({
  borderRadius: '8px',
  textTransform: 'none',
  padding: '3px 10px',
  border: '1px solid #e0e0e0',
  color: '#666',
  backgroundColor: '#fff',
  '&:hover': {
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
  },
}));

const ApplyButton = styled(Button)(({ theme }) => ({
  borderRadius: '8px',
  textTransform: 'none',
  padding: '3px 10px',
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: 'none',
  },
}));

const ConfigHeaderIcon = styled(SettingsIcon)(() => ({
  color: '#1976d2',
  fontSize: '28px',
}));

const PopoverTitle = styled(Typography)(() => ({
  fontWeight: 700,
  fontSize: '20px',
  color: '#333',
}));

const AllCheckBoxLabel = styled(Typography)(() => ({
  fontWeight: 600,
  fontSize: '16px',
  color: '#333',
}));

const ColumnLabel = styled(Typography)(() => ({
  fontSize: '14px',
  color: '#444',
}));

const ConfigGrid = styled(Grid)(() => ({
  // grid container
}));

const StyledMenuItem = styled(MenuItem, {
  shouldForwardProp: (prop) => prop !== 'error',
})(({ error }) => ({
  gap: '8px',
  padding: '10px 16px',
  color: error ? '#d32f2f' : '#1976d2',
}));

const StyledPaperWithBottomPadding = styled(StyledPaper, {
  shouldForwardProp: (prop) => prop !== "paperPaddingBottom",
})(({ paperPaddingBottom }) => ({
  ...(paperPaddingBottom != null && { paddingBottom: `${paperPaddingBottom}px` }),
}));

const ToolbarWithBottomMargin = styled(StyledToolbar)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
}));

const AddTextButton = styled(StyledButton)(({ theme }) => ({
  width: "auto",
  minWidth: "max-content !important",
  paddingLeft: theme.spacing(1.5),
  paddingRight: theme.spacing(1.5),
  gap: theme.spacing(0.5),
}));

const DownloadIconSmall = styled(FileDownload)(() => ({
  fontSize: "1rem",
}));

const StyledTableWithGridBorder = styled(StyledTable, {
  shouldForwardProp: (prop) => prop !== "fullGridBorder",
})(({ theme, fullGridBorder }) => ({
  ...(fullGridBorder && {
    "& th, & td": {
      border: `1px solid ${theme.palette.divider} !important`,
    },
  }),
}));

const PaginationInfoBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(3),
  flexWrap: "wrap",
}));

const PaginationControlsBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  marginLeft: "auto",
}));


// const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
//   backgroundColor: theme.palette.primary.main, // Màu xanh chính của theme
//   color: '#fff',
//   padding: '16px 24px',
//   fontSize: '18px',
// }));

// const StyledDialogContent = styled(DialogContent)(() => ({
//   padding: '24px',
//   minHeight: '100px', // Làm popup cao hơn
//   display: 'flex',
//   alignItems: 'center',
// }));

// const StyledDialogActions = styled(DialogActions)(() => ({
//   padding: '16px 24px',
//   justifyContent: 'flex-end', // Căn phải
//   gap: '12px',
// }));

// const ConfirmButton = styled(Button)(({ theme }) => ({
//   backgroundColor: theme.palette.primary.main,
//   color: '#fff',
//   '&:hover': { backgroundColor: theme.palette.primary.dark },
// }));

// const CancelButtonRed = styled(Button)(() => ({
//   backgroundColor: '#d32f2f',
//   color: '#fff',
//   '&:hover': { backgroundColor: '#b71c1c' },
// }));
const StyledMessage = styled(Typography)(() => ({
  fontWeight: 500,
  fontSize: '16px',
  color: '#333',
  lineHeight: '1.5',
}));

// External helper: handle advanced filter select change
// Accepts the native event and a setter function to update state inside the component
const advancedFilterChange = (e, setter) => {
  if (!setter) return;
  const val = e?.target?.value;
  setter(val);
};

import { useToast } from "@components/common/ToastProvider";
import { clearWidthSpace } from "@utils/Common/Common";
import DatePicker from "../DropDownLayout/DatePicker";
import dayjs from "dayjs";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import { useLocation, matchPath } from "react-router-dom";
import { useDynamicMenuRoutes } from "../../hooks/useDynamicMenuRoutes";
import { useDispatch, useSelector } from "react-redux";
import UploadIcon from "@mui/icons-material/Upload";
import { AuthContext } from "../../AuthContext/AuthProvider";
import { find } from "lodash";
import { settingViewConfig } from "@redux/slices/ViewConfig/ViewConfigSlice";
import api from "@services/api";
import TuneIcon from "@builder-table/components/TuneIcon";
import { StyleBoxTittle, StyleTittleBox, StyleTittleTyprography } from "@builder-table/components/SearchSection.styles";
import FilterDropdown from "./FilterDropdown";
 

// Thêm vào đầu file, sau các import
// Thêm vào đầu file, sau các import
const createPageButton = (pageNumber, currentPage, handlePageChange) => {
  const isActive = currentPage === pageNumber;

  const handleClick = function () {
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
  const currentPage = page + 1; // page bắt đầu từ 0, cần +1

  // Nếu không có trang nào
  if (totalPages === 0) return pages;

  // Luôn hiển thị trang 1
  pages.push(createPageButton(1, currentPage, handlePageChange));

  // Nếu chỉ có 1 trang thì return
  if (totalPages === 1) return pages;

  // Nếu trang hiện tại > 4, hiển thị dấu ...
  if (currentPage > 4) {
    pages.push(createPageDots('dots-start'));
  }

  // Hiển thị các trang xung quanh trang hiện tại
  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);

  // Đảm bảo luôn hiển thị ít nhất 4 trang đầu (nếu đủ)
  if (currentPage <= 3) {
    endPage = Math.min(totalPages - 1, 4);
  }

  // Nếu đang ở gần cuối
  if (currentPage >= totalPages - 2) {
    startPage = Math.max(2, totalPages - 3);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(createPageButton(i, currentPage, handlePageChange));
  }

  // Nếu trang hiện tại < totalPages - 2, hiển thị dấu ...
  if (currentPage < totalPages - 2 && totalPages > 5) {
    pages.push(createPageDots('dots-end'));
  }

  // Luôn hiển thị trang cuối (nếu totalPages > 1)
  if (totalPages > 1) {
    pages.push(createPageButton(totalPages, currentPage, handlePageChange));
  }

  return pages;
};

const CustomTable = ({
  showCustomDeleteButton = false,
  isMaxHeight,
  moreSearch,
  moreActions,
  children,
  fetchData,
  filter,
  onAdd,
  onDelete,
  onRowDelete,
  onEdit,
  onView,
  idList,
  reload,
  disableCheckbox = false,
  disableSelectAll = false,
  disableEdit = false,
  disableDetail = false,
  disableDelete = false,
  disableDeletePQ = false,
  // disableMore = false,
  disableBL = false,
  disableAdd = false,
  disableAct = false,
  disableSynchronize = false,
  disableSearch = false,
  isSetting,
  refreshTrigger,
  anableDateRangePicker = false,
  anableDatePicker = false,
  onDatePicker,
  customFieldOnDatePicker,
  optionMore,
  anableSTT = false,
  editGroupUnit,
  disableDigital = false,
  Signed = false,
  disableCheckthedigits = false,
  defaultCodePrams,
  isRadio,
  isExport,
  isExportAll,
  onExport,
  onExportAll,
  fileName,
  disableSpecialChars = false,
  // alwaysShowDeleteButton = false,
  onlyTable = false,
  paginationProps,
  mapFunction,
  columns: propColumns,
  isDeleteWithCode,
  extraContentBelowSearch,
  selection,
  onSelectionChange,
  selectionReturns, // ✅ Thêm prop mới
  disableDefaultSort = false,
  defaultSort,
  onImport,
  importIcon,
  onSyncUser,
  urlAsyncData,
  disableAdds = false,
  data: propData,
  codeModule,
  actions,
  onAction,
  renderCustomActions,
  onOrder,
  isInsideDialog = false, // Prop để xác định table đang ở trong dialog
  customMaxHeight, // Prop để truyền height tùy ý từ ngoài vào
  fixedHeight = false, // Prop để cố định chiều cao table, giữ pagination luôn ở dưới
  disablePaperHeight = false, // Prop để vô hiệu hóa height của Paper bên ngoài
  paperPaddingBottom,
  hideHeaderColumnResizer = false,
  fullGridBorder = false,
  noneTitle,
  isMobieHeight,
  isCheckTitle = false,
  autoHeight = false,
  enableMoreActions = false,
  onMoreAction,
  filtersAdvanced = false,
  advancedFiltersParams,
  advancedFilterConfig = [],
  showReportSelect = false,
  reportOptions = [],
  reportValue,
  onReportChange,
  disableClearReport = false,
  onSwitchView,
  viewMode = 'list', // 'list' or 'calendar'
  onSearch,
  searchToolbarVariant = "default",
  handleApplyFilterClick: parentHandleApplyFilterClick,
   ...restOptionsProps
}) => {
  const [internalSelected, setInternalSelected] = useState([]);
  const isControlled =
    selection !== undefined && onSelectionChange !== undefined;
  const selected = isControlled ? selection : internalSelected;
  const setSelected = isControlled ? onSelectionChange : setInternalSelected;

  const location = useLocation();
  const dynamicMenuRoutes = useDynamicMenuRoutes();
  const { userPermissions } = useSelector((state) => state.users);
  const [reloadTable, setReloadTable] = useState("");
  const [loading, setLoading] = useState(false);
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle);

  const toast = useToast();
  const [openAdvancedFilter, setOpenAdvancedFilter] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);
  useEffect(() => {
    if (reload) {
      setSelected([]);
    }
  }, [reload, setSelected]);
  // useEffect(() => {
  //   if (filter) {
  //     setSelectedColumns(filter.map((col) => col.name));
  //   }
  // }, [filter]);

  useEffect(() => {
    setAdvancedFilters({});
    setSearchText("");
    setCommittedSearchText("");
    setPage(0);
  }, [reportValue]);

  const currentModuleTitle = useMemo(() => {
    const findTitle = (path, routes, parent = null) => {
      for (const route of routes) {
        const isMatch =
          route.path && matchPath({ path: route.path, end: false }, path);
        if (isMatch) {
          if (route.subItems) {
            const subTitle = findTitle(path, route.subItems, route);
            if (subTitle) return subTitle;
          }
          return parent ? parent.title : route.title;
        }
        if (route.subItems) {
          const subTitle = findTitle(path, route.subItems, route);
          if (subTitle) return subTitle;
        }
      }
      return null;
    };
    return findTitle(location.pathname, dynamicMenuRoutes);
  }, [location.pathname, dynamicMenuRoutes]);

  const permissionsForModule = useMemo(() => {
    if (!userPermissions) return null;
    const allRoleDetails =
      userPermissions.groups?.flatMap((g) => g.roleDetails || []) || [];
    if (allRoleDetails.length === 0) return "all";
    const relevantRole = allRoleDetails.find(
      (role) => role.name === currentModuleTitle
    );
    if (!relevantRole) return [];
    const flatPermissions = (relevantRole.permissions || []).flatMap((p) => {
      if (typeof p === "string") return p;
      if (typeof p === "object" && Array.isArray(p.permissions))
        return p.permissions;
      return [];
    });
    return [...new Set(flatPermissions)];
  }, [userPermissions, currentModuleTitle]);

  const [searchText, setSearchText] = useState("");
  const [inputValue, setInputValue] = useState(""); // State mới để nhập liệu mượt hơn
  const [committedSearchText, setCommittedSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState([25, 50, 100]);
  const [openFilter, setOpenFilter] = useState(false);
  const [openFilterAdvanced, setOpenFilterAdvanced] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(advancedFiltersParams || {});


  const getInitialSort = () => {
    if (disableDefaultSort || !defaultSort) {
      return { initialOrderBy: null, initialOrder: "asc" };
    }
    // 	const [field, direction] = defaultSort.split(":");
    // return { initialOrderBy: field, initialOrder: direction || "asc" };

    // Kiểm tra nếu defaultSort là object (cách dùng mới và linh hoạt hơn)
    if (typeof defaultSort === "object" && defaultSort !== null) {
      return {
        initialOrderBy: defaultSort.orderBy,
        initialOrder: defaultSort.order || "asc",
      };
    }
    // Giữ lại logic cũ nếu defaultSort là string (để tương thích ngược)
    if (typeof defaultSort === "string") {
      const [field, direction] = defaultSort.split(":");
      return { initialOrderBy: field, initialOrder: direction || "asc" };
    }
    return { initialOrderBy: null, initialOrder: "asc" };
  };

  const { initialOrderBy, initialOrder } = getInitialSort();
  const [order, setOrder] = useState(initialOrder);
  const [orderBy, setOrderBy] = useState(initialOrderBy);
  const [selectedColumns, setSelectedColumns] = useState(
    filter?.map((col) => col.name) || []
  );
  // Advanced filter: single-select choice stored separately until Apply
  const [advancedFilterSelection, setAdvancedFilterSelection] = useState(
    selectedColumns[0] || ""
  );
  const [tempSelectedColumns, setTempSelectedColumns] = useState(selectedColumns);
  const isUnifiedSearchToolbar = searchToolbarVariant === "unified";
  const canShowSearchFilterPopup =
    Array.isArray(filter) && filter.length > 0;
  const canShowAdvancedFilterPopup = !!filtersAdvanced;
  const unifiedSearchPlaceholder = useMemo(() => {
    const selectedNames =
      filter
        ?.filter((col) => selectedColumns.includes(col.name))
        .map((col) => col.name)
        .filter(Boolean) || [];

    if (selectedNames.length === 0) return "Tìm kiếm...";
    return `Tìm theo ${selectedNames.join(", ")}`;
  }, [filter, selectedColumns]);

  const { dataViewConfig } = useSelector((state) => state.viewConfig);
  const [columns, setColumns] = useState([]);
  const [viewConfigTable, setViewConfigTable] = useState();
  const dispatch = useDispatch();

  const [configAnchorEl, setConfigAnchorEl] = useState(null);
  const [tempColumnsLocal, setTempColumnsLocal] = useState([]);

  const handleOpenConfig = useCallback((event) => {
    setTempColumnsLocal(columns || []);
    setConfigAnchorEl(event.currentTarget);
  }, [columns]);

  const handleCloseConfigDialog = useCallback(() => {
    setConfigAnchorEl(null);
  }, []);

  const handleSelectAllColumnsLocal = useCallback((e) => {
    const checked = e.target.checked;
    setTempColumnsLocal((prev) =>
      prev.map((col) => ({ ...col, isShow: checked }))
    );
  }, []);

  const handleToggleColumn = useCallback((e) => {
    const idx = parseInt(e.target.name, 10);
    setTempColumnsLocal((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], isShow: !updated[idx].isShow };
      return updated;
    });
  }, []);

  const handleApplyConfig = useCallback(async () => {
    try {
      const payload = {
        ...viewConfigTable,
        field: tempColumnsLocal,
      };
      const idPayload = viewConfigTable?._id || viewConfigTable?.id;
      if (idPayload) {
        await dispatch(settingViewConfig({ id: idPayload, payload: payload })).unwrap();
        toast("Cập nhật cấu hình bảng thành công", "success");
      }
      setConfigAnchorEl(null);
    } catch (error) {
      toast("Cập nhật cấu hình bảng thất bại!", "error");
    }
  }, [tempColumnsLocal, viewConfigTable, dispatch, toast]);
  // console.log("dataViewConfig", dataViewConfig);

  useEffect(() => {
    if (!codeModule) return;
    let columnsTable = [];
    let viewConfig = {};
    if (dataViewConfig) {
      if (!Array.isArray(dataViewConfig)) {
        viewConfig = dataViewConfig;
      } else {
        viewConfig =
          dataViewConfig.find((item) => item.code === codeModule) || {};
      }
      columnsTable = viewConfig.field || [];
      setViewConfigTable(viewConfig);
      setColumns(columnsTable);
    }
  }, [dataViewConfig, codeModule]);

  useEffect(() => {
    if (propColumns && !codeModule) {
      setColumns(propColumns);
    }
  }, [propColumns, codeModule]);

  const [columnWidths, setColumnWidths] = useState(() => {
    const map = {};
    (columns || []).forEach((c) => {
      if (c?.width) map[c.row] = c.width;
    });
    return map;
  });

  useEffect(() => {
    const map = {};
    (columns || []).forEach((c) => {
      if (c?.width) map[c.row] = c.width;
    });
    setColumnWidths((prev) => ({ ...map, ...prev }));
  }, [columns]);

  const handleDragStart = useCallback((e, index) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e, targetIndex) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (Number.isNaN(from)) return;
      if (from === targetIndex) return;
      const newOrder = [...columns];
      const [moved] = newOrder.splice(from, 1);
      newOrder.splice(targetIndex, 0, moved);
      setColumns(newOrder);
      try {
        const cleanedNewOrder = newOrder.map((col, index) => {
          let updatedCol = col;
          if (col.width) {
            const widthValue = parseFloat(col.width);
            if (!isNaN(widthValue)) {
              updatedCol = { ...col, width: `${widthValue}px` };
            }
          }
          updatedCol = { ...updatedCol, order: index + 1 };
          return updatedCol;
        });
        const payload = {
          ...viewConfigTable,
          field: cleanedNewOrder,
        };
        const idPayload = viewConfigTable?._id || viewConfigTable?.id;
        await dispatch(
          settingViewConfig({ id: idPayload, payload: payload })
        ).unwrap();
        toast("Cập nhật vị trí cột thành công", "success");
      } catch (error) {
        toast("Cập nhật vị trí cột thất bại!", "error");
      }
    },
    [columns, viewConfigTable, dispatch, toast]
  );

  const [resizingCol, setResizingCol] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const handleMouseDownResize = useCallback((e, colRow) => {
    // 🔒 Ngăn resize các cột cố định: checkbox, stt và hành động
    // if (colRow === "checkbox" || colRow === "actions" || colRow === "stt") {
    //   e.preventDefault();
    //   return;
    // }

    // // Kiểm tra xem liệu có phải kéo từ một cột cố định không bằng cách kiểm tra element
    // const resizeHandle = e.target;
    // const headerCell = resizeHandle?.closest("th, td");
    // if (
    //   headerCell?.id === "col-checkbox" ||
    //   headerCell?.id === "col-actions" ||
    //   headerCell?.id === "col-stt"
    // ) {
    //   e.preventDefault();
    //   return;
    // }

    e.preventDefault();
    const el = document.getElementById(`col-${colRow}`);
    const curWidth = el ? el.offsetWidth : 120;
    setResizingCol(colRow);
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

    const onUp = async () => {
      setResizingCol(null);

      setColumnWidths((currentWidths) => {
        const currentWidthsSnapshot = { ...currentWidths };

        const updatedColumns = columns.map((col) => {
          const key = col.name || col.row;
          if (currentWidthsSnapshot[key] !== undefined) {
            const newWidth = Math.max(40, currentWidthsSnapshot[key]);
            return { ...col, width: `${newWidth}px` };
          }
          return col;
        });

        // Thực hiện cập nhật server
        (async () => {
          try {
            const payload = {
              ...viewConfigTable,
              field: updatedColumns,
            };
            const idPayload = viewConfigTable._id || viewConfigTable.id;
            await dispatch(settingViewConfig({ id: idPayload, payload })).unwrap();
            toast("Cập nhật độ rộng cột thành công", "success");
          } catch (error) {
            toast("Cập nhật độ rộng cột thất bại!", "error");
          }
        })();

        return currentWidthsSnapshot; // Giữ nguyên state mới
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
    viewConfigTable,
    dispatch,
    toast,
  ]);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (propData) {
      setData(propData);
      setTotal(propData.length);
    }
  }, [propData]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [committedDateRange, setCommittedDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [selectedRow, setSelectedRow] = useState(null);
  const [actionMenuItems, setActionMenuItems] = useState([]);
  const [selectedType, setSelectedType] = useState("IMG");
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, row: null });
  const { systemParams } = useContext(AuthContext);
  // const [bulkAction, setBulkAction] = useState("");

  const theme = useTheme();
  // consider small screens as 'sm' and below; adjust if you prefer 'md'
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const open = Boolean(anchorEl);
  const handleOpenMore = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleCloseMore = useCallback(() => {
    setAnchorEl(null);
    setSelectedRow(null);
  }, []);

  useEffect(() => {
    if (systemParams?.data) {
      const paginationConfig = find(systemParams.data, { type: "pagination" });
      if (paginationConfig && paginationConfig.value) {
        const options = String(paginationConfig.value)
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0);
        if (options.length > 0) {
          setRowsPerPageOptions(options);
          if (!options.includes(rowsPerPage)) {
            setRowsPerPage(options[0]);
            setPage(0);
          }
        }
      }
    }
  }, [systemParams, rowsPerPage]);
  
  const handleDeleteConfirmOpen = useCallback((row) => {
    setDeleteConfirmDialog({ open: true, row });
  }, []);

  const handleDeleteConfirmClose = useCallback(() => {
    setDeleteConfirmDialog({ open: false, row: null });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
      const { row, isBulk } = deleteConfirmDialog; // Lấy thêm isBulk
      if (!row) return;

      try {
        if (isBulk) {
            // Xóa hàng loạt
            await onDelete(row); 
        } else {
            // Xóa từng dòng
            if (typeof onRowDelete === "function") {
              await onRowDelete(row);
            } else if (typeof onDelete === "function") {
              onDelete(isDeleteWithCode ? row.code : [row._id || row.id]);
            }
        }
        handleDeleteConfirmClose();
      } catch (error) {
        toast("Có lỗi xảy ra khi xóa", "error");
      }
  }, [deleteConfirmDialog, onRowDelete, onDelete, isDeleteWithCode, toast, handleDeleteConfirmClose]);


  const handleClick = useCallback((event, row, items = []) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);

    // Tự động thêm item xóa nếu có onRowDelete hoặc onDelete
    let finalItems = [...items];
    if ((typeof onRowDelete === "function" || typeof onDelete === "function") && !disableDelete) {
      const hasDeleteItem = finalItems.some(item => item.key === 'delete');
      if (!hasDeleteItem) {
        finalItems.push({
          key: 'delete',
          title: 'Xóa',
          icon: <DeleteOutline />,
          colorType: 'error',
          onClick: () => handleDeleteConfirmOpen(row),
        });
      }
    }

    setActionMenuItems(finalItems);
  }, [onRowDelete, onDelete, disableDelete, handleDeleteConfirmOpen]);

  useEffect(() => {
    if (reloadTable) {
      fetchTableData();
    }
  }, [reloadTable]);

  const asyncData = useCallback(async () => {
    setLoading(true);
    const maxTime = 15000;
    const retryInterval = 5000;
    const startTime = Date.now();
    let success = false;
    let lastError = null;

    while (Date.now() - startTime < maxTime && !success) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), retryInterval);

      try {
        const response = await api.get(urlAsyncData, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.data?.success) {
          setReloadTable(Date.now());
          toast(response.data.message || "Đồng bộ thành công", "success");
          success = true;
          return true;
        } else {
          lastError = new Error(
            response.data?.message || "Server trả về thất bại"
          );
          logger.error(lastError); // Log the error for debugging
          break;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (api.isCancel(error)) {
          logger.warn("Request bị hủy do timeout 5s, retry...");
        } else {
          toast("Đồng bộ thất bại, xin vui lòng thử lại sau!", "error");
          break;
        }
      } finally {
        setLoading(false);
      }
    }
    if (!success) {
      toast("Đồng bộ thất bại, xin vui lòng thử lại sau!", "error");
    }
    setLoading(false);
    return false;
  }, [urlAsyncData, toast]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedRow(null);
    setActionMenuItems([]);
  }, []);

  const createOpenActionMenuHandler = useCallback(
    (row, items) =>
      function handleOpenActionMenu(event) {
        handleClick(event, row, items);
      },
    [handleClick]
  );

  const handleDateChange = useCallback(({ startDate, endDate }) => {
    setDateRange({ startDate, endDate });
  }, []);

  const isValidDate = (date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  const getFilterParams = useCallback(() => {
    const filterParams = {};
    const query = committedSearchText;
    const matchedColumns = filter?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const validCodes = matchedColumns?.map((col) => col.code) || [];

    // Transform general search query into specific filter params
    if (query && validCodes.length > 0) {
      validCodes.forEach(c => {
        filterParams[`filter[${c}]`] = query;
      });
    }

    Object.keys(advancedFilters).forEach(key => {
      if (advancedFilters[key]) {
        if (key.includes('.')) {
          const bracketKey = key.split('.').join('][');
          filterParams[`filter[${bracketKey}]`] = advancedFilters[key];
        } else {
          filterParams[`filter[${key}]`] = advancedFilters[key];
        }
      }
    });

    return filterParams;
  }, [committedSearchText, filter, selectedColumns, advancedFilters]);

  const handleExport = useCallback(async () => {
    const matchedColumns = filter?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns?.map((col) => col.code) || [];
    const sort = orderBy
      ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
      : null;
    
    const filterParams = getFilterParams();

    try {
      if (!onExport) {
        toast("Chức năng xuất file chưa được cấu hình", "warning");
        return;
      }
      const blob = await onExport({
        page: page + 1,
        limit: rowsPerPage,
        query: searchText,
        code: codeValues,
        sort,
        startDate: committedDateRange.startDate
          ? new Date(committedDateRange.startDate).toISOString()
          : null,
        endDate: committedDateRange.endDate
          ? new Date(committedDateRange.endDate).toISOString()
          : null,
        selectedType,
        ...filterParams
      });

      if (blob) {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${fileName}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      // Export failed
    }
  }, [
    filter,
    selectedColumns,
    orderBy,
    order,
    page,
    rowsPerPage,
    searchText,
    committedDateRange,
    selectedType,
    onExport,
    fileName,
    toast,
    getFilterParams
  ]);

  const handleExportAll = useCallback(
    async (format = "excel") => {
      const sort = orderBy
        ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
        : null;

      const exportFn = onExportAll || onExport;
      const filterParams = getFilterParams();

      try {
        if (!exportFn) {
          toast("Chức năng xuất file chưa được cấu hình", "warning");
          return;
        }

        const blob = await exportFn({
          page: page + 1,
          limit: rowsPerPage,
          sort,
          startDate: committedDateRange.startDate
            ? new Date(committedDateRange.startDate).toISOString()
            : null,
          endDate: committedDateRange.endDate
            ? new Date(committedDateRange.endDate).toISOString()
            : null,
          exportType: format,
          ...filterParams
        });

        if (blob) {
          const url = window.URL.createObjectURL(new Blob([blob]));
          const link = document.createElement("a");
          link.href = url;
          const extension = format === "pdf" ? "pdf" : "xlsx";
          link.setAttribute("download", `${fileName}.${extension}`);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } catch (error) {
        // Export All failed
      }
    },
    [
      page,
      rowsPerPage,
      orderBy,
      order,
      committedDateRange,
      onExport,
      onExportAll,
      fileName,
      toast,
      getFilterParams
    ]
  );

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExportPDF = useCallback(() => {
    handleExportAll("pdf");
    handleExportClose();
  }, [handleExportAll]);

  const handleExportExcel = useCallback(() => {
    handleExportAll("excel");
    handleExportClose();
  }, [handleExportAll]);

  const fetchTableData = useCallback(
    async (query = "", code = [], sort, selectedType) => {
      const startDateValid =
        !committedDateRange.startDate ||
        isValidDate(committedDateRange.startDate);
      const endDateValid =
        !committedDateRange.endDate || isValidDate(committedDateRange.endDate);

      if (!startDateValid || !endDateValid) {
        if (committedDateRange.startDate || committedDateRange.endDate) {
          toast("Ngày không hợp lệ. Vui lòng kiểm tra lại!");
          return;
        }
      }

      if (fetchData) {
        setLoading(true);
        const validCodes = Array.isArray(code)
          ? code.filter((c) => c && c !== "parent")
          : [];
        // Format ngày theo định dạng DD-MM-YYYY
        const formatDate = (date) => {
          if (!date) return null;
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          return `${year}-${month}-${day}`;
        };

        const filterParams = {};

        // Transform general search query into specific filter params
        if (query && validCodes.length > 0) {
          validCodes.forEach(c => {
            filterParams[`filter[${c}]`] = query;
          });
        }

        Object.keys(advancedFilters).forEach(key => {
          if (advancedFilters[key]) {
            if (key.includes('.')) {
              // Handle nested keys like "documentDate.startDate" -> "filter[documentDate][startDate]"
              const bracketKey = key.split('.').join('][');
              filterParams[`filter[${bracketKey}]`] = advancedFilters[key];
            } else {
              filterParams[`filter[${key}]`] = advancedFilters[key];
            }
          }
        });

        const params = {
          page: page + 1,
          limit: rowsPerPage,
          // query, // Removed as per refactor
          // code: validCodes.length > 0 ? validCodes : undefined, // Removed as per refactor
          sort,
          processID: idList ? idList : null,
          startDate: formatDate(committedDateRange.startDate),
          endDate: formatDate(committedDateRange.endDate),
          selectedType,
          ...filterParams
        };


        fetchData(params)
          .then(async (result) => {
            let mappedData = result.data || [];
            if (mapFunction) {
              const isAsync = mapFunction.constructor.name === "AsyncFunction";
              mappedData = isAsync
                ? await Promise.all(mappedData.map(mapFunction))
                : mappedData.map(mapFunction);
            }
            setData(mappedData);
            setTotal(result.total || 0);
          })
          .catch((error) => {
            toast("Có lỗi khi gọi dữ liệu!", error);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    },
    [
      committedDateRange,
      fetchData,
      idList,
      mapFunction,
      page,
      rowsPerPage,
      toast,
      advancedFilters
    ]
  );

  useEffect(() => {
    if (fetchData) {
      let sort = null;
      if (orderBy) {
        sort = JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 });
      }
      const codeValues =
        filter
          ?.filter((col) => selectedColumns.includes(col.name))
          .map((col) => col.code) || [];

      fetchTableData(committedSearchText, codeValues, sort);
    }
  }, [
    page,
    rowsPerPage,
    fetchData,
    refreshTrigger,
    reload,
    orderBy,
    order,
    filter,
    committedSearchText,
    selectedColumns,
    fetchTableData,
    committedDateRange,
    advancedFilters,
  ]);

  const handleSearchClick = useCallback(
      // 1. Thêm codeValues vào tham số
      (query, codeValues) => {
        setPage(0);
        setCommittedDateRange(dateRange);
        setCommittedSearchText(query.trim());
        
        // 2. Truyền cả query và codeValues ra ngoài qua prop onSearch
        if (onSearch) {
          onSearch(query.trim(), codeValues); 
        }
      },
      [dateRange, onSearch]
    );
  // Cập nhật searchText khi inputValue thay đổi
  useEffect(() => {
    setSearchText(inputValue);
  }, [inputValue]);


  const handleSort = useCallback(
    (column) => {
      const isCurrentColumn = orderBy === column;
      const newOrder = isCurrentColumn
        ? order === "asc"
          ? "desc"
          : "asc"
        : "asc";

      // CẬP NHẬT STATE NỘI BỘ
      setOrder(newOrder);
      setOrderBy(column);

      if (onOrder) {
        onOrder({
          orderBy: column,
          order: newOrder,
        });
      }
    },
    [orderBy, order, onOrder]
  );
  const totalPages = Math.ceil(total / rowsPerPage);
  const rangeStart = total > 0 ? page * rowsPerPage + 1 : 0;
  const rangeEnd = total > 0 ? Math.min((page + 1) * rowsPerPage, total) : 0;

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const sanitizeAndSetSearchText = useCallback(
    (value) => {
      let normalized = value;
      // const forbiddenCharsRegex = /[~!@#$%^*,`]/;
      const forbiddenCharsRegex = /[~!@#$%^`]/; // ✅ Đã bỏ dấu * và dấu ,
      if (!disableSpecialChars) {
        normalized = normalized.replace(
          new RegExp(forbiddenCharsRegex.source, "g"),
          ""
        );
        normalized = normalized.replace(/\s\s+/g, " ");
        if (value === "" && normalized === " ") {
          normalized = "";
        }
      }
      const finalValue = clearWidthSpace(normalized);
      setSearchText(finalValue);
      setInputValue(finalValue); // Đồng bộ lại inputValue sau khi làm sạch
    },
    [disableSpecialChars]
  );

  const handleInputBlur = useCallback(
    (e) => {
      sanitizeAndSetSearchText(e.target.value);
    },
    [sanitizeAndSetSearchText]
  );

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setInputValue("");
    // ✅ Reset cả 2 state
    setDateRange({ startDate: null, endDate: null });
    setCommittedDateRange({ startDate: null, endDate: null });
    const matchedColumns = filter?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns.map((col) => col.code);
    handleSearchClick("", codeValues);
  }, [filter, selectedColumns, handleSearchClick]);


  const handleFilterToggle = useCallback(() => {
    if (!openFilter) {
      setTempSelectedColumns(selectedColumns);
    }
    setOpenFilter((prev) => !prev);
  }, [openFilter, selectedColumns]);

  const handleFilterAway = useCallback(() => {
    setOpenFilter(false);
  }, []);

  const handleColumnFilterChangeDirect = useCallback((columnName) => {
    return () => {

      setTempSelectedColumns((prev) =>
        prev.includes(columnName)
          ? prev.filter((val) => val !== columnName)
          : [...prev, columnName]
      );
    };
  }, []);

  const handleSearchButtonClick = useCallback(() => {
    const matchedColumns = filter?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns.map((col) => col.code);
    handleSearchClick(searchText, codeValues);
  }, [filter, selectedColumns, searchText, handleSearchClick]);

  const handleDateRangeChange = useCallback(
    ([startDate, endDate]) => {
      // Chuyển đổi chuỗi ngày thành đối tượng Date hoặc null
      const newStartDate = startDate ? new Date(startDate) : null;
      const newEndDate = endDate ? new Date(endDate) : null;
      handleDateChange({ startDate: newStartDate, endDate: newEndDate });
    },
    [handleDateChange]
  );

  const handleDatePickerChange = useCallback(
    async (time) => {
      const matchedColumns = filter?.filter((col) =>
        selectedColumns.includes(col.name)
      );
      const codeValues = matchedColumns?.map((col) => col.code) || [];
      const sort = orderBy
        ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
        : null;
      const iso = dayjs(time).format("DD-MM-YYYY");
      const queryParams = {
        page: page + 1,
        limit: rowsPerPage,
        query: searchText,
        code: codeValues,
        sort,
        startDate: committedDateRange.startDate
          ? new Date(committedDateRange.startDate).toISOString()
          : null,
        endDate: committedDateRange.endDate
          ? new Date(committedDateRange.endDate).toISOString()
          : null,
        selectedType,
        [customFieldOnDatePicker]: iso,
      };
      const result = await onDatePicker(queryParams);
      setData(result.data || []);
      setTotal(result.total || 0);
    },
    [
      filter,
      selectedColumns,
      orderBy,
      order,
      page,
      rowsPerPage,
      searchText,
      committedDateRange,
      selectedType,
      customFieldOnDatePicker,
      onDatePicker,
    ]
  );

  const handleTypeChange = useCallback(
    (e) => {
      setSelectedType(e.target.value);
      fetchTableData(
        searchText,
        filter
          .filter((col) => selectedColumns.includes(col.name))
          .map((col) => col.code),
        JSON.stringify({
          [defaultCodePrams ? defaultCodePrams : "updatedAt"]: -1,
        }),
        e.target.value
      );
    },
    [searchText, filter, selectedColumns, defaultCodePrams, fetchTableData]
  );

  const handlePageChange = useCallback((e, newPage) => {
    setPage(newPage - 1);
  }, []);

  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);

  const handleOpenAdvancedFilter = useCallback(() => {
    setOpenAdvancedFilter(true);
  }, []);

  const handleCloseAdvancedFilter = useCallback(() => {
    setOpenAdvancedFilter(false);
  }, []);

  // when opening the dialog, prefill selection from current selectedColumns
  useEffect(() => {
    if (openAdvancedFilter) {
      setAdvancedFilterSelection(selectedColumns[0] || "");
    }
  }, [openAdvancedFilter, selectedColumns]);

  const handleApplyAdvancedFilter = useCallback(() => {
    if (advancedFilterSelection) setSelectedColumns([advancedFilterSelection]);
    else setSelectedColumns([]);
    setOpenAdvancedFilter(false);
  }, [advancedFilterSelection, setSelectedColumns]);

  // Stable callback that uses the external helper
  const onAdvancedFilterChange = useCallback(
    (e) => advancedFilterChange(e, setAdvancedFilterSelection),
    [setAdvancedFilterSelection]
  );

const handleDeleteClick = useCallback(() => {
    setDeleteConfirmDialog({ open: true, row: selected, isBulk: true }); 
}, [selected]);

  const handleSelectAll = useCallback(
    (e) => {

      const currentDataIds = data.map((row) =>
        isDeleteWithCode ? row.code : row._id || row.id || row.documentId
      );
      const itemsToAdd = selectionReturns === "object" ? data : currentDataIds;
      if (e.target.checked) {
        const existingIds = selected.map(item => (typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item));
        const newItems = itemsToAdd.filter(itemOrId => {
          const id = typeof itemOrId === 'object' ? (isDeleteWithCode ? itemOrId.code : itemOrId._id || itemOrId.id || itemOrId.documentId) : itemOrId;
          return !existingIds.includes(id);
        });
        const newSelection = [...selected, ...newItems];
        setSelected(newSelection);
      } else {
        const newSelection = selected.filter((item) => {
          const itemId = typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item;
          return !currentDataIds.includes(itemId);
        });
        setSelected(newSelection);
      }
    },
    [data, isDeleteWithCode, selected, setSelected, selectionReturns]
  );

  const handleRowSelect = useCallback(
    (row) => {
      const idToCheck = isDeleteWithCode ? row.code : row._id || row.id || row?.documentId;
      const itemToAdd = selectionReturns === "object" ? row : idToCheck;

      const isSelected = selected.some(item => (typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item) === idToCheck);

      const newSelection = isSelected
        ? selected.filter(item => (typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item) !== idToCheck)
        : [...selected, itemToAdd];
      setSelected(newSelection);
    },
    [isDeleteWithCode, selected, setSelected, selectionReturns]
  );

  const handleEditClick = useCallback(
    (rowId) => {
      if (typeof onEdit === "function") {
        onEdit(rowId);
      }
    },
    [onEdit]
  );

  const handleViewClick = useCallback(
    (rowId) => {
      if (typeof onView === "function") {
        onView(rowId);
      }
    },
    [onView]
  );

  const handleRowDeleteClick = useCallback(
    (row) => {
      handleDeleteConfirmOpen(row);
    },
    [handleDeleteConfirmOpen]
  );

  const handlePopoverOptionClick = useCallback(
    (onClick, rowId) => {
      onClick(rowId);
      handleClose();
    },
    [handleClose]
  );

  const handlePopoverItemClick = useCallback(
    (item) => () => {
      if (item.key === 'delete') {
        handleClose(); // Đóng menu trước
        setTimeout(() => item.onClick(), 0); // Mở dialog sau khi menu đóng
      } else {
        if (item.onClick) {
          item.onClick();
        }
        handleClose();
      }
    },
    [handleClose]
  );

  // Tạo handler riêng cho từng row (dùng trong map)
  const createRowHandlers = useCallback(
    (row) => {
      const rowId = row.id || row._id;
      return {
        onEdit: () => handleEditClick(rowId || row),
        onView: () => handleViewClick(rowId || row),
        onDelete: () => handleRowDeleteClick(row),
        onPopoverClick: (e, items) => handleClick(e, row, items),
        onCheckDigit: (e, items) => handleClick(e, row, items),
        onSign: (e, items) => handleClick(e, row, items),
        onVerifyFormat: (e, items) => handleClick(e, row, items),
        onRowSelect: () => handleRowSelect(row),
      };
    },
    [
      handleEditClick,
      handleViewClick,
      handleRowDeleteClick,
      handleClick,
      handleRowSelect,
    ]
  );

  // Handler for previous page button
  function handlePrevPageClick(e) {
    handlePageChange(e, page)
  }

  // Handler for next page button
  function handleNextPageClick(e) {
    handlePageChange(e, page + 2)
  }

  const handleSelectAllColumns = (e) => {
    if (e.target.checked) {
      setTempSelectedColumns(filter?.map((col) => col.name) || []);
    } else {
      setTempSelectedColumns([]);
    }
  };

  const handleApplyFilter = () => {
      setSelectedColumns(tempSelectedColumns); 
      
      const matchedColumns = filter?.filter((col) =>
        tempSelectedColumns.includes(col.name)
      );
      const codeValues = matchedColumns.map((col) => col.code);
      handleSearchClick(searchText, codeValues);
      handleFilterAway();
  };

  const handleMenuItemClick = useCallback((action, row) => () => {
    onMoreAction(action, row);
    handleCloseMore();
  }, [onMoreAction, handleCloseMore]);


  const handleToggleFilterAdvanced = useCallback(() => {
    setOpenFilterAdvanced(prev => !prev);
  }, []);

  const handleCloseFilter = useCallback(() => {
    setOpenFilterAdvanced(false);
  }, []);


  const handleApplyFilterClick = useCallback((filters) => {
      setAdvancedFilters(filters);
      if (parentHandleApplyFilterClick) {
        parentHandleApplyFilterClick(filters);
      }
      handleCloseFilter();
      
    },[handleCloseFilter, parentHandleApplyFilterClick]);

  const handleSwitchToCalendar = useCallback(() => {
    onSwitchView('calendar');
  }, [onSwitchView]);

  const handleSwitchToList = useCallback(() => {
    onSwitchView('list');
  }, [onSwitchView]);

  return (
    <>
      <StyleBoxTittle>
        {!noneTitle && isCheckTitle && (
          currentPageTitle ? (
            <StyleTittleBox>
              <StyleTittleTyprography
                variant="h5" >
                {currentPageTitle}
              </StyleTittleTyprography>
            </StyleTittleBox>
          ) : null
        )}
        <StyledPaperWithBottomPadding
          isMobieHeight={isMobieHeight}
          isInsideDialog={isInsideDialog}
          autoHeight={autoHeight}
          fixedHeight={fixedHeight}
          customMaxHeight={customMaxHeight}
          disablePaperHeight={disablePaperHeight}
          paperPaddingBottom={paperPaddingBottom}
        >
          {!onlyTable && (
            <ToolbarWithBottomMargin>
                <ToolbarContent>
                  {!disableSearch && (
                    <>
                      {isUnifiedSearchToolbar ? (
                        <SearchBarWrapper>
                          <UnifiedSearchGroup>
                            {canShowAdvancedFilterPopup && (
                              <ClickAwayListener onClickAway={handleCloseFilter}>
                                <SearchFilterPopupAnchor>
                                  <SearchLeftFilterTrigger
                                    type="button"
                                    onClick={handleToggleFilterAdvanced}
                                  >
                                    <FilterAlt />
                                    <span>Bộ lọc</span>
                                  </SearchLeftFilterTrigger>
                                  <FilterDropdown
                                    hideTriggerButton
                                    handleToggleFilter={handleToggleFilterAdvanced}
                                    openFilter={openFilterAdvanced}
                                    handleCloseFilter={handleCloseFilter}
                                    handleApplyFilterClick={handleApplyFilterClick}
                                    advancedFilters={advancedFilters}
                                    config={advancedFilterConfig}
                                    {...restOptionsProps}
                                  />
                                </SearchFilterPopupAnchor>
                              </ClickAwayListener>
                            )}
                            <UnifiedInput
                              variant="outlined"
                              size="small"
                              placeholder={unifiedSearchPlaceholder}
                              value={inputValue}
                              onChange={handleInputChange}
                              onBlur={handleInputBlur}
                              InputProps={{
                                endAdornment: (
                                  <SearchAdornmentStack>
                                    {searchText && (
                                      <ClearIconButton
                                        type="button"
                                        onClick={handleClearSearch}
                                        title="Xóa tìm kiếm"
                                      >
                                        <StyledClearIcon />
                                      </ClearIconButton>
                                    )}
                                    {canShowSearchFilterPopup && (
                                      <ClickAwayListener onClickAway={handleFilterAway}>
                                        <TuneTriggerContainer>
                                          <TuneIconBox
                                            onClick={handleFilterToggle}
                                            title="Lọc tìm kiếm"
                                          >
                                            <TuneIcon />
                                          </TuneIconBox>
                                          {openFilter && (
                                            <FilterBox>
                                              <StyleBoxActionDropDown>
                                                <span>Lọc tìm kiếm</span>
                                                <Search />
                                              </StyleBoxActionDropDown>
                                              <StyleActionCheckBox>
                                                <FormControlLabel
                                                  control={
                                                    <Checkbox
                                                      checked={
                                                        filter?.length > 0 &&
                                                        filter.every((col) =>
                                                          tempSelectedColumns.includes(col.name)
                                                        )
                                                      }
                                                      indeterminate={
                                                        tempSelectedColumns.length > 0 &&
                                                        tempSelectedColumns.length < filter?.length
                                                      }
                                                      onChange={handleSelectAllColumns}
                                                      size="small"
                                                    />
                                                  }
                                                  label="Tất cả"
                                                />
                                              </StyleActionCheckBox>
                                              <StyleActionCellCheckBox>
                                                {filter?.map((column) => (
                                                  <FormControlLabel
                                                    key={column.code}
                                                    control={
                                                      <Checkbox
                                                        checked={tempSelectedColumns.includes(column.name)}
                                                        onChange={handleColumnFilterChangeDirect(column.name)}
                                                        size="small"
                                                      />
                                                    }
                                                    label={column.name}
                                                  />
                                                ))}
                                              </StyleActionCellCheckBox>
                                              <StyleActionButton>
                                                <StyleActionButtonCancel onClick={handleFilterAway}>
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
                                        </TuneTriggerContainer>
                                      </ClickAwayListener>
                                    )}
                                  </SearchAdornmentStack>
                                ),
                              }}
                            />
                          </UnifiedSearchGroup>
                          <UnifiedSearchButton
                            variant="contained"
                            onClick={handleSearchButtonClick}
                          >
                            <Tooltip title="Tìm kiếm">
                              <Search />
                            </Tooltip>
                          </UnifiedSearchButton>
                        </SearchBarWrapper>
                      ) : (
                      <>
                      <SearchContainer>
                  <StyledSearchField
                    variant="outlined"
                    size="small"
                    placeholder="Tìm kiếm..."
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    InputProps={{
                      endAdornment: (
                        <SearchAdornment>
                          {searchText && (
                            <IconButton
                              aria-label="clear search"
                              onClick={handleClearSearch}
                              edge="end"
                              size="small"
                            >
                              <StyledClearIcon />
                            </IconButton>
                          )}
                        </SearchAdornment>
                      ),
                    }}
                  />
                  <ClickAwayListener onClickAway={handleFilterAway}>
                    <Box>
                      <StyledFilterButton onClick={handleFilterToggle}>
                        <TuneIcon />
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
                                  checked={
                                    filter?.length > 0 &&
                                    filter.every((col) =>
                                      tempSelectedColumns.includes(col.name)
                                    )
                                  }
                                  indeterminate={
                                    tempSelectedColumns.length > 0 &&
                                    tempSelectedColumns.length < filter?.length
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
                                    onChange={handleColumnFilterChangeDirect(column.name)}
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
                              onClick={handleFilterAway}
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

                  {/* Ô tìm kiếm ngày tháng đơn */}
                  {anableDatePicker && !isSmallScreen ? (
                    <DatePickerBox>
                      <DatePicker
                        onChange={handleDatePickerChange}
                        format="DD/MM/YYYY"
                        slotProps={{
                          textField: {
                            size: "small",
                            placeholder: "Thời gian kiểm tra",
                          },
                        }}
                      />
                    </DatePickerBox>
                  ) : null}
                </SearchContainer>

                {/* Ô tìm kiếm từ ngày đến ngày */}
                {anableDateRangePicker && !isSmallScreen ? (
                  <DatePickerGrid>
                    <ThemedDateRangePicker>
                      <CustomDateRangePicker
                        start={dateRange.startDate}
                        end={dateRange.endDate}
                        onChange={handleDateRangeChange}
                      />
                    </ThemedDateRangePicker>
                  </DatePickerGrid>
                ) : null}
                <StyledSearchButton
                  variant="contained"
                  onClick={handleSearchButtonClick}
                >
                  <Tooltip title="Tìm kiếm">
                    <Search />
                  </Tooltip>
                </StyledSearchButton>
                </>
                )}
              </>
                   )}

                {disableBL && (
                  <StyledButton
                    variant="contained"
                    onClick={handleOpenAdvancedFilter}
                  >
                    <Tooltip title="Bộ lọc">
                      <Dehaze />
                    </Tooltip>
                  </StyledButton>
                )}

                {showReportSelect && (
                  <ReportSelectBox>
                    <CustomInput
                      select
                      size="small"
                      placeholder="Chọn loại báo cáo..."
                      value={reportValue}
                      onChange={onReportChange}
                      options={reportOptions || []}
                      customLabel="label"
                      customValue="value"
                      disableClear={disableClearReport}
                    />
                  </ReportSelectBox>
                )}

                {
                  filtersAdvanced && !isUnifiedSearchToolbar &&
                  <FilterDropdown
                    handleToggleFilter={handleToggleFilterAdvanced}
                    openFilter={openFilterAdvanced}
                    handleCloseFilter={handleCloseFilter}
                    handleApplyFilterClick={handleApplyFilterClick}
                    advancedFilters={advancedFilters}
                    config={advancedFilterConfig}
                    {...restOptionsProps}
                  />
                }
 
                {!isSmallScreen && moreSearch && (
                  <MoreSearchBox>{moreSearch()}</MoreSearchBox>
                )}
                {isRadio && (
                  <RadioBox>
                    <FormControl component="fieldset">
                      <RadioGroup
                        row
                        value={selectedType}
                        onChange={handleTypeChange}
                      >
                        <FormControlLabel
                          value="IMG"
                          control={<StyledRadio value="IMG" />}
                          label="Ảnh"
                        />
                        <FormControlLabel
                          value="PDF"
                          control={<StyledRadio value="PDF" />}
                          label="PDF"
                        />
                      </RadioGroup>
                    </FormControl>
                  </RadioBox>
                )}
              </ToolbarContent>

            <ActionsContainer
                  styleJustifyContent={isSmallScreen ? "flex-end" : "flex-end"}
                >
                  <ActionsBox>
                    {selected.length > 0 && isSmallScreen ? (
                      <StyleBoxActionsRespon>
                        {/* <StyleFormControl size="small">
										<Select
											displayEmpty
											value={bulkAction}
											onChange={handleBulkAction}
											renderValue={(v) => (v ? v : "Thao tác hàng loạt")}
										>
											<MenuItem value="" disabled>
												Thao tác hàng loạt
											</MenuItem>
											<MenuItem value="approve">Duyệt</MenuItem>
											<MenuItem value="process">Đề xuất xử lý</MenuItem>
											<MenuItem value="transfer">Chuyển xử lý</MenuItem>
											<MenuItem value="return">Trả lại</MenuItem>
											<MenuItem value="save">Lưu sổ</MenuItem>
										</Select>
									</StyleFormControl> */}
                      {!disableDeletePQ && selected.length > 0 &&
                        (showCustomDeleteButton ? (
                          <DeleteStyledButton
                            variant="contained"
                            onClick={handleDeleteClick}
                          >
                            <Tooltip title="Xóa">
                              <DeleteOutline />
                            </Tooltip>
                          </DeleteStyledButton>
                        ) : (
                          !disableCheckbox && (
                            <DeleteSelectedButton
                              onClick={handleDeleteClick}
                            >
                              <Tooltip title="Xóa">
                                <DeleteOutline />
                              </Tooltip>
                            </DeleteSelectedButton>
                          )
                        ))}
                        {disableAdds && (
                          <AddTextButton
                              variant="contained"
                              onClick={onAdd}
                              startIcon={<Add />}
                            >
                              {"Thêm mới"}
                            </AddTextButton>
                        )}

                        {renderCustomActions && renderCustomActions(selected)}

                        {!disableAdd &&
                          (permissionsForModule === null ||
                            permissionsForModule === "all" ||
                            permissionsForModule.includes("add")) && (
                            <AddTextButton
                              variant="contained"
                              onClick={onAdd}
                              startIcon={<Add />}
                            >
                              {"Thêm mới"}
                            </AddTextButton>
                          )}
                      </StyleBoxActionsRespon>
                    ) : (
                      <>
                        {!disableDeletePQ && selected.length > 0 &&
                          (showCustomDeleteButton ? (
                            <DeleteStyledButton
                              variant="contained"
                              onClick={handleDeleteClick}
                            >
                              <Tooltip title="Xóa">
                                <DeleteOutline />
                              </Tooltip>
                            </DeleteStyledButton>
                          ) : (
                            !disableCheckbox && (
                              <DeleteSelectedButton
                                onClick={handleDeleteClick}
                              >
                                <Tooltip title="Xóa">
                                  <DeleteOutline />
                                </Tooltip>
                              </DeleteSelectedButton>
                            )
                          ))}
                        {disableAdds && (
                          <AddTextButton
                              variant="contained"
                              onClick={onAdd}
                              startIcon={<Add />}
                            >
                              {"Thêm mới"}
                            </AddTextButton>
                        )}

                        {renderCustomActions && renderCustomActions(selected)}

                                                {isExport && (
                          <ExportButton variant="contained" onClick={handleExport}>
                            <Tooltip title="Xuất file">
                              <DownloadIconSmall />
                            </Tooltip>
                          </ExportButton>
                        )}

                        {isExportAll && (
                          <>
                            <ExportButton
                              variant="contained"
                              onClick={handleExportClick}
                            >
                              <Tooltip title="Xuất file">
                                <DownloadIconSmall />
                              </Tooltip>
                            </ExportButton>
                            <Menu
                              anchorEl={exportAnchorEl}
                              open={openExportMenu}
                              onClose={handleExportClose}
                              anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                              }}
                              transformOrigin={{
                                vertical: "top",
                                horizontal: "right",
                              }}
                            >
                              <MenuItem onClick={handleExportExcel}>
                                <ListItemText primary="Xuất Excel" />
                              </MenuItem>
                              <MenuItem onClick={handleExportPDF}>
                                <ListItemText primary="Xuất PDF" />
                              </MenuItem>
                            </Menu>
                          </>
                        )}

                        {onImport && (
                          <StyledButton variant="contained" onClick={onImport}>
                            <Tooltip title="Nhập file">
                              {importIcon ? importIcon : <UploadIcon />}
                            </Tooltip>
                          </StyledButton>
                        )}

                        {!disableAdd &&
                          (permissionsForModule === null ||
                            permissionsForModule === "all" ||
                            permissionsForModule.includes("add")) && (
                            <AddTextButton
                              variant="contained"
                              onClick={onAdd}
                              startIcon={<Add />}
                            >
                              {"Thêm mới"}
                            </AddTextButton>
                          )}

                        {editGroupUnit && (
                          <StyledButton variant="contained" onClick={onEdit}>
                            <Tooltip title="Cập nhật">
                              <Edit />
                            </Tooltip>
                          </StyledButton>
                        )}

                        {!disableSynchronize && (
                          <StyledButton variant="contained" onClick={asyncData}>
                            <Tooltip title="Đồng bộ">
                              <LoopOutlined />
                            </Tooltip>
                          </StyledButton>
                        )}
                        {isSetting && (
                          <StyledButton variant="contained" onClick={handleOpenConfig}>
                            <Tooltip title="Cấu hình">
                              <SettingsIcon />
                            </Tooltip>
                          </StyledButton>
                        )}
                        {onSyncUser && (
                          <StyledButton variant="contained" onClick={onSyncUser}>
                            <Tooltip title="Đồng bộ người dùng">
                              <LoopOutlined />
                            </Tooltip>
                          </StyledButton>
                        )}

                        {onSwitchView && (
                          <ViewSwitchContainer>
                            <Tooltip title="Dạng lịch">
                              <ViewSwitchButton 
                                active={viewMode === 'calendar'} 
                                onClick={handleSwitchToCalendar}
                              >
                                <CalendarToday />
                              </ViewSwitchButton>
                            </Tooltip>
                            <Tooltip title="Dạng danh sách">
                              <ViewSwitchButton 
                                active={viewMode === 'list'} 
                                onClick={handleSwitchToList}
                              >
                                <ListAltIcon />
                              </ViewSwitchButton>
                            </Tooltip>
                          </ViewSwitchContainer>
                        )}

                        {moreActions && moreActions()}
                      </>
                    )}
                  </ActionsBox>
                </ActionsContainer>
            </ToolbarWithBottomMargin>
          )}

          {extraContentBelowSearch && (
            <ExtraContentBox>{extraContentBelowSearch}</ExtraContentBox>
          )}

          <StyledTableContainer isMaxHeight={isMaxHeight} customMaxHeight={customMaxHeight}>
            <StyledTableWithGridBorder
              styleBorderCollapse={fullGridBorder ? "collapse" : undefined}
              styleBorder={fullGridBorder ? `1px solid ${theme.palette.divider}` : undefined}
              fullGridBorder={fullGridBorder}
            >
              <StyledTableHead>
                <StyledTableRow>
                  {disableCheckbox ? (
                    // <STTHeaderCell id="col-checkbox">STT</STTHeaderCell>
                    <STTHeaderCell>STT</STTHeaderCell>
                  ) : (
                    //  <CheckboxHeaderCell id="col-checkbox">
                    <CheckboxHeaderCell>
                      {!disableSelectAll && (
                        <StyledCheckbox
                          indeterminate={
                            data?.length > 0 &&
                            data.some((row) => {
                              const rowId = isDeleteWithCode ? row.code : row._id || row.id || row.documentId;
                              return selected.some(item => {
                                const itemId = typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item;
                                return itemId === rowId;
                              });
                            }) &&
                            !data.every((row) => {
                              const rowId = isDeleteWithCode ? row.code : row._id || row.id || row.documentId;
                              return selected.some(item => {
                                const itemId = typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item;
                                return itemId === rowId;
                              });
                            })
                          }
                          checked={
                            data?.length > 0 &&
                            data.every((row) => {
                              const rowId = isDeleteWithCode ? row.code : row._id || row.id || row.documentId;
                              return selected.some(item => {
                                const itemId = typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item;
                                return itemId === rowId;
                              });
                            })
                          }
                          onChange={handleSelectAll}
                        />
                      )}
                    </CheckboxHeaderCell>
                  )}
                  {/* {anableSTT && <STTHeaderCell id="col-stt">STT</STTHeaderCell>} */}
                  {anableSTT && <STTHeaderCell>STT</STTHeaderCell>}
                  {columns.map((column, idx) => {
                    if (column.isShow === false) return null;
                    const handlers = {
                      onDragStart: (e) => handleDragStart(e, idx),
                      onDragOver: handleDragOver,
                      onDrop: (e) => handleDrop(e, idx), // Giữ nguyên logic kéo thả
                      onSort: () => handleSort(column.row || column.name), // Ưu tiên 'row' cho việc sắp xếp
                      // onResize: (e) => handleMouseDownResize(e, column.row),
                      onResize: (e) =>
                        handleMouseDownResize(e, column.name || column.row),
                    };
                    return (
                      <StyledTableCell
                        key={column.name || column.row}
                        id={`col-${column.name || column.row}`}
                        draggable
                        onDragStart={handlers.onDragStart}
                        onDragOver={handlers.onDragOver}
                        onDrop={handlers.onDrop}
                        onClick={handlers.onSort}
                        // style={getColumnStyle(column, columnWidths)}
                        styleWidth={
                          columnWidths[column.name || column.row]
                            ? `${columnWidths[column.name || column.row]}px`
                            : column.width
                        }
                        styleMinWidth={
                          columnWidths[column.name || column.row]
                            ? `${columnWidths[column.name || column.row]}px`
                            : column.width
                        }
                        styleMaxWidth={
                          columnWidths[column.name || column.row]
                            ? `${columnWidths[column.name || column.row]}px`
                            : column.width
                        }
                      >
                        <HeaderCellContainer align={column.align}>
                          {column.label || column.title || column.name}
                          <SortIconContainer>
                            <StyledArrowUp
                              isActive={
                                orderBy === (column.name || column.row) &&
                                order === "asc"
                              }
                            />
                            <StyledArrowDown
                              isActive={
                                orderBy === (column.name || column.row) &&
                                order === "desc"
                              }
                            />
                          </SortIconContainer>
                        </HeaderCellContainer>
                        {!hideHeaderColumnResizer && (
                          <ColumnResizer onMouseDown={handlers.onResize} />
                        )}
                      </StyledTableCell>
                    );
                  })}
                  {!disableAct && (
                    // <StyledTableCellActions
                    //   isAction={!disableAct}
                    //   id="col-actions"
                    // >
                    //   {!isSmallScreen && <span>Hành động</span>}
                    // </StyledTableCellActions>
                    <StyledTableCellActions isAction={!disableAct}>
                      {!isSmallScreen && <span>Hành động</span>}
                    </StyledTableCellActions>
                  )}
                </StyledTableRow>
              </StyledTableHead>

              <TableBody>
                {data.length === 0 ? (
                  <StyledTableRow>
                    <StyledTableCell
                    styleTextAlign
                      colSpan={
                        disableCheckbox
                          ? columns.filter((c) => c.isShow !== false).length +
                            (anableSTT ? 2 : 1)
                          : anableSTT
                          ? columns.filter((c) => c.isShow !== false).length + 3
                          : columns.filter((c) => c.isShow !== false).length + 2
                      }
                      align="center"
                    >
                      Không có dữ liệu
                    </StyledTableCell>
                  </StyledTableRow>
                ) : (
                  data.map((row, index) => {
                    const handlers = createRowHandlers(row);

                    return (
                      <StyledTableRow
                        key={row._id}
                        index={index}
                      // className="CustomCss"
                      >
                        {disableCheckbox ? (
                          <StyledTableCell>
                            {page * rowsPerPage + index + 1}
                          </StyledTableCell>
                        ) : (
                          // <CheckboxBodyCell index={index}>
                          <CheckboxHeaderCell>
                            <StyledCheckbox
                              checked={selected.some((item) => {
                                const itemId = typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item;
                                const currentRowId = isDeleteWithCode ? row.code : row._id || row.id || row.documentId;
                                return itemId === currentRowId;
                              })}
                              onChange={handlers.onRowSelect}
                            />
                            {/* </CheckboxBodyCell> */}
                          </CheckboxHeaderCell>
                        )}
                        {anableSTT && (
                          // <STTBodyCell index={index}>
                          //   {page * rowsPerPage + index + 1}
                          // </STTBodyCell>
                          <StyledTableCell>
                            {page * rowsPerPage + index + 1}
                          </StyledTableCell>
                        )}

                        {columns.map((column) => {
                          if (column.isShow === false) return null;
                          const cellValue = column.render
                            ? column.render(row)
                            : (column.accessor
                              ? column.accessor(row)
                              : row[column.row || column.name]);
                          let displayValue = "";
                          let isHtml = false;

                          if (Array.isArray(cellValue)) {
                            if (
                              cellValue.length > 0 &&
                              typeof cellValue[0] === "object" &&
                              cellValue[0]?.name
                            ) {
                              displayValue = cellValue
                                .map((v) => v.name)
                                .join(", ");
                            } else {
                              displayValue = cellValue.join(", ");
                            }
                          } else if (
                            typeof cellValue === "object" &&
                            cellValue !== null
                          ) {
                            // ✅ Sửa lỗi: Kiểm tra xem có phải là một React element không
                            if (React.isValidElement(cellValue)) {
                              displayValue = cellValue; // Render trực tiếp React element
                            } else {
                              // Nếu vẫn là object, hiển thị tên hoặc một chuỗi an toàn, tránh JSON.stringify
                              displayValue = cellValue.name || "[Object]";
                            }
                          } else {
                            // Convert to string and check for HTML
                            const stringValue = cellValue != null ? String(cellValue) : "";
                            // Check if string contains HTML tags
                            if (typeof stringValue === 'string' && /<[^>]+>/.test(stringValue)) {
                              displayValue = stringValue;
                              isHtml = true;
                            } else {
                              displayValue = stringValue;
                            }
                          }

                          return (
                            <StyledTableCell
                              key={column.name || column.row}
                              align={column.align}
                              // style={getColumnStyle(column, columnWidths)}
                              styleWidth={
                                columnWidths[column.name || column.row]
                                  ? `${columnWidths[column.name || column.row]}px`
                                  : column.width
                              }
                              styleMinWidth={
                                columnWidths[column.name || column.row]
                                  ? `${columnWidths[column.name || column.row]}px`
                                  : column.width
                              }
                              styleMaxWidth={
                                columnWidths[column.name || column.row]
                                  ? `${columnWidths[column.name || column.row]}px`
                                  : column.width
                              }
                            >
                              {isHtml && typeof displayValue === 'string' ? (
                                <div dangerouslySetInnerHTML={{ __html: encodeHTML(displayValue) }} />
                              ) : (
                                displayValue
                              )}
                            </StyledTableCell>
                          );
                        })}

                        {!disableAct && (
                          <StyledTableCellActions
                            index={index}
                            isAction={!disableAct}
                          >
                            {/* Build action items so we can render them inline on large screens or inside popover on small screens */}
                            {(() => {
                              const items = [];

                              // ✅ Ưu tiên render các actions được truyền từ props
                              if (enableMoreActions) {
                                items.push({
                                  key: "more",
                                  title: "Thao tác khác",
                                  icon: <StyledMenuIcon />,
                                  // icon: <MoreVert />,
                                  onClick: (e) => handleOpenMore(e, row),
                                });
                              } else if (actions && actions.length > 0) {
                                actions.forEach((action) => {
                                  items.push({
                                    key: action.id,
                                    title: action.config.displayName,
                                    icon: action.config.icon ? (
                                      action.config.icon
                                    ) : (
                                      <DeleteOutline />
                                    ), // Giả sử chỉ có icon xóa
                                    onClick: () => onAction(action, row),
                                    colorType: action.config.color,
                                  });
                                });
                              }

                              // Nếu không có prop `actions`, render các nút mặc định
                              else {
                                if (
                                  !disableEdit &&
                                  (permissionsForModule === null ||
                                    permissionsForModule === "all" ||
                                    permissionsForModule.includes("edit"))
                                ) {
                                  items.push({
                                    key: "edit",
                                    title: "Cập nhật",
                                    icon: <EditOutlined />,
                                    onClick: () =>
                                      handleEditClick(row.id || row._id || row),
                                  });
                                }

                                if (disableCheckthedigits) {
                                  items.push({
                                    key: "checkdigits",
                                    title: "Kiểm tra chữ ký số",
                                    icon: <RoomPreferencesIcon />,
                                    onClick: (e) => handleClick(e, row),
                                  });
                                }

                                if (disableDigital) {
                                  items.push({
                                    key: "digit",
                                    title: "Ký số",
                                    icon: <SaveAsIcon />,
                                    onClick: (e) => handleClick(e, row),
                                  });
                                }

                                if (Signed) {
                                  items.push({
                                    key: "signed",
                                    title: "Kiểm tra định dạng",
                                    icon: <TaskIcon />,
                                    onClick: (e) => handleClick(e, row),
                                  });
                                }

                                if (
                                  !disableDetail &&
                                  (permissionsForModule === null ||
                                    permissionsForModule === "all" ||
                                    permissionsForModule.includes("view"))
                                ) {
                                  items.push({
                                    key: "view",
                                    title: "Xem chi tiết",
                                    icon: <RemoveRedEyeOutlined />,
                                    onClick: () =>
                                      handleViewClick(row._id || row.id || row),
                                  });
                                }
                                if (
                                  !disableDelete &&
                                  (typeof onRowDelete === "function" ||
                                    typeof onDelete === "function") &&
                                  (permissionsForModule === null ||
                                    permissionsForModule === "all" ||
                                    permissionsForModule.includes("delete"))
                                ) {
                                  items.push({
                                    key: "delete",
                                    title: "Xóa",
                                    icon: <DeleteOutlineOutlined />,
                                    onClick: () => handleRowDeleteClick(row),
                                    colorType: "error",
                                  });
                                }

                                // append optionMore custom items
                                if (optionMore?.length > 0) {
                                  optionMore.forEach((it, i) => {
                                    items.push({
                                      key: `opt-${i}`,
                                      title: it.title,
                                      icon: it.icon
                                        ? React.createElement(it.icon)
                                        : undefined,
                                      onClick: () =>
                                        handlePopoverOptionClick(
                                          it.onClick,
                                          row._id
                                        ),
                                    });
                                  });
                                }
                              }

                              // default password/lock options if no custom options
                              // if (!optionMore?.length) {
                              //   // items.push({
                              //   //   key: "reset",
                              //   //   title: "Đổi mật khẩu",
                              //   //   icon: <VpnKey />,
                              //   //   onClick: () => handleResetPassword(rowId),
                              //   // });
                              //   if (row.canBlock) {
                              //     items.push({
                              //       key: "block",
                              //       title: "Khóa người dùng",
                              //       icon: <Lock />,
                              //       onClick: () => handleResetPassword(rowId),
                              //     });
                              //   }
                              //   if (row.canUblock) {
                              //     items.push({
                              //       key: "unblock",
                              //       title: "Mở khóa người dùng",
                              //       icon: <LockOpen />,
                              //       onClick: handleUnlockUser,
                              //     });
                              //   }
                              // }

                              const onOpenActionMenu = createOpenActionMenuHandler(row, items);

                              return (
                                <>
                                  {items.length > 0 && (
                                    <Tooltip title="Thao tác">
                                      <ActionIconButton
                                        disableRipple
                                        disableFocusRipple
                                        onClick={onOpenActionMenu}
                                      >
                                        <StyledMenuIcon />
                                      </ActionIconButton>
                                    </Tooltip>
                                  )}
                                </>
                              );
                            })()}
                          </StyledTableCellActions>
                        )}
                      </StyledTableRow>
                    );
                  })
                )}
              </TableBody>
            </StyledTableWithGridBorder>
          </StyledTableContainer>

          {(!onlyTable || paginationProps) && (
            <ActionsContainer
              styleJustifyContent={isSmallScreen ? "flex-end" : "flex-end"}
              $isModern
            >
              {(!isSmallScreen || paginationProps) && (
                // <PaginationContainer>
                //   <span>Tổng {total} trên</span>
                //   <span>{`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, total)} bản ghi`}</span>
                //   <PaginationStack>
                //     <StyledPagination
                //       count={totalPages}
                //       page={page + 1}
                //       onChange={handlePageChange}
                //       shape="rounded"
                //       variant="outlined"
                //       siblingCount={1}
                //       boundaryCount={1}
                //       // showFirstButton={false}
                //       // showLastButton={false}
                //       showFirstButton
                //       showLastButton
                //     />
                //   </PaginationStack>

                //   <RowsPerPageBox>
                //     {!isSmallScreen && <span>Hiển thị</span>}
                //     <RowsPerPageSelect
                //       value={rowsPerPage}
                //       onChange={handleRowsPerPageChange}
                //       size="small"
                //     >
                //       {rowsPerPageOptions.map((option) => (
                //         <MenuItem key={option} value={option}>
                //           {option}
                //         </MenuItem>
                //       ))}
                //     </RowsPerPageSelect>
                //   </RowsPerPageBox>
                // </PaginationContainer>
                <PaginationWrapper>
                  <PaginationContainerStyled>
                    <PaginationInfoBox>
                      <span>
                        Tổng <strong>{total}</strong> <strong>{rangeStart}-{rangeEnd}</strong> bản ghi
                      </span>

                      <StyleDropDown>
                        <span>hiển thị&nbsp;</span>
                        <RowsPerPageSelect
                          value={rowsPerPage}
                          onChange={handleRowsPerPageChange}
                          size="small"
                        >
                          {rowsPerPageOptions.map(function (option) {
                            return (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            );
                          })}
                        </RowsPerPageSelect>
                      </StyleDropDown>
                    </PaginationInfoBox>

                    <PaginationControlsBox>
                      <IconButton
                        size="small"
                        onClick={handlePrevPageClick}
                        disabled={page === 0}
                      >
                        <StyleIcon />
                      </IconButton>

                      <StyleActionPage>
                        {generatePaginationPages(page, totalPages, handlePageChange)}
                      </StyleActionPage>

                      <IconButton
                        size="small"
                        onClick={handleNextPageClick}
                        disabled={page >= totalPages - 1}
                      >
                        <StyleIconArrow />
                      </IconButton>
                    </PaginationControlsBox>
                  </PaginationContainerStyled>
                </PaginationWrapper>
              )}
            </ActionsContainer>
          )}

          <CustomDialog
            open={openAdvancedFilter}
            onClose={handleCloseAdvancedFilter}
            title="BỘ LỌC NÂNG CAO"
            onSave={handleApplyAdvancedFilter}
            disableSave={false}
            size="sm"
            disabledClose={false}
          >
            <AdvancedFilterWrapper>
              <CustomInput
                select
                size="small"
                placeholder="Chọn trường..."
                value={advancedFilterSelection}
                onChange={onAdvancedFilterChange}
                options={
                  filter?.map((col) => ({
                    label: col.name,
                    value: col.name,
                    code: col.code,
                  })) || []
                }
                customLabel="label"
                customValue="value"
                fullWidth
              />
            </AdvancedFilterWrapper>
          </CustomDialog>
          {children}
          {!onlyTable && isSmallScreen && (
            <ActionsContainerFooter>
              <PaginationContainer>
                {/* <span>{total}</span>
							<span>{`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, total)}`}</span> */}
                <PaginationStack>
                  <StyledPagination
                    count={totalPages}
                    page={page + 1}
                    onChange={handlePageChange}
                    shape="rounded"
                    variant="outlined"
                    siblingCount={0}
                    boundaryCount={1}
                    showFirstButton={false}
                    showLastButton={false}
                  // siblingCount={0}
                  // boundaryCount={0}
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
        </StyledPaperWithBottomPadding>
      </StyleBoxTittle>

      {loading && (
        <Dialog open>
          <LoadingDialogTitle>
            <LoadingTypography>
              Đang tải dữ liệu, xin vui lòng chờ...
            </LoadingTypography>
          </LoadingDialogTitle>
        </Dialog>
      )}
      <CustomDialog 
        open={deleteConfirmDialog.open} 
        onClose={handleDeleteConfirmClose}
      title="Xác nhận xóa lịch trực"
      onSave={handleDeleteConfirm}
      disableSave={false}
      size="sm"
      disabledClose={false}
      titleButton="Xác nhận"
      >     
    
          <StyledMessage variant="body1">
            {deleteConfirmDialog.isBulk 
              ? `Bạn có chắc chắn muốn xóa ${deleteConfirmDialog.row.length} lịch trực đã chọn không?` 
              : `Xác nhận xóa lịch trực tuần "${deleteConfirmDialog.row?.weekName || ''}" năm "${deleteConfirmDialog.row?.year || ''}"`}
          </StyledMessage>
      </CustomDialog>
      <Menu
        anchorEl={anchorEl}
        open={open && actionMenuItems.length === 0}
        onClose={handleCloseMore}
      >
        {moreActions && Array.isArray(moreActions) && moreActions.map((action) => (
          <MenuItem
            key={action.id}
            // onClick={() => {
            // 	onMoreAction(action, selectedRow);
            // 	handleCloseMore();
            // }}
            onClick={handleMenuItemClick(action, selectedRow)}
          >
            {action?.icon && (
              <StyledListItemIcon
                styledColor={action.color === 'error' ? 'error' : 'inherit'}
              >
                {action?.icon}
              </StyledListItemIcon>
            )}
            <ListItemText>{action?.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && actionMenuItems.length > 0}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        keepMounted
        MenuListProps={{
          onClick: (e) => e.stopPropagation(),
          onMouseDown: (e) => e.stopPropagation(),
          sx: {
            py: 1,
          },
        }}
        PaperProps={{
          onClick: (e) => e.stopPropagation(),
          onMouseDown: (e) => e.stopPropagation(),
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 2,
            boxShadow: "0px 8px 24px rgba(0,0,0,0.18)",
            overflow: "hidden",
          },
        }}
      >
        {actionMenuItems.map((it) => (
          <StyledMenuItem
            key={it.key}
            onClick={handlePopoverItemClick(it)}
            error={it.colorType === "error"}
          >
            {it.icon && (
              <StyledListItemIcon
                styledColor={it.colorType === "error" ? "error" : "inherit"}
              >
                {it.icon}
              </StyledListItemIcon>
            )}
            <ListItemText>{it.title}</ListItemText>
          </StyledMenuItem>
        ))}
      </Menu>

       <Popover
        open={Boolean(configAnchorEl)}
        anchorEl={configAnchorEl}
        onClose={handleCloseConfigDialog}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          style: { 
            borderRadius: '16px', 
            boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.16)', 
            border: '1px solid #e0e0e0',
            backgroundColor: '#fff'
          }
        }}
      >
        <StyledPopoverPaper>
          <PopoverHeader>
            <PopoverTitle variant="h6">Cấu hình bảng</PopoverTitle>
            <ConfigHeaderIcon />
          </PopoverHeader>
          <PopoverContent>
            <ConfigSection>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempColumnsLocal.every(c => c.isShow !== false)}
                    indeterminate={tempColumnsLocal.some(c => c.isShow === false) && tempColumnsLocal.some(c => c.isShow !== false)}
                    onChange={handleSelectAllColumnsLocal}
                  />
                }
                label={<AllCheckBoxLabel>Tất cả</AllCheckBoxLabel>}
              />
            </ConfigSection>
            <ConfigGrid container spacing={1}>
              {tempColumnsLocal.map((col, idx) => (
                <Grid item xs={12} sm={4} key={col.row || col.name || idx}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={col.isShow !== false}
                        name={String(idx)}
                        onChange={handleToggleColumn}
                      />
                    }
                    label={<ColumnLabel variant="body2">{col.label || col.title || col.name}</ColumnLabel>}
                  />
                </Grid>
              ))}
            </ConfigGrid>
          </PopoverContent>
          <PopoverActions>
            <CancelButton onClick={handleCloseConfigDialog}>
              Hủy
            </CancelButton>
            <ApplyButton onClick={handleApplyConfig}>
              Áp dụng
            </ApplyButton>
          </PopoverActions>
        </StyledPopoverPaper>
      </Popover>
    </>
  );
};

CustomTable.propTypes = {
  moreActions: PropTypes.array,
  moreSearch: PropTypes.func,
  optionMore: PropTypes.func,
  children: PropTypes.node,
  fetchData: PropTypes.func,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  onRowDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onView: PropTypes.func,
  onResetPassword: PropTypes.func,
  onLockUser: PropTypes.func,
  onUnLockUser: PropTypes.func,
  reload: PropTypes.string,
  disableCheckbox: PropTypes.bool,
  disableDigital: PropTypes.bool,
  Signed: PropTypes.bool,
  disableCheckthedigits: PropTypes.bool,
  disableEdit: PropTypes.bool,
  disableDetail: PropTypes.bool,
  disableDelete: PropTypes.bool,
  disableDeletePQ: PropTypes.bool,
  disableMore: PropTypes.bool,
  disableAdd: PropTypes.bool,
  disableAdds: PropTypes.bool,
  disableBL: PropTypes.bool,
  wrapContent: PropTypes.bool,
  disableAct: PropTypes.bool,
  disableSynchronize: PropTypes.bool,
  editGroupUnit: PropTypes.bool,
  isRadio: PropTypes.bool,
  isExport: PropTypes.bool,
  onExport: PropTypes.func,
  fileName: PropTypes.string,
  defaultCodePrams: PropTypes.string,
  disableSpecialChars: PropTypes.bool,
  refreshTrigger: PropTypes.number,
  anableDateRangePicker: PropTypes.bool,
  anableDatePicker: PropTypes.bool,
  customFieldOnDatePicker: PropTypes.string,
  idList: PropTypes.string,
  onDatePicker: PropTypes.func,
  anableSTT: PropTypes.bool,
  alwaysShowDeleteButton: PropTypes.bool,
  onlyTable: PropTypes.bool,
  mapFunction: PropTypes.func,
  codeModule: PropTypes.string,
  isDeleteWithCode: PropTypes.bool,
  extraContentBelowSearch: PropTypes.node,
  showCustomDeleteButton: PropTypes.bool,
  selection: PropTypes.array,
  onSelectionChange: PropTypes.func,
  defaultSort: PropTypes.string,
  disableDefaultSort: PropTypes.bool,
  onImport: PropTypes.func,
  onSyncUser: PropTypes.func,
  urlAsyncData: PropTypes.string,
  renderCustomActions: PropTypes.func,
  actions: PropTypes.array,
  onAction: PropTypes.func,
  data: PropTypes.array,
  onApproveProposal: PropTypes.func, // New propType
  onProcessProposal: PropTypes.func, // New propType
  onTransferProcessing: PropTypes.func, // New propType
  onReturnDocument: PropTypes.func, // New propType
  onSaveBook: PropTypes.func, // New propType
  onOrder: PropTypes.func,
  isSetting: PropTypes.bool,
  onSetting: PropTypes.func,
  noneTitle: PropTypes.bool,
  enableMoreActions: PropTypes.bool,
  currentPageTitle: PropTypes.string,
  disablePaperHeight: PropTypes.bool,
  paperPaddingBottom: PropTypes.number,
  hideHeaderColumnResizer: PropTypes.bool,
  fullGridBorder: PropTypes.bool,
  searchToolbarVariant: PropTypes.oneOf(["default", "unified"]),
};
CustomTable.propTypes = {
  ...CustomTable.propTypes,
  filter: PropTypes.arrayOf(PropTypes.object),
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
    })
  ),
};

CustomTable.defaultProps = {
  disableCheckbox: false,
  disableEdit: false,
  disableDetail: false,
  disableDelete: false,
  disableDeletePQ: false,
  disableAct: false,
  disableMore: false,
  disableAdd: false,
  disableSynchronize: false,
  isSetting: false,
  refreshTrigger: 0,
  disableSpecialChars: false,
  alwaysShowDeleteButton: false,
  onlyTable: false,
  showCustomDeleteButton: false,
  disableDefaultSort: false,
  wrapContent: false,
  filter: [],
  disablePaperHeight: false,
  paperPaddingBottom: undefined,
  hideHeaderColumnResizer: false,
  fullGridBorder: false,
  searchToolbarVariant: "default",
};

export default CustomTable;




