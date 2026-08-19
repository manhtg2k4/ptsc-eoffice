import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  TableBody,
  Box,
  FormControlLabel,
  Checkbox,
  ClickAwayListener,
  Tooltip,
  // Select,
  MenuItem,
  // Stack,
  // Pagination,
  // PaginationItem,
  Popover,
  FormControl,
  RadioGroup,
  // Radio,
  // Grid,
  styled,
  Dialog,
  useTheme,
  useMediaQuery,
  Menu,
  ListItemText,
  // Typography,
} from "@mui/material";
import {
  Search,
  Add,
  DeleteOutline,
  RemoveRedEyeOutlined,
  EditOutlined,
  DeleteOutlineOutlined,
  LoopOutlined,
  // VpnKey,
  // Lock,
  Edit,
  // TaskAlt as TaskAltIcon,
  // Assignment as AssignmentIcon,
  // Send as SendIcon,
  // Reply as ReplyIcon,
  // Book as BookIcon,
  // LockOpen,
  Dehaze,
  // CheckCircleOutline,
  // RadioButtonUnchecked,
  Check,
} from "@mui/icons-material";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import TaskIcon from "@mui/icons-material/Task";
import RoomPreferencesIcon from "@mui/icons-material/RoomPreferences";
import PropTypes from "prop-types";
import {
  HeaderCellContainer,
  SortIconContainer,
  StyledArrowDown,
  StyledArrowUp,
  StyledButton,
  StyledCheckbox,
  StyledPaper,
  StyledTable,
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
  PopoverContainer,
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
  STTHeaderCell,
  // CheckboxBodyCell,
  // STTBodyCell,
  ActionIconButton,
  // AdvancedFilterWrapper,
  DeleteSelectedButton,
  // StyleFormControl,
  // ActionsContainerFooter,
  StyleBoxActionsRespon,
  UnreadNotificationRow,
  ActionButtonText,
  InfoBox,
  TotalTypography,
  RecordRangeTypography,
  ActionStack,
  PrimaryActionButton,
  SecondaryActionButton,
} from "@styles/CustomTableNotification.styles";
import "./CustomCss.css";
// import CustomInput from "@components/CustomInput/CustomInput";

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

// External helper: handle advanced filter select change
// Accepts the native event and a setter function to update state inside the component
// const advancedFilterChange = (e, setter) => {
//   if (!setter) return;
//   const val = e?.target?.value;
//   setter(val);
// };

import { useToast } from "../common/ToastProvider";
import { clearWidthSpace } from "@utils/Common/Common";
import DownloadIcon from "@mui/icons-material/Download";
import DatePicker from "../DropDownLayout/DatePicker";
import dayjs from "dayjs";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
const AdvancedSearchDropdown = React.lazy(() =>
  import("@builder-table/components/AdvancedSearchDialog")
);
import { useLocation, matchPath } from "react-router-dom";
import { useDynamicMenuRoutes } from "../../hooks/useDynamicMenuRoutes";
import { useDispatch, useSelector } from "react-redux";
import UploadIcon from "@mui/icons-material/Upload";
import { AuthContext } from "../../AuthContext/AuthProvider";
import { find } from "lodash";
// import CustomDialog from "@components/CustomDialog/CustomDialog";
import { settingViewConfig } from "@redux/slices/ViewConfig/ViewConfigSlice";
import api from "@services/api";
// import { API_NOTIFICATION } from "@EnvironmentFile/constants/urlConfig";
import { StyleBoxTittle, StyleTittleBox, StyleTittleTyprography, UnifiedSearchGroup, UnifiedInput, SearchAdornmentStack, ClearIconButton, SearchClearIcon, TuneTriggerContainer, TuneIconBox, StyledSearchSectionButton, SearchFilterBox, FilterTitle, FilterCheckboxAll, FilterCheckboxGrid, FilterActionsBox, FilterCancelButton, FilterApplyButton, FilterTrigger, DropDownBox } from "@builder-table/components/SearchSection.styles";
import FilterHollowIcon from "@builder-table/components/FilterHollowIcon";
// import { StyleActionButton, StyleActionButtonApply, StyleActionButtonCancel, StyleActionCellCheckBox, StyleActionCheckBox, StyleBoxActionDropDown } from "@styles/CustomTable.styles";
import TuneIcon from "@builder-table/components/TuneIcon";
import { StyleBoxCH, StyleBoxDropDown, StyleTyprographyDropDown, StyleIconDropDown, StyleBoxDrop, StyleFomControl, StyleBoxDrown, StyleBoxButton, StyleButtonH, StyleButtonAD } from "@styles/customTableBorder.style";
import ViewColumnIcon from "@mui/icons-material/SettingsOutlined";

// const getColumnStyle = (column, columnWidths) => {
// 	const width = columnWidths[column.name || column.row]
// 		? `${columnWidths[column.name || column.row]}px`
// 		: column.width;

// 	return {
// 		width,
// 		minWidth: width,
// 		maxWidth: width,
// 	};
// };

const TooltipIfTruncated = ({ children, title, ...props }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textElementRef = useRef(null);

  const compareSize = () => {
    const el = textElementRef.current;
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  };

  return (
    <Tooltip 
      title={isTruncated ? title : ""} 
      disableHoverListener={!isTruncated} 
      {...props}
    >
      <span
        ref={textElementRef}
        onMouseEnter={compareSize}
        style={{
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
        }}
      >
        {children}
      </span>
    </Tooltip>
  );
};

