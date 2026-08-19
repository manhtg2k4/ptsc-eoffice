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
  // Select,
  MenuItem,
  // Stack,
  // Pagination,
  // PaginationItem,
  Popover,
  Button,
  FormControl,
  RadioGroup,
  // Radio,
  // Grid,
  styled,
  Dialog,
  useTheme,
  useMediaQuery,
  Menu,
  // ListItemIcon,
  ListItemText,
  // Typography,
} from "@mui/material";
import {
  Search,
  Add,
  DeleteOutline,
  MoreVert as MoreVertIcon,
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
  // MoreVert,
} from "@mui/icons-material";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import TaskIcon from "@mui/icons-material/Task";
import RoomPreferencesIcon from "@mui/icons-material/RoomPreferences";
import PropTypes from "prop-types";
import {
  FilterBox,
  HeaderCellContainer,
  SortIconContainer,
  StyledArrowDown,
  StyledArrowUp,
  StyledButton,
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
  SearchAdornment,
  STTHeaderCell,
  // CheckboxBodyCell,
  // STTBodyCell,
  ActionIconButton,
  AdvancedFilterWrapper,
  DeleteSelectedButton,
  // StyleFormControl,
  ActionsContainerFooter,
  StyleBoxActionsRespon,
  PaginationWrapper,
  PaginationContainerStyled,
  StyleIcon,
  StyleIconArrow,
  // StylePageContainer,
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
  StyledTableContentTolltip,
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

// External helper: handle advanced filter select change
// Accepts the native event and a setter function to update state inside the component
const advancedFilterChange = (e, setter) => {
  if (!setter) return;
  const val = e?.target?.value;
  setter(val);
};

import { useToast } from "@components/common/ToastProvider";
import { clearWidthSpace } from "@utils/Common/Common";
import DownloadIcon from "@mui/icons-material/Download";
import DatePicker from "../DropDownLayout/DatePicker";
import dayjs from "dayjs";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import { useLocation, matchPath } from "react-router-dom";
import { useDynamicMenuRoutes } from "../../hooks/useDynamicMenuRoutes";
import { useDispatch, useSelector } from "react-redux";
import UploadIcon from "@mui/icons-material/Upload";
import { AuthContext } from "../../AuthContext/AuthProvider";
import { find } from "lodash";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { settingViewConfig } from "@redux/slices/ViewConfig/ViewConfigSlice";
import api from "@services/api";
import TuneIcon from "@builder-table/components/TuneIcon";
import {
  StyleBoxTittle,
  StyleTittleBox,
  StyleTittleTyprography,
} from "@builder-table/components/SearchSection.styles";

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
    pages.push(createPageDots("dots-start"));
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
    pages.push(createPageDots("dots-end"));
  }

  // Luôn hiển thị trang cuối (nếu totalPages > 1)
  if (totalPages > 1) {
    pages.push(createPageButton(totalPages, currentPage, handlePageChange));
  }

  return pages;
};