const CustomTableNotification = ({
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
  onMarkReadUnread,
  disableCheckbox = false,
  disableEdit = false,
  disableDetail = false,
  disableDelete = false,
  disableDeletePQ = false,
  // disableMore = false,
  disableSearch = false,
  disableBL = false,
  disableAdd = false,
  disableAct = false,
  disableSynchronize = false,
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
  enableTableConfig = false,
  // alwaysShowDeleteButton = false,
  onlyTable = false,
  mapFunction,
  columns: propColumns,
  isDeleteWithCode,
  extraContentBelowSearch,
  selection,
  onSelectionChange,
  disableDefaultSort = false,
  defaultSort,
  onImport,
  onSyncUser,
  urlAsyncData,
  disableAdds = false,
  data: propData,
  codeModule,
  actions,
  onAction,
  renderCustomActions,
  onOrder,
  noneTitle,
  isCheckNotifile = false,
  // onApproveProposal, // New prop for "Duyệt đề xuất"
  // onProcessProposal, // New prop for "Đề xuất xử lý"
  // onTransferProcessing, // New prop for "Chuyển xử lý"
  // onReturnDocument, // New prop for "Trả lại"
  // onSaveBook, // New prop for "Lưu sổ"
  // getDataBySelectRows,
  showGroupButtons = false,
  advancedFilterConfig,
}) => {
  const [internalSelected, setInternalSelected] = useState([]);
  const [activeGroup, setActiveGroup] = useState(false);
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
  const [, setAdvancedFilterSelection] = useState(
    selectedColumns[0] || ""
  );
  const [tempSelectedColumns, setTempSelectedColumns] = useState(selectedColumns);

  const { dataViewConfig } = useSelector((state) => state.viewConfig);
  const [columns, setColumns] = useState([]);
  const [viewConfigTable, setViewConfigTable] = useState();
  const dispatch = useDispatch();

  const [tableConfigAnchorEl, setTableConfigAnchorEl] = useState(null);
  const handleTableConfigClick = (event) => setTableConfigAnchorEl(event.currentTarget);
  const handleTableConfigClose = () => setTableConfigAnchorEl(null);

  const handleApplyTableConfig = useCallback(() => {
    handleTableConfigClose();
    try {
      const payload = {
        ...viewConfigTable,
        field: columns.map(c => {
          // Lưu lại các trường của DB, map isShow vào showInList
          const newC = { ...c, showInList: c.isShow };
          if (c.row) {
            newC.name = c.row;
          }
          // Xoá các thuộc tính UI/hàm để tránh lỗi json và rác DB
          delete newC.isShow;
          delete newC.accessor;
          delete newC.render;
          return newC;
        }).map(c => JSON.parse(JSON.stringify(c))),
      };
      const idPayload = viewConfigTable?._id || viewConfigTable?.id;
      if (idPayload) {
        dispatch(settingViewConfig({ id: idPayload, payload: payload }));
        toast("Cập nhật cấu hình bảng thành công", "success");
      } else {
        const localKey = 'tableConfig_' + (codeModule || fileName || 'default');
        localStorage.setItem(localKey, JSON.stringify(payload.field));
        toast("Cập nhật cấu hình bảng (local) thành công", "success");
      }
    } catch (error) {
      toast("Lỗi khi cập nhật cấu hình bảng", "error");
    }
  }, [columns, viewConfigTable, dispatch, toast, codeModule, fileName]);

  const handleToggleTableColumn = (columnKey) => (event) => {
    event.stopPropagation();
    const newColumns = columns.map(c => 
      (c.row === columnKey || c.name === columnKey || c.key === columnKey) ? { ...c, isShow: !c.isShow } : c
    );
    setColumns(newColumns);
  };

  const handleToggleAllTableColumns = (event) => {
    const checked = event.target.checked;
    const newColumns = columns.map(c => ({ ...c, isShow: checked }));
    setColumns(newColumns);
  };

  useEffect(() => {
    let columnsTable = [];
    let viewConfig = {};
    if (dataViewConfig && codeModule) {
      if (!Array.isArray(dataViewConfig)) {
        viewConfig = dataViewConfig;
      } else {
        viewConfig =
          dataViewConfig.find((item) => item.code === codeModule) || {};
      }
      let dbFields = viewConfig.field || [];
      if (typeof dbFields === 'string') {
        try {
          dbFields = JSON.parse(dbFields);
        } catch(e) {
          dbFields = [];
        }
      }
      
      if (Array.isArray(propColumns) && propColumns.length > 0) {
        if (dbFields.length > 0) {
          // Dùng dbFields làm gốc để lấy toàn bộ cột từ DB
          columnsTable = dbFields.map((dbCol) => {
            const propCol = propColumns.find(c => (c.name === dbCol.name || c.row === dbCol.name || c.key === dbCol.name || c.row === dbCol.row));
            const isShow = dbCol.isShow !== undefined ? dbCol.isShow : (dbCol.showInList !== undefined ? dbCol.showInList : (propCol ? propCol.isShow : true));
            if (propCol) {
              return { 
                ...dbCol, 
                ...propCol, 
                isShow, 
                width: dbCol.width || propCol.width, 
                order: dbCol.order || propCol.order,
                row: dbCol.name // DB uses name as the data key
              };
            }
            return {
              ...dbCol,
              row: dbCol.name,
              name: dbCol.label || dbCol.name,
              isShow
            };
          });
        } else {
          columnsTable = propColumns;
        }
      } else {
        columnsTable = dbFields.map(c => ({ 
          ...c, 
          row: c.name,
          name: c.label || c.name,
          isShow: c.isShow !== undefined ? c.isShow : c.showInList 
        }));
      }
      setViewConfigTable(viewConfig);
      setColumns(columnsTable);
    } else if (Array.isArray(propColumns) && propColumns.length > 0) {
      const localKey = 'tableConfig_' + (codeModule || fileName || 'default');
      const savedColumnsStr = localStorage.getItem(localKey);
      if (savedColumnsStr) {
        try {
          const savedColumns = JSON.parse(savedColumnsStr);
          const mergedColumns = propColumns.map(col => {
            const savedCol = savedColumns.find(c => (c.name === col.name || c.row === col.row || c.key === col.key || c.name === col.row));
            if (savedCol) {
              const isShow = savedCol.isShow !== undefined ? savedCol.isShow : (savedCol.showInList !== undefined ? savedCol.showInList : col.isShow);
              return { ...col, isShow, width: savedCol.width || col.width, order: savedCol.order };
            }
            return col;
          });
          setColumns(mergedColumns);
        } catch (e) {
          setColumns(propColumns);
        }
      } else {
        setColumns(propColumns);
      }
    }
  }, [dataViewConfig, codeModule, propColumns, fileName]);

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
        
        const payloadField = cleanedNewOrder.map(c => {
          const newC = { ...c };
          if (c.row) {
            newC.name = c.row;
          }
          delete newC.isShow;
          delete newC.accessor;
          delete newC.render;
          return newC;
        }).map(c => JSON.parse(JSON.stringify(c)));
        const payload = {
          ...viewConfigTable,
          field: payloadField,
        };
        const idPayload = viewConfigTable?._id || viewConfigTable?.id;
        dispatch(settingViewConfig({ id: idPayload, payload: payload }));
        toast("Cập nhật vị trí cột thành công", "success");
      } catch (error) {
        toast("Lỗi khi cập nhật vị trí cột", "error");
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
    // const onUp = () => setResizingCol(null);
    const onUp = async () => {
      setResizingCol(null);
      // Sử dụng callback của setState để đảm bảo chúng ta có giá trị width mới nhất
      setColumnWidths((currentWidths) => {
        // Tạo một bản sao của columns để cập nhật
        const updatedColumns = columns.map((col) => {
          // Nếu cột có độ rộng mới trong currentWidths, cập nhật nó
          if (currentWidths[col.name]) {
            // Lấy giá trị số của độ rộng
            const newWidthValue = parseFloat(currentWidths[col.name]);
            if (!isNaN(newWidthValue)) {
              return { ...col, width: `${newWidthValue}px` };
            }
            return { ...col, width: currentWidths[col.name] };
          }
          return col;
        });

        try {
          const payloadField = updatedColumns.map(c => {
            const newC = { ...c };
            if (c.row) {
              newC.name = c.row;
            }
            delete newC.isShow;
            delete newC.accessor;
            delete newC.render;
            return newC;
          }).map(c => JSON.parse(JSON.stringify(c)));
          const payload = {
            ...viewConfigTable,
            field: payloadField,
          };
          const idPayload = viewConfigTable?._id || viewConfigTable?.id;
          dispatch(settingViewConfig({ id: idPayload, payload: payload }));
          toast("Cập nhật độ rộng cột thành công", "success");
        } catch (error) {
          toast("Lỗi khi cập nhật độ rộng cột", "error");
        }
        return currentWidths; // Trả về state không thay đổi vì logic đã xử lý xong
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
  const [, setSelectedRow] = useState(null);
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [selectedType, setSelectedType] = useState("IMG");
  const { systemParams } = useContext(AuthContext);
  // const [bulkAction, setBulkAction] = useState("");

  const [advancedSearchAnchorEl, setAdvancedSearchAnchorEl] = useState(null);
  const [advancedSearchValues, setAdvancedSearchValues] = useState({});

  const theme = useTheme();
  // consider small screens as 'sm' and below; adjust if you prefer 'md'
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

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

  // const handleBulkAction = useCallback(
  // 	async (e) => {
  // 		const val = e.target.value;
  // 		setBulkAction("");
  // 		if (!val) return;

  // 		try {
  // 			if (val === "approve" && typeof onApproveProposal === "function") {
  // 				await onApproveProposal(selected);
  // 			}
  // 			if (val === "process" && typeof onProcessProposal === "function") {
  // 				await onProcessProposal(selected);
  // 			}
  // 			if (val === "transfer" && typeof onTransferProcessing === "function") {
  // 				await onTransferProcessing(selected);
  // 			}
  // 			if (val === "return" && typeof onReturnDocument === "function") {
  // 				await onReturnDocument(selected);
  // 			}
  // 			if (val === "save" && typeof onSaveBook === "function") {
  // 				await onSaveBook(selected);
  // 			}
  // 		} catch (err) {
  // 			toast("Thao tác thất bại", "error");
  // 		}
  // 	},
  // 	[
  // 		onApproveProposal,
  // 		onProcessProposal,
  // 		onTransferProcessing,
  // 		onReturnDocument,
  // 		onSaveBook,
  // 		selected,
  // 		toast,
  // 	]
  // );

  const handleClick = useCallback((event, rowId, row) => {
    setAnchorEl(event.currentTarget);
    setOpenPopoverId(rowId);
    setSelectedRow(row);
  }, []);

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
    setOpenPopoverId(null);
    setSelectedRow(null);
  }, []);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleDateChange = useCallback(({ startDate, endDate }) => {
    setDateRange({ startDate, endDate });
  }, []);

  const isValidDate = (date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  const fetchTableData = useCallback(
    async (query = "", code = [], sort, selectedType, hidden) => {
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

        fetchData({
          page: page + 1,
          limit: rowsPerPage,
          query,
          code: validCodes.length > 0 ? validCodes : undefined,
          sort,
          processID: idList ? idList : null,
          startDate: formatDate(committedDateRange.startDate),
          endDate: formatDate(committedDateRange.endDate),
          selectedType,
          hidden,
          ...advancedSearchValues,
        })
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
      advancedSearchValues,
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

      fetchTableData(committedSearchText, codeValues, sort, undefined, activeGroup);
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
    activeGroup,
    advancedSearchValues,
  ]);

  const handleSearchClick = useCallback(
    (query) => {
      // const sort = orderBy
      // 	? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
      // 	: JSON.stringify({ [firstSortWithCode]: order === "asc" ? 1 : -1 });
      setPage(0);
      setCommittedDateRange(dateRange);
      setCommittedSearchText(query.trim());
      // fetchTableData(query.trim(), validCodes, sort);
    },
    // [orderBy, order, firstSortWithCode, fetchTableData, dateRange]
    [dateRange]
  );

  const handleUnprocessedClick = useCallback(() => {
    setActiveGroup(false);
    setPage(0);
  }, []);

  const handleProcessedClick = useCallback(() => {
    setActiveGroup(true);
    setPage(0);
  }, []);

  // Cập nhật searchText khi inputValue thay đổi
  useEffect(() => {
    setSearchText(inputValue);
  }, [inputValue]);

  //   const handleSort = useCallback(
  //     (column) => {
  //       const isCurrentColumn = orderBy === column;
  //       const newOrder = isCurrentColumn
  //         ? order === "asc"
  //           ? "desc"
  //           : "asc"
  //         : "asc";
  //       setOrder(newOrder);
  //       setOrderBy(column);
  //     },
  //     [orderBy, order]
  //   );

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
  
  // Helper function to normalize column identifier
  const getColumnKey = (column) => column.row || column.name;
  const totalPages = Math.ceil(total / rowsPerPage);

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const sanitizeAndSetSearchText = useCallback(
    (value) => {
      let normalized = value;
      const forbiddenCharsRegex = /[~!@#$%^*,`]/;
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

  const handleExport = useCallback(async () => {
    const matchedColumns = filter?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns?.map((col) => col.code) || [];
    const sort = orderBy
      ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
      : null;
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
        ...advancedSearchValues,
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
      logger.error("Export failed:", error);
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
    advancedSearchValues,
  ]);

  const handleExportAll = useCallback(
    async (format = "excel") => {
      const sort = orderBy
        ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
        : null;

      const exportFn = onExportAll || onExport;

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
          ...advancedSearchValues,
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
        logger.error("Export All failed:", error);
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
      advancedSearchValues,
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
      // Trả về một function
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
        ...advancedSearchValues,
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
      advancedSearchValues,
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

  const handleOpenAdvancedFilter = useCallback((event) => {
    setAdvancedSearchAnchorEl(event.currentTarget);
    setOpenAdvancedFilter(true);
  }, []);

  const handleCloseAdvancedFilter = useCallback(() => {
    setOpenAdvancedFilter(false);
  }, []);

  const handleAdvancedSearch = useCallback((result) => {
    setAdvancedSearchValues(result);
    setPage(0);
    setOpenAdvancedFilter(false);
  }, []);

  // when opening the dialog, prefill selection from current selectedColumns
  useEffect(() => {
    if (openAdvancedFilter) {
      setAdvancedFilterSelection(selectedColumns[0] || "");
    }
  }, [openAdvancedFilter, selectedColumns]);

  // const handleApplyAdvancedFilter = useCallback(() => {
  //   if (advancedFilterSelection) setSelectedColumns([advancedFilterSelection]);
  //   else setSelectedColumns([]);
  //   setOpenAdvancedFilter(false);
  // }, [advancedFilterSelection, setSelectedColumns]);

  // // Stable callback that uses the external helper
  // const onAdvancedFilterChange = useCallback(
  //   (e) => advancedFilterChange(e, setAdvancedFilterSelection),
  //   [setAdvancedFilterSelection]
  // );

  const handleDeleteClick = useCallback(() => {
    onDelete(selected);
  }, [onDelete, selected]);

  const handleSelectAll = useCallback(
    (e) => {
      const currentDataIds = data.map((row) =>
        isDeleteWithCode ? row.code : row._id || row.id
      );
      if (e.target.checked) {
        setSelected([...new Set([...selected, ...currentDataIds])]);
      } else {
        setSelected(selected.filter((id) => !currentDataIds.includes(id)));
      }
    },
    [data, isDeleteWithCode, selected, setSelected]
  );

  const handleRowSelect = useCallback(
    (row) => {
      const idToCheck = isDeleteWithCode ? row.code : row._id || row.id;
      const newSelection = selected.includes(idToCheck)
        ? selected.filter((id) => id !== idToCheck)
        : [...selected, idToCheck];
      setSelected(newSelection);
    },
    [isDeleteWithCode, selected, setSelected]
  );

  const handleEditClick = useCallback(
    (rowId) => {
      onEdit(rowId);
    },
    [onEdit]
  );

//   const handleViewClick = useCallback(
//     (rowId) => {
//       onView(rowId);
//     },
//     [onView]
//   );
  const handleViewClick = useCallback(
  (rowOrId) => {
    // Nếu là object (row đầy đủ) → dùng luôn
    if (rowOrId && typeof rowOrId === "object") {
      onView(rowOrId);
    } else {
      // Nếu chỉ là id → tìm row trong data (cách cũ)
      const foundRow = data.find(r => (r._id || r.id) === rowOrId);
      if (foundRow) onView(foundRow);
    }
  },
  [onView, data]
);

  const handleRowDeleteClick = useCallback(
    (row) => {
      if (typeof onRowDelete === "function") {
        onRowDelete(row);
      } else {
        onDelete(isDeleteWithCode ? row.code : [row._id || row.id]);
      }
    },
    [onRowDelete, onDelete, isDeleteWithCode]
  );

  const handlePopoverOptionClick = useCallback(
    (onClick, rowId) => {
      onClick(rowId);
      handleClose();
    },
    [handleClose]
  );
  
  // const handleMarkReadUnread = useCallback(async (row, isRead) => {
  //   try {
  //     await api.patch(`${API_NOTIFICATION}/${row.id || row._id}`, { isRead });
  //     toast(`Đã đánh dấu là ${isRead ? "đã" : "chưa"} đọc`, "success");
  //     setReloadTable(Date.now());
  //   } catch (error) {
  //     toast("Thao tác thất bại", "error");
  //   }
  // }, [toast, setReloadTable]);

  const handlePopoverItemClick = useCallback(
    (item) => (e) => {
      if (e) e.stopPropagation();
      if (item.onClick) {
        item.onClick();
      }
      handleClose();
    },
    [handleClose]
  );

  // Tạo handler riêng cho từng row (dùng trong map)
  const createRowHandlers = useCallback(
    (row) => {
      const rowId = row.id || row._id;
      return {
        onEdit: (e) => {
          e.stopPropagation();
          handleEditClick(rowId || row);
        },
        onView: () => handleViewClick(rowId || row),
        onDelete: (e) => {
          e.stopPropagation();
          handleRowDeleteClick(row);
        },
        onPopoverClick: (e) => {
          e.stopPropagation();
          handleClick(e, rowId, row);
        },
        onCheckDigit: (e) => {
          e.stopPropagation();
          handleClick(e, rowId, row);
        },
        onSign: (e) => {
          e.stopPropagation();
          handleClick(e, row._id, row);
        },
        onVerifyFormat: (e) => {
          e.stopPropagation();
          handleClick(e, row._id, row);
        },
        onRowSelect: (e) => {
          e.stopPropagation();
          handleRowSelect(row);
        },
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

  
  // function handlePrevPageClick(e) {
  //   handlePageChange(e, page)
  // }

  // // Handler for next page button
  // function handleNextPageClick(e) {
  //   handlePageChange(e, page + 2)
  // }

  const advancedFilterFields = useMemo(() => {
    const sourceFields = (advancedFilterConfig && advancedFilterConfig.length > 0) ? advancedFilterConfig : filter;
    if (!sourceFields) return [];
    return sourceFields.map((f) => ({
      ...f,
      advancedSearch: f.advancedSearch || f.filter, // Hiển thị nếu advancedSearch hoặc filter là true
      originalType: f.type,
      type: f.type === "text" ? "string" : f.type, // Đổi type tạm thời để lách điều kiện lọc type !== 'text' của AdvancedSearchDropdown
    }));
  }, [filter, advancedFilterConfig]);

  const handleSelectAllColumns = (e) => {
  if (e.target.checked) {
    setTempSelectedColumns(filter?.map((col) => col.name) || []);
  } else {
    setTempSelectedColumns([]);
  }
};

const handleApplyFilter = () => {
  setSelectedColumns(tempSelectedColumns); // ✅ Cập nhật state thật
  handleSearchButtonClick();
  handleFilterAway();
};

  return (
    <>
      <StyleBoxTittle>
        {!noneTitle && isCheckNotifile && (
                  currentPageTitle ? (
                      <StyleTittleBox>
                        <StyleTittleTyprography
                          variant="h5" >
                          {currentPageTitle}
                        </StyleTittleTyprography>
                      </StyleTittleBox>
                    ) : null
                )}

        <StyledPaper>
        {!onlyTable && (
          <StyledToolbar>
            <ToolbarContent>
               {!disableSearch && (
                <UnifiedSearchGroup>
                  {disableBL && (
                    <DropDownBox>
                      <FilterTrigger onClick={handleOpenAdvancedFilter}>
                        <FilterHollowIcon />
                        <span>Bộ lọc</span>
                      </FilterTrigger>
                      <React.Suspense fallback={null}>
                        <AdvancedSearchDropdown
                          open={openAdvancedFilter}
                          onClose={handleCloseAdvancedFilter}
                          onSearch={handleAdvancedSearch}
                          anchorEl={advancedSearchAnchorEl}
                          currentSearchValue={inputValue}
                          selectedColumns={selectedColumns}
                          currentAdvancedValues={advancedSearchValues}
                          textFieldCodes={[]}
                          fields={advancedFilterFields}
                        />
                      </React.Suspense>
                    </DropDownBox>
                  )}
                  <UnifiedInput
                    variant="outlined"
                    size="small"
                    placeholder="Tìm kiếm..."
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    autoComplete="off"
                    InputProps={{
                      endAdornment: (
                        <SearchAdornmentStack>
                          {searchText && (
                            <ClearIconButton
                              aria-label="clear search"
                              onClick={handleClearSearch}
                              size="small"
                            >
                              <SearchClearIcon />
                            </ClearIconButton>
                          )}
                          <ClickAwayListener onClickAway={handleFilterAway}>
                            <TuneTriggerContainer>
                              <TuneIconBox onClick={handleFilterToggle}>
                                <TuneIcon />
                              </TuneIconBox>
                              {openFilter && (
                                <SearchFilterBox>
                                  {/* Header */}
                                  <FilterTitle>
                                    <Search />
                                    <span>Lọc tìm kiếm</span>
                                  </FilterTitle>

                                  {/* Checkbox "Tất cả" */}
                                  <FilterCheckboxAll>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={tempSelectedColumns.length === filter?.length}
                                          indeterminate={
                                            selectedColumns.length > 0 &&
                                            selectedColumns.length < filter?.length
                                          }
                                          onChange={handleSelectAllColumns}
                                          size="small"
                                        />
                                      }
                                      label="Tất cả"
                                    />
                                  </FilterCheckboxAll>

                                  {/* Grid 3 cột cho các checkbox */}
                                  <FilterCheckboxGrid>
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
                                  </FilterCheckboxGrid>

                                  {/* Nút Hủy và Áp dụng */}
                                  <FilterActionsBox>
                                    <FilterCancelButton onClick={handleFilterAway}>
                                      Hủy
                                    </FilterCancelButton>
                                    <FilterApplyButton variant="contained" onClick={handleApplyFilter}>
                                      Áp dụng
                                    </FilterApplyButton>
                                  </FilterActionsBox>
                                </SearchFilterBox>
                              )}
                            </TuneTriggerContainer>
                          </ClickAwayListener>
                        </SearchAdornmentStack>
                      ),
                    }}
                  />
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
                </UnifiedSearchGroup>
              )}

              {!disableSearch && (
                <StyledSearchSectionButton onClick={handleSearchButtonClick}>
                  <Search />
                </StyledSearchSectionButton>
              )}

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
            {!onlyTable && (
              <ActionsContainer styleJustifyContent="flex-end">
                <ActionsBox>
                  {enableTableConfig && (
                    <>
                      <StyledButton variant="contained" onClick={handleTableConfigClick}>
                        <Tooltip title="Cấu hình bảng">
                          <ViewColumnIcon />
                        </Tooltip>
                      </StyledButton>
                      <Popover
                        open={Boolean(tableConfigAnchorEl)}
                        anchorEl={tableConfigAnchorEl}
                        onClose={handleTableConfigClose}
                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                        onBackdropClick={handleTableConfigClose}
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
                                  checked={columns.every((c) => c.isShow !== false)}
                                  indeterminate={columns.some((c) => c.isShow !== false) && !columns.every((c) => c.isShow !== false)}
                                  onChange={handleToggleAllTableColumns}
                                  size="small"
                                />
                              }
                              label="Tất cả"
                            />
                          </StyleBoxDrop>
                          <StyleBoxDrown>
                            {columns
                              .map((colConfig, index) => (
                                <StyleFomControl
                                  key={colConfig.row || colConfig.name || colConfig.key || index}
                                  control={
                                    <Checkbox
                                      checked={colConfig.isShow !== false}
                                      onChange={handleToggleTableColumn(colConfig.row || colConfig.name || colConfig.key)}
                                      size="small"
                                    />
                                  }
                                  label={colConfig.title || colConfig.label || colConfig.name}
                                />
                              ))}
                          </StyleBoxDrown>
                          <StyleBoxButton>
                            <StyleButtonH
                              variant="text"
                              size="small"
                              onClick={handleTableConfigClose}
                            >
                              Hủy
                            </StyleButtonH>
                            <StyleButtonAD
                              variant="contained"
                              size="small"
                              onClick={handleApplyTableConfig}
                            >
                              Áp dụng
                            </StyleButtonAD>
                          </StyleBoxButton>
                        </StyleBoxCH>
                      </Popover>
                    </>
                  )}
                  {isExport && (
                    <StyledButton variant="contained" onClick={handleExport}>
                      <Tooltip title="Xuất file">
                        <DownloadIcon />
                      </Tooltip>
                    </StyledButton>
                  )}
                  {isExportAll && (
                    <>
                      <StyledButton
                        variant="contained"
                        onClick={handleExportClick}
                      >
                        <Tooltip title="Xuất file">
                          <DownloadIcon />
                        </Tooltip>
                      </StyledButton>
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
                </ActionsBox>
              </ActionsContainer>
            )}
            {showGroupButtons && (
              <ActionStack>
                {activeGroup === false ? (
                  <PrimaryActionButton onClick={handleUnprocessedClick}>
                    Chưa xử lý
                  </PrimaryActionButton>
                ) : (
                  <SecondaryActionButton onClick={handleUnprocessedClick}>
                    Chưa xử lý
                  </SecondaryActionButton>
                )}
                {activeGroup === true ? (
                  <PrimaryActionButton onClick={handleProcessedClick}>
                    Đã xử lý
                  </PrimaryActionButton>
                ) : (
                  <SecondaryActionButton onClick={handleProcessedClick}>
                    Đã xử lý
                  </SecondaryActionButton>
                )}
              </ActionStack>
            )}
          </StyledToolbar>
        )}

        {extraContentBelowSearch && (
          <ExtraContentBox>{extraContentBelowSearch}</ExtraContentBox>
        )}

        <StyledTableContainer isMaxHeight={isMaxHeight}>
          <StyledTable>
            <StyledTableHead>
              <StyledTableRow>
                {disableCheckbox ? (
                  // <STTHeaderCell id="col-checkbox">STT</STTHeaderCell>
                  <STTHeaderCell>STT</STTHeaderCell>
                ) : (
                  //  <CheckboxHeaderCell id="col-checkbox">
                  <CheckboxHeaderCell>
                    <StyledCheckbox
                      indeterminate={
                        data?.length > 0 &&
                        data.some((row) =>
                          selected.includes(
                            isDeleteWithCode ? row.code : row._id || row.id
                          )
                        ) &&
                        !data.every((row) =>
                          selected.includes(
                            isDeleteWithCode ? row.code : row._id || row.id
                          )
                        )
                      }
                      checked={
                        data?.length > 0 &&
                        data.every((row) =>
                          selected.includes(
                            isDeleteWithCode ? row.code : row._id || row.id
                          )
                        )
                      }
                      onChange={handleSelectAll}
                    />
                  </CheckboxHeaderCell>
                )}
                {anableSTT && <STTHeaderCell>STT</STTHeaderCell>}
                {columns
                  .map((col, originalIndex) => ({ ...col, originalIndex }))
                  .filter(c => c.isShow !== false)
                  .map((column) => {
                  const handlers = {
                    onDragStart: (e) => handleDragStart(e, column.originalIndex),
                    onDragOver: handleDragOver,
                    onDrop: (e) => handleDrop(e, column.originalIndex), // Giữ nguyên logic kéo thả
                    onSort: () => handleSort(getColumnKey(column)), // Sử dụng hàm helper
                    // onResize: (e) => handleMouseDownResize(e, column.row),
                    onResize: (e) =>
                      handleMouseDownResize(e, column.name || column.row),
                  };
                  const columnKey = getColumnKey(column);
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
                      <HeaderCellContainer>
                        {column.title || column.name || column.label}
                        <SortIconContainer>
                          <StyledArrowUp
                            isActive={
                              orderBy === columnKey &&
                              order === "asc"
                            }
                          />
                          <StyledArrowDown
                            isActive={
                              orderBy === columnKey &&
                              order === "desc"
                            }
                          />
                        </SortIconContainer>
                      </HeaderCellContainer>
                      <ColumnResizer onMouseDown={handlers.onResize} />
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
                        ? columns.length + (anableSTT ? 2 : 1)
                        : anableSTT
                          ? columns.length + 3
                          : columns.length + 2
                    }
                    align="center"
                  >
                    Không có dữ liệu
                  </StyledTableCell>
                </StyledTableRow>
              ) : (
                data.map((row, index) => {
                  const handlers = createRowHandlers(row);
                  const rowId = row.id || row._id;
                  const isPopoverOpen =
                    openPopoverId === rowId && Boolean(anchorEl);
const RowComponent = row.isRead === false ? UnreadNotificationRow : StyledTableRow;
                  return (
                    <RowComponent
                      key={row._id}
                      index={index}
                      data-unread={row.isRead === false}
                      onClick={handlers.onView}
                    >
                      {disableCheckbox ? (
                        <StyledTableCell>
                          {page * rowsPerPage + index + 1}
                        </StyledTableCell>
                      ) : (
                        // <CheckboxBodyCell index={index}>
                        <CheckboxHeaderCell onClick={handleStopPropagation}>
                          <StyledCheckbox
                            checked={selected.includes(
                              isDeleteWithCode ? row.code : row._id || row.id
                            )}
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

                      {columns.filter(c => c.isShow !== false).map((column) => {
                        const cellValue = column.accessor
                          ? column.accessor(row)
                          : row[column.row || column.name];
                        let displayValue = "";
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
                          displayValue = cellValue ?? "–";
                        }

                        return (
                          <StyledTableCell
                            key={column.name || column.row}
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
                            {(typeof displayValue === "string" || typeof displayValue === "number") ? (
                              <TooltipIfTruncated title={String(displayValue)} placement="top-start">
                                {displayValue}
                              </TooltipIfTruncated>
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
                          onClick={handleStopPropagation}
                        >
                          {/* Build action items so we can render them inline on large screens or inside popover on small screens */}
                          {(() => {
                            const items = [];

                            // ✅ Ưu tiên render các actions được truyền từ props
                            if (actions && actions.length > 0) {
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
                                  onClick: (e) =>
                                    handleClick(e, row.id || row._id, row),
                                });
                              }

                              if (disableDigital) {
                                items.push({
                                  key: "digit",
                                  title: "Ký số",
                                  icon: <SaveAsIcon />,
                                  onClick: (e) => handleClick(e, row._id, row),
                                });
                              }

                              if (Signed) {
                                items.push({
                                  key: "signed",
                                  title: "Kiểm tra định dạng",
                                  icon: <TaskIcon />,
                                  onClick: (e) => handleClick(e, row._id, row),
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
                                  onClick: () => onView(row),
                                });
                              }
                                
                              if (onMarkReadUnread) {
                                  if (row.isRead) {
                                    items.push({
                                      key: "markUnread",
                                      title: "Đánh dấu là chưa đọc",
                                      icon: <Check />,
                                      onClick: () => onMarkReadUnread(row, false),
                                    });
                                  } else {
                                    items.push({
                                      key: "markRead",
                                      title: "Đánh dấu là đã đọc",
                                      icon: <Check />,
                                      onClick: () => onMarkReadUnread(row, true),
                                    });
                                  }
                                }
   {/* onClick: () => onView(row), */}
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

                            return (
                              <>
                                <Tooltip title="Hành động">
                                  <ActionIconButton
                                    onClick={handlers.onPopoverClick}
                                  >
                                    <Dehaze />
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
                                      <ActionButtonText
                                        key={it.key}
                                        colorType={it.colorType}
                                        onClick={handlePopoverItemClick(it)}
                                        startIcon={it.icon}
                                        fullWidth
                                      >
                                        {it.title}
                                      </ActionButtonText>
                                    ))}
                                  </PopoverContainer>
                                </Popover>
                              </>
                            );
                          })()}
                        </StyledTableCellActions>
                      )}
                     </RowComponent>
                  );
                })
              )}
            </TableBody>
          </StyledTable>
        </StyledTableContainer>

          {!onlyTable && (
          <ActionsContainer
            styleJustifyContent={isSmallScreen ? "flex-end" : "space-between"}
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
                  {!disableDeletePQ &&
                    (showCustomDeleteButton ? (
                      <DeleteStyledButton
                        variant="contained"
                        // $color="error"
                        disabled={selected.length === 0}
                        onClick={handleDeleteClick}
                      >
                        <Tooltip title="Xóa">
                          <DeleteOutline />
                        </Tooltip>
                      </DeleteStyledButton>
                    ) : (
                      !disableCheckbox && (
                        <DeleteSelectedButton
                          disabled={selected.length === 0}
                          onClick={handleDeleteClick}
                        >
                          <Tooltip title="Xóa">
                            <DeleteOutline />
                          </Tooltip>
                        </DeleteSelectedButton>
                      )
                    ))}
                  {disableAdds && (
                    <StyledButton
                      variant="contained"
                      // $color="primary"
                      onClick={onAdd}
                    >
                      <Tooltip title="Thêm mới">
                        <Add />
                      </Tooltip>
                    </StyledButton>
                  )}

                  {renderCustomActions && renderCustomActions(selected)}

                  {disableAdds && (
                    <StyledButton
                      variant="contained"
                      // color="primary"
                      onClick={onAdd}
                    >
                      <Tooltip title="Thêm mới">
                        <Add />
                      </Tooltip>
                    </StyledButton>
                  )}

                  {!disableAdd &&
                    (permissionsForModule === null ||
                      permissionsForModule === "all" ||
                      permissionsForModule.includes("add")) && (
                      <StyledButton variant="contained" onClick={onAdd}>
                        <Tooltip title="Thêm mới">
                          <Add />
                        </Tooltip>
                      </StyledButton>
                    )}
                </StyleBoxActionsRespon>
              ) : (
                <>
                  {!disableDeletePQ &&
                    (showCustomDeleteButton ? (
                      <DeleteStyledButton
                        variant="contained"
                        // $color="error"
                        disabled={selected.length === 0}
                        onClick={handleDeleteClick}
                      >
                        <Tooltip title="Xóa">
                          <DeleteOutline />
                        </Tooltip>
                      </DeleteStyledButton>
                    ) : (
                      !disableCheckbox && (
                        <DeleteSelectedButton
                          disabled={selected.length === 0}
                          onClick={handleDeleteClick}
                        >
                          <Tooltip title="Xóa">
                            <DeleteOutline />
                          </Tooltip>
                        </DeleteSelectedButton>
                      )
                    ))}
                  {disableAdds && (
                    <StyledButton
                      variant="contained"
                      // $color="primary"
                      onClick={onAdd}
                    >
                      <Tooltip title="Thêm mới">
                        <Add />
                      </Tooltip>
                    </StyledButton>
                  )}

                  {renderCustomActions && renderCustomActions(selected)}

                  {disableAdds && (
                    <StyledButton
                      variant="contained"
                      // color="primary"
                      onClick={onAdd}
                    >
                      <Tooltip title="Thêm mới">
                        <Add />
                      </Tooltip>
                    </StyledButton>
                  )}

                  {!disableAdd &&
                    (permissionsForModule === null ||
                      permissionsForModule === "all" ||
                      permissionsForModule.includes("add")) && (
                      <StyledButton variant="contained" onClick={onAdd}>
                        <Tooltip title="Thêm mới">
                          <Add />
                        </Tooltip>
                      </StyledButton>
                    )}

                  {onImport && (
                    <StyledButton variant="contained" onClick={onImport}>
                      <Tooltip title="Import tài liệu giấy tờ">
                        <UploadIcon />
                      </Tooltip>
                    </StyledButton>
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
                  {onSyncUser && (
                    <StyledButton variant="contained" onClick={onSyncUser}>
                      <Tooltip title="Đồng bộ người dùng">
                        <LoopOutlined />
                      </Tooltip>
                    </StyledButton>
                  )}

                  {moreActions && moreActions()}
                </>
              )}
            </ActionsBox>

            {!isSmallScreen && (
              <PaginationContainer>
                <InfoBox>
                  <TotalTypography>
                    {isSmallScreen ? total : `Tổng ${total}`}
                  </TotalTypography>
                  <RecordRangeTypography>
                    {isSmallScreen
                      ? `${page * rowsPerPage + 1}-${Math.min(
                          (page + 1) * rowsPerPage,
                          total
                        )}`
                      : `${page * rowsPerPage + 1}-${Math.min(
                          (page + 1) * rowsPerPage,
                          total
                        )} Bản ghi`}
                  </RecordRangeTypography>
                </InfoBox>

                <PaginationStack>
                  <StyledPagination
                    count={totalPages}
                    page={page + 1}
                    onChange={handlePageChange}
                    shape="rounded"
                    variant="outlined"
                    showFirstButton={false}
                    showLastButton={false}
                    siblingCount={0}
                    boundaryCount={1}
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
            )}
          </ActionsContainer>
        )}

        {/* CustomDialog for advanced filter removed and replaced with AdvancedSearchDropdown */}
        {children}
      </StyledPaper>
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
    </>
  );
};

CustomTableNotification.propTypes = {
  moreActions: PropTypes.func,
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
  disableSearch: PropTypes.bool,
  disableAdd: PropTypes.bool,
  disableAdds: PropTypes.bool,
  disableBL: PropTypes.bool,
  wrapContent: PropTypes.bool,
  disableAct: PropTypes.bool,
  disableSynchronize: PropTypes.bool,
  editGroupUnit: PropTypes.bool,
  isRadio: PropTypes.bool,
  isExport: PropTypes.bool,
  isExportAll: PropTypes.bool,
  onExport: PropTypes.func,
  onExportAll: PropTypes.func,
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
  noneTitle: PropTypes.bool,
  onMarkReadUnread: PropTypes.func,
};
CustomTableNotification.propTypes = {
  ...CustomTableNotification.propTypes,
  filter: PropTypes.arrayOf(PropTypes.object),
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
    })
  ),
};

CustomTableNotification.defaultProps = {
  disableCheckbox: false,
  disableEdit: false,
  disableDetail: false,
  disableDelete: false,
  disableDeletePQ: false,
  disableAct: false,
  disableSearch: false,
  disableMore: false,
  disableAdd: false,
  disableSynchronize: false,
  refreshTrigger: 0,
  disableSpecialChars: false,
  alwaysShowDeleteButton: false,
  onlyTable: false,
  showCustomDeleteButton: false,
  disableDefaultSort: false,
  wrapContent: false,
  filter: [],
  onMarkReadUnread: false,
};

export default CustomTableNotification;