const CusTomTableFreeStyle = ({
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
  isSetting,
  onSetting,
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
  isExportInDetail,
  onExport,
  onExportInDetail,
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
  noneTitle,
  isMobieHeight,
  isCheckTitle = false,
  autoHeight = false,
  enableMoreActions = false,
  onMoreAction,

  // onApproveProposal, // New prop for "Duyệt đề xuất"
  // onProcessProposal, // New prop for "Đề xuất xử lý"
  // onTransferProcessing, // New prop for "Chuyển xử lý"
  // onReturnDocument, // New prop for "Trả lại"
  // onSaveBook, // New prop for "Lưu sổ"
  // getDataBySelectRows,
  disableFilter = false,
  onSearch,
  onDataChange, // Callback khi dữ liệu thay đổi (inline edit): (newData, rowIndex, columnName, newValue) => void
}) => {
  const [internalSelected, setInternalSelected] = useState([]);
  const isControlled =
    selection !== undefined && onSelectionChange !== undefined;
  const selected = isControlled ? selection : internalSelected;
  const setSelected = isControlled ? onSelectionChange : setInternalSelected;

  // Handler cho inline edit cell
  const handleCellChange = useCallback(
    (rowIndex, columnName, newValue) => {
      if (typeof onDataChange === "function") {
        setData((prevData) => {
          const updatedData = prevData.map((row, idx) =>
            idx === rowIndex ? { ...row, [columnName]: newValue } : row
          );
          onDataChange(updatedData, rowIndex, columnName, newValue);
          return updatedData;
        });
      }
    },
    [onDataChange]
  );

  const location = useLocation();
  const dynamicMenuRoutes = useDynamicMenuRoutes();
  const { userPermissions } = useSelector((state) => state.users);
  const [reloadTable, setReloadTable] = useState("");
  const [loading, setLoading] = useState(false);
  const currentPageTitle = useSelector(
    (state) => state.layout.currentPageTitle
  );
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  const toast = useToast();
  const [openAdvancedFilter, setOpenAdvancedFilter] = useState(false);
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
  const [rowsPerPage, setRowsPerPage] = useState(100);
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
  const [advancedFilterSelection, setAdvancedFilterSelection] = useState(
    selectedColumns[0] || ""
  );
  const [tempSelectedColumns, setTempSelectedColumns] =
    useState(selectedColumns);

  const { dataViewConfig } = useSelector((state) => state.viewConfig);
  const [columns, setColumns] = useState([]);
  const [viewConfigTable, setViewConfigTable] = useState();
  const dispatch = useDispatch();
  // console.log("dataViewConfig", dataViewConfig);

  useEffect(() => {
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
    // const onUp = async () => {
    //   setResizingCol(null);
    //   // Sử dụng callback của setState để đảm bảo chúng ta có giá trị width mới nhất
    //   setColumnWidths((currentWidths) => {
    //     // Tạo một bản sao của columns để cập nhật
    //     const updatedColumns = columns.map((col) => {
    //       // Nếu cột có độ rộng mới trong currentWidths, cập nhật nó
    //       if (currentWidths[col.name]) {
    //         // Lấy giá trị số của độ rộng
    //         const newWidthValue = parseFloat(currentWidths[col.name]);
    //         if (!isNaN(newWidthValue)) {
    //           return { ...col, width: `${newWidthValue}px` };
    //         }
    //         return { ...col, width: currentWidths[col.name] };
    //       }
    //       return col;
    //     });

    //     try {
    //       const payload = {
    //         ...viewConfigTable,
    //         field: updatedColumns,
    //       };
    //       const idPayload = viewConfigTable?._id;
    //       await dispatch(settingViewConfig({ id: idPayload, payload: payload })).unwrap();
    //       toast("Cập nhật độ rộng cột thành công", "success");
    //     } catch (error) {
    //       toast("Lỗi khi cập nhật độ rộng cột", "error");
    //     }
    //     return currentWidths; // Trả về state không thay đổi vì logic đã xử lý xong
    //   });
    // };

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
            await dispatch(
              settingViewConfig({ id: idPayload, payload })
            ).unwrap();
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
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [selectedType, setSelectedType] = useState("IMG");
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

  const handleCloseMore = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

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

  const handleDateChange = useCallback(({ startDate, endDate }) => {
    setDateRange({ startDate, endDate });
  }, []);

  const isValidDate = (date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

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
  ]);

  const handleSearchClick = useCallback(
    (query) => {
      // const sort = orderBy
      // 	? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
      // 	: JSON.stringify({ [firstSortWithCode]: order === "asc" ? 1 : -1 });
      setPage(0);
      setCommittedDateRange(dateRange);
      setCommittedSearchText(query.trim());
      if (typeof onSearch === "function") {
        onSearch(query.trim());
      }
      // fetchTableData(query.trim(), validCodes, sort);
    },
    // [orderBy, order, firstSortWithCode, fetchTableData, dateRange]
    [dateRange, onSearch]
  );

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
  const totalPages = Math.ceil(total / rowsPerPage);

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

  const handleExportInDetail = useCallback(
    async (format = "excel") => {
      const sort = orderBy
        ? JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 })
        : null;

      const exportFn = onExportInDetail;

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
      onExportInDetail,
      fileName,
      toast,
    ]
  );

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExportExcel = useCallback(() => {
    handleExportInDetail("excel");
    handleExportClose();
  }, [handleExportInDetail]);

  const handleExportPDF = useCallback(() => {
    handleExportInDetail("pdf");
    handleExportClose();
  }, [handleExportInDetail]);

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setInputValue("");
    // ✅ Reset cả 2 state
    setDateRange({ startDate: null, endDate: null });
    setCommittedDateRange({ startDate: null, endDate: null });
    const matchedColumns = filter?.filter((col) =>
      selectedColumns.includes(col.name)
    );
    const codeValues = matchedColumns?.map((col) => col?.code);
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
  ]);

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
      // setSelectedColumns((prev) =>
      //   prev.includes(columnName)
      //     ? prev.filter((val) => val !== columnName)
      //     : [...prev, columnName]
      // );
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
    const codeValues = matchedColumns?.map((col) => col?.code);
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
    onDelete(selected);
  }, [onDelete, selected]);

  const handleSelectAll = useCallback(
    (e) => {
      const currentDataIds = data.map((row) =>
        isDeleteWithCode ? row.code : row._id || row.id || row.documentId
      );
      const itemsToAdd = selectionReturns === "object" ? data : currentDataIds;
      if (e.target.checked) {
        const existingIds = selected.map((item) =>
          typeof item === "object"
            ? isDeleteWithCode
              ? item.code
              : item._id || item.id || item.documentId
            : item
        );
        const newItems = itemsToAdd.filter((itemOrId) => {
          const id =
            typeof itemOrId === "object"
              ? isDeleteWithCode
                ? itemOrId.code
                : itemOrId._id || itemOrId.id || itemOrId.documentId
              : itemOrId;
          return !existingIds.some(
            (existingId) => String(existingId) === String(id)
          );
        });
        const newSelection = [...selected, ...newItems];
        setSelected(newSelection);
      } else {
        const newSelection = selected.filter((item) => {
          const itemId =
            typeof item === "object"
              ? isDeleteWithCode
                ? item.code
                : item._id || item.id || item.documentId
              : item;
          return !currentDataIds.includes(itemId);
        });
        setSelected(newSelection);
      }
    },
    [data, isDeleteWithCode, selected, setSelected, selectionReturns]
  );

  const handleRowSelect = useCallback(
    (row) => {
      const idToCheck = isDeleteWithCode
        ? row.code
        : row._id || row.id || row?.documentId;
      const itemToAdd = selectionReturns === "object" ? row : idToCheck;

      const isSelected = selected.some((item) => {
        const itemId =
          typeof item === "object"
            ? isDeleteWithCode
              ? item.code
              : item._id || item.id || item.documentId
            : item;
        return String(itemId) === String(idToCheck);
      });

      const newSelection = isSelected
        ? selected.filter((item) => {
            const itemId =
              typeof item === "object"
                ? isDeleteWithCode
                  ? item.code
                  : item._id || item.id || item.documentId
                : item;
            return String(itemId) !== String(idToCheck);
          })
        : [...selected, itemToAdd];
      setSelected(newSelection);
    },
    [isDeleteWithCode, selected, setSelected, selectionReturns]
  );

  const handleEditClick = useCallback(
    (row) => {
      if (typeof onEdit === "function") {
        onEdit(row);
      }
    },
    [onEdit]
  );

  const handleViewClick = useCallback(
    (row) => {
      if (typeof onView === "function") {
        onView(row);
      }
    },
    [onView]
  );
  //   const handleViewClick = useCallback(
  //   (rowOrId) => {
  //     // Nếu là object (row đầy đủ) → dùng luôn
  //     if (rowOrId && typeof rowOrId === "object") {
  //       onView(rowOrId);
  //     } else {
  //       // Nếu chỉ là id → tìm row trong data (cách cũ)
  //       const foundRow = data.find(r => (r._id || r.id) === rowOrId);
  //       if (foundRow) onView(foundRow);
  //     }
  //   },
  //   [onView, data]
  // );

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

  const handlePopoverItemClick = useCallback(
    (item) => () => {
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
        onEdit: () => handleEditClick(rowId || row),
        onView: () => handleViewClick(rowId || row),
        onDelete: () => handleRowDeleteClick(row),
        onPopoverClick: (e) => handleClick(e, rowId, row),
        onCheckDigit: (e) => handleClick(e, rowId, row),
        onSign: (e) => handleClick(e, row._id, row),
        onVerifyFormat: (e) => handleClick(e, row._id, row),
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
    handlePageChange(e, page);
  }

  // Handler for next page button
  function handleNextPageClick(e) {
    handlePageChange(e, page + 2);
  }

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

  const handleMenuItemClick = useCallback(
    (action, row) => () => {
      // Nếu action có callback onClick riêng, ưu tiên gọi nó với row
      if (action?.onClick && typeof action.onClick === "function") {
        action.onClick(row);
      } else if (typeof onMoreAction === "function") {
        // Fallback: gọi onMoreAction nếu không có onClick
        onMoreAction(action, row);
      }
      handleCloseMore();
    },
    [onMoreAction, handleCloseMore]
  );

  return (
    <>
      <StyleBoxTittle>
        {!noneTitle &&
          isCheckTitle &&
          (currentPageTitle ? (
            <StyleTittleBox>
              <StyleTittleTyprography variant="h5">
                {currentPageTitle}
              </StyleTittleTyprography>
            </StyleTittleBox>
          ) : null)}
        <StyledPaper
          isMobieHeight={isMobieHeight}
          isInsideDialog={isInsideDialog}
          autoHeight={autoHeight}
          fixedHeight={fixedHeight}
          customMaxHeight={customMaxHeight}
          disablePaperHeight={disablePaperHeight}
        >
          {!onlyTable && (
            <StyledToolbar>
              <ToolbarContent>
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
                  {!disableFilter && (
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
                                      tempSelectedColumns.length ===
                                      filter?.length
                                    }
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
                            </StyleActionCheckBox>

                            {/* Grid 3 cột cho các checkbox */}
                            <StyleActionCellCheckBox>
                              {filter?.map((column) => (
                                <FormControlLabel
                                  key={column.code}
                                  control={
                                    <Checkbox
                                      checked={tempSelectedColumns.includes(
                                        column.name
                                      )}
                                      onChange={handleColumnFilterChangeDirect(
                                        column.name
                                      )}
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
                  )}

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

                        {isExport && (
                          <StyledButton
                            variant="contained"
                            onClick={handleExport}
                          >
                            <Tooltip title="Xuất file">
                              <DownloadIcon />
                            </Tooltip>
                          </StyledButton>
                        )}

                        {isExportInDetail && (
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

                        {!disableSynchronize && (
                          <StyledButton variant="contained" onClick={asyncData}>
                            <Tooltip title="Đồng bộ">
                              <LoopOutlined />
                            </Tooltip>
                          </StyledButton>
                        )}
                        {isSetting && (
                          <StyledButton variant="contained" onClick={onSetting}>
                            <Tooltip title="Cấu hình">
                              <SettingsIcon />
                            </Tooltip>
                          </StyledButton>
                        )}
                        {onSyncUser && (
                          <StyledButton
                            variant="contained"
                            onClick={onSyncUser}
                          >
                            <Tooltip title="Đồng bộ người dùng">
                              <LoopOutlined />
                            </Tooltip>
                          </StyledButton>
                        )}

                        {moreActions && moreActions()}
                      </>
                    )}
                  </ActionsBox>
                </ActionsContainer>
              )}
            </StyledToolbar>
          )}

          {extraContentBelowSearch && (
            <ExtraContentBox>{extraContentBelowSearch}</ExtraContentBox>
          )}

          <StyledTableContainer
            isMaxHeight={isMaxHeight}
            customMaxHeight={customMaxHeight}
          >
            <StyledTable>
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
                            data.some((row) =>
                              selected.includes(
                                isDeleteWithCode
                                  ? row.code
                                  : row._id || row.id || row.documentId
                              )
                            ) &&
                            !data.every((row) =>
                              selected.includes(
                                isDeleteWithCode
                                  ? row.code
                                  : row._id || row.id || row.documentId
                              )
                            )
                          }
                          checked={
                            data?.length > 0 &&
                            data.every((row) =>
                              selected.includes(
                                isDeleteWithCode
                                  ? row.code
                                  : row._id || row.id || row.documentId
                              )
                            )
                          }
                          onChange={handleSelectAll}
                        />
                      )}
                    </CheckboxHeaderCell>
                  )}
                  {/* {anableSTT && <STTHeaderCell id="col-stt">STT</STTHeaderCell>} */}
                  {anableSTT && <STTHeaderCell>STT</STTHeaderCell>}
                  {columns.map((column, idx) => {
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
                        {(() => {
                          const isSpecialColumn =
                            (column.title || column.name || column.label)
                              ?.toLowerCase()
                              .includes("trạng thái") ||
                            (column.title || column.name || column.label)
                              ?.toLowerCase()
                              .includes("tình trạng") ||
                            (column.title || column.name || column.label)
                              ?.toLowerCase()
                              .includes("hành động");
                          const columnAlign = isSpecialColumn
                            ? column.margin || "center"
                            : "left";
                          return (
                            <HeaderCellContainer align={columnAlign}>
                              {column.title || column.name || column.label}
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
                          );
                        })()}
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
                                const itemId =
                                  typeof item === "object"
                                    ? isDeleteWithCode
                                      ? item.code
                                      : item._id || item.id || item.documentId
                                    : item;
                                const currentRowId = isDeleteWithCode
                                  ? row.code
                                  : row._id || row.id || row.documentId;
                                return String(itemId) === String(currentRowId);
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
                          const colKey = column.name || column.row;
                          const cellValue = column.accessor
                            ? column.accessor(row)
                            : row[column.row || column.name];

                          // ===== INLINE EDIT: renderCell hoặc editable =====
                          const isEditable =
                            typeof column.renderCell === "function" ||
                            column.editable;

                          if (isEditable) {
                            let editContent = null;

                            if (typeof column.renderCell === "function") {
                              // renderCell nhận: { value, row, rowIndex, column, onChange }
                              editContent = column.renderCell({
                                value: cellValue,
                                row,
                                rowIndex: index,
                                column,
                                onChange: (newValue) =>
                                  handleCellChange(index, colKey, newValue),
                              });
                            }

                            return (
                              <StyledTableCell
                                key={colKey}
                                styleWidth={
                                  columnWidths[colKey]
                                    ? `${columnWidths[colKey]}px`
                                    : column.width
                                }
                                styleMinWidth={
                                  columnWidths[colKey]
                                    ? `${columnWidths[colKey]}px`
                                    : column.width
                                }
                                styleMaxWidth={
                                  columnWidths[colKey]
                                    ? `${columnWidths[colKey]}px`
                                    : column.width
                                }
                                align={column.alignCenter ? "center" : "left"}
                              >
                                {editContent}
                              </StyledTableCell>
                            );
                          }

                          // ===== LOGIC CŨ: hiển thị read-only =====
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
                            const stringValue =
                              cellValue != null ? String(cellValue) : "–";
                            // Check if string contains HTML tags
                            if (
                              typeof stringValue === "string" &&
                              /<[^>]+>/.test(stringValue)
                            ) {
                              displayValue = stringValue;
                              isHtml = true;
                            } else {
                              displayValue = stringValue;
                            }
                          }

                          // Get tooltip text - strip HTML tags if needed
                          const getTooltipText = () => {
                            if (React.isValidElement(displayValue)) {
                              return ""; // Don't show tooltip for React elements
                            }
                            if (isHtml && typeof displayValue === "string") {
                              // Strip HTML tags for tooltip
                              return displayValue.replace(/<[^>]*>/g, "");
                            }
                            if (typeof displayValue === "string") {
                              return displayValue;
                            }
                            if (displayValue != null) {
                              return String(displayValue);
                            }
                            return "";
                          };

                          const tooltipText = getTooltipText();

                          return (
                            <StyledTableCell
                              key={colKey}
                              styleWidth={
                                columnWidths[colKey]
                                  ? `${columnWidths[colKey]}px`
                                  : column.width
                              }
                              styleMinWidth={
                                columnWidths[colKey]
                                  ? `${columnWidths[colKey]}px`
                                  : column.width
                              }
                              styleMaxWidth={
                                columnWidths[colKey]
                                  ? `${columnWidths[colKey]}px`
                                  : column.width
                              }
                              align={
                                (column.title || column.name || column.label)
                                  ?.toLowerCase()
                                  .includes("trạng thái") ||
                                (column.title || column.name || column.label)
                                  ?.toLowerCase()
                                  .includes("tình trạng") ||
                                (column.title || column.name || column.label)
                                  ?.toLowerCase()
                                  .includes("hành động")
                                  ? column.margin || "center"
                                  : "left"
                              }
                            >
                              <Tooltip
                                title={tooltipText || ""}
                                placement="top"
                                arrow
                              >
                                <StyledTableContentTolltip>
                                  {isHtml &&
                                  typeof displayValue === "string" ? (
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: encodeHTML(displayValue),
                                      }}
                                    />
                                  ) : (
                                    displayValue
                                  )}
                                </StyledTableContentTolltip>
                              </Tooltip>
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
                                    onClick: (e) =>
                                      handleClick(e, row.id || row._id, row),
                                  });
                                }

                                if (disableDigital) {
                                  items.push({
                                    key: "digit",
                                    title: "Ký số",
                                    icon: <SaveAsIcon />,
                                    onClick: (e) =>
                                      handleClick(e, row._id, row),
                                  });
                                }

                                if (Signed) {
                                  items.push({
                                    key: "signed",
                                    title: "Kiểm tra định dạng",
                                    icon: <TaskIcon />,
                                    onClick: (e) =>
                                      handleClick(e, row._id, row),
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

                              return (
                                <>
                                  {" "}
                                  {!isSmallScreen ? (
                                    items.map((it) => (
                                      <Tooltip key={it.key} title={it.title}>
                                        <ActionIconButton
                                          colorType={it.colorType}
                                          onClick={it.onClick}
                                        >
                                          {it.icon}
                                        </ActionIconButton>
                                      </Tooltip>
                                    ))
                                  ) : (
                                    <Tooltip title="Thêm tùy chọn">
                                      <ActionIconButton
                                        onClick={handlers.onPopoverClick}
                                      >
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
                        )}
                      </StyledTableRow>
                    );
                  })
                )}
              </TableBody>
            </StyledTable>
          </StyledTableContainer>

          {(!onlyTable || paginationProps) && (
            <ActionsContainer
              styleJustifyContent={isSmallScreen ? "flex-end" : "flex-end"}
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
                    {/* Tổng số bản ghi */}
                    <span>
                      Tổng {total} {page * rowsPerPage + 1}-
                      {Math.min((page + 1) * rowsPerPage, total)} bản ghi
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
                      {generatePaginationPages(
                        page,
                        totalPages,
                        handlePageChange
                      )}
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
                        {rowsPerPageOptions.map(function (option) {
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
      <Menu anchorEl={anchorEl} open={open} onClose={handleCloseMore}>
        {moreActions &&
          Array.isArray(moreActions) &&
          moreActions.map((action) => (
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
                  styledColor={action.color === "error" ? "error" : "inherit"}
                >
                  {action?.icon}
                </StyledListItemIcon>
              )}
              <ListItemText>{action?.label}</ListItemText>
            </MenuItem>
          ))}
      </Menu>
    </>
  );
};

CusTomTableFreeStyle.propTypes = {
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
  isExportInDetail: PropTypes.bool,
  onExport: PropTypes.func,
  onExportInDetail: PropTypes.func,
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
  disableFilter: PropTypes.bool,
  onSearch: PropTypes.func,
  onDataChange: PropTypes.func, // (newData, rowIndex, columnName, newValue) => void
};
CusTomTableFreeStyle.propTypes = {
  ...CusTomTableFreeStyle.propTypes,
  filter: PropTypes.arrayOf(PropTypes.object),
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      renderCell: PropTypes.func, // ({ value, row, rowIndex, column, onChange }) => ReactNode
      editable: PropTypes.bool, // Đánh dấu cột có thể inline edit
    })
  ),
};

CusTomTableFreeStyle.defaultProps = {
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
  disableFilter: false,
  disablePaperHeight: false,
};

export default CusTomTableFreeStyle;
