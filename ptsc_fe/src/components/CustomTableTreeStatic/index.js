import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    useRef,
} from "react";
import {
    useTheme,
    useMediaQuery
} from "@mui/material";
import {
    Search,
    Add,
    DeleteOutline,
    MoreVert as MoreVertIcon,
    RemoveRedEyeOutlined,
    EditOutlined,

} from "@mui/icons-material";

import {
    FilterBox,
    HeaderCellContainer,
    SortIconContainer,
    StyledArrowDown,
    StyledArrowUp,
    StyledButton,
     StyledPaper,
    
    StyledTable,
    SearchContainer,
    ActionsContainer,
    RowsPerPageSelect,
    StyledTableCell,
    StyledTableCellActions,
    StyledTableContainer,
    StyledTableHead,
    StyledTableRow,
    StyledToolbar,
    StyledPagination,
    ColumnResizer,
    PopoverContainer,
    ToolbarContent,
    MoreSearchBox,
    PaginationContainer,
    ActionsBox,
    ExtraContentBox,
    RowsPerPageBox,
    PaginationStack,
    SearchAdornment,
    STTHeaderCell,
    ActionIconButton,
    AdvancedFilterWrapper,
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
} from "@styles/CustomTable.styles";
import {
    TreeHeaderCellContainer,
    TreeRowIndenter,
    TreeCheckboxSlot,
 
    TreeToggleWrapper,
    TreeRowBoxLevel,
    TreeCheckbox,
    StyledCollapseIcon,
    StyledExpandIcon,
    TreeToggleButton,
    NodeName,
    StyledSearchFieldJoined,
    StyledSearchButtonJoined,
    StyledFilterButtonJoined,
     
} from "@styles/CustomTableTree.styles";
// import "./CustomCss.css";
import CustomInput from "@components/CustomInput/CustomInput";


const advancedFilterChange = (e, setter) => {
    if (!setter) return;
    const val = e?.target?.value;
    setter(val);
};

import { useToast } from "@components/common/ToastProvider";
import { clearWidthSpace } from "@utils/Common/Common";
import { useLocation, matchPath } from "react-router-dom";
import { useDynamicMenuRoutes } from "../../hooks/useDynamicMenuRoutes";
import { AuthContext } from "../../AuthContext/AuthProvider";
import { find } from "lodash";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { settingViewConfig } from "@redux/slices/ViewConfig/ViewConfigSlice";

import TuneIcon from "@builder-table/components/TuneIcon";
import { StyleBoxTittle, StyleTittleBox, StyleTittleTyprography } from "@builder-table/components/SearchSection.styles";
import FilterDropdown from "@components/CustomTable/FilterDropdown";
import { useDispatch, useSelector } from "react-redux";
import { SkyBox, SkyCheckbox, SkyClickAwayListener, SkyFormControlLabel, SkyIconButton, SkyListItemText, SkyMenu, SkyMenuItem, SkyPopover, SkyTableBody, SkyTooltip } from "@styles/SkyStyles";
import CustomButton from "@components/CustomButton";
import LoadingDialog from "@components/LoadingDialog";
import DOMPurify from "dompurify";
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

const CustomTableTreeStatic = ({
    reloadTable,
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
    onSelectView,
    reload,
    disableCheckbox = false,
    disableSelectAll = false,
    disableEdit = false,
    disableDetail = false,
    disableAdd = false,
    disableAct = false,
    disableSearch = false,
    refreshTrigger,
    optionMore,
    anableSTT = false,
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
    filtersAdvanced = false,
    advancedFiltersParams,
    advancedFilterConfig = [],
    showReportSelect = false,
    reportOptions = [],
    reportValue,
    onReportChange,
    disableClearReport = false,
    placeholder,
    alwaysShowCheckbox = false,
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
    const [loading, setLoading] = useState(false);
    const currentPageTitle = useSelector((state) => state.layout.currentPageTitle);

    const toast = useToast();
    const [openAdvancedFilter, setOpenAdvancedFilter] = useState(false);


    useEffect(() => {
        if (reload) {
            setSelected([]);
        }
    }, [reload, setSelected]);
    useEffect(() => {
        if (filter) {
            setSelectedColumns(filter.map((col) => col.name));
        }
    }, [filter]);

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
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    // Ref để theo dõi xem đã fetch lần đầu chưa
    const hasFetchedRef = useRef(false);


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

    const { dataViewConfig } = useSelector((state) => state.viewConfig);
    const [columns, setColumns] = useState([]);
    const [viewConfigTable, setViewConfigTable] = useState();
    const dispatch = useDispatch();
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
                        // toast("Cập nhật độ rộng cột thất bại!", "error");
                        logger.log("Cập nhật độ rộng cột thất bại!", error);
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
    const [treeData, setTreeData] = useState([]);

    // Build tree structure from flat data
    const buildTreeStructure = useCallback((items) => {
        if (!items || items.length === 0) return [];

        const itemMap = {};
        const rootItems = [];

        // Create a map of all items by ID
        items.forEach(item => {
            itemMap[item.id] = { ...item, children: [] };
        });

        // Build the tree structure
        items.forEach(item => {
            if (item.parent && itemMap[item.parent]) {
                // This item has a parent, add it as a child
                itemMap[item.parent].children.push(itemMap[item.id]);
            } else {
                // This is a root item (no parent or parent not found)
                rootItems.push(itemMap[item.id]);
            }
        });

        return rootItems;
    }, []);

    useEffect(() => {
        if (propData) {
            setData(propData);
            setTotal(propData.length);
            const tree = buildTreeStructure(propData);
            setTreeData(tree);
        }
    }, [propData, buildTreeStructure]);

    // Toggle expand/collapse for a node
    const toggleNode = useCallback((nodeId) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    }, []);

    // Flatten tree for rendering (respecting expand/collapse state)
    const flattenTree = useCallback((nodes, level = 0) => {
        let result = [];
        nodes.forEach(node => {
            result.push({ ...node, level });
            if (node.children && node.children.length > 0 && expandedNodes.has(node.id)) {
                result = result.concat(flattenTree(node.children, level + 1));
            }
        });
        return result;
    }, [expandedNodes]);
    const [anchorEl, setAnchorEl] = useState(null);

    const [selectedRow, setSelectedRow] = useState(null);
    const [openPopoverId, setOpenPopoverId] = useState(null);
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


    const handleClick = useCallback((event, rowId, row) => {
        setAnchorEl(event.currentTarget);
        setOpenPopoverId(rowId);
        setSelectedRow(row);
    }, []);

    useEffect(() => {
        if (reloadTable) {
            fetchTableData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadTable]);


    const handleClose = useCallback(() => {
        setAnchorEl(null);
        setOpenPopoverId(null);
        setSelectedRow(null);
    }, []);

    const fetchTableData = useCallback(
        async (query = "", code = [], sort = null) => {

            if (fetchData) {
                setLoading(true);
                const validCodes = Array.isArray(code)
                    ? code.filter((c) => c && c !== "parent")
                    : [];
                // Format ngày theo định dạng DD-MM-YYYY


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
                    ...(sort ? { sort } : {}),
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
                        const tree = buildTreeStructure(mappedData);
                        setTreeData(tree);
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
            fetchData,
            mapFunction,
            page,
            rowsPerPage,
            toast,
            advancedFilters,
            buildTreeStructure
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

            // Tạo key duy nhất cho dependencies
            const depKey = JSON.stringify({
                page,
                rowsPerPage,
                orderBy,
                order,
                committedSearchText,
                selectedColumns,
                advancedFilters,
                refreshTrigger,
                reload
            });

            // Chỉ fetch nếu dependencies thực sự thay đổi
            if (hasFetchedRef.current !== depKey) {
                fetchTableData(committedSearchText, codeValues, sort);
                hasFetchedRef.current = depKey;
            }
        } else {
            // Reset khi dialog đóng
            hasFetchedRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        rowsPerPage,
        refreshTrigger,
        reload,
        orderBy,
        order,
        filter,
        committedSearchText,
        selectedColumns,
        advancedFilters,
    ]);

    const handleSearchClick = useCallback(
        (query) => {
            setPage(0);

            setCommittedSearchText(query.trim());
        },

        []
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



    const handlePageChange = useCallback((e, newPage) => {
        setPage(newPage - 1);
    }, []);

    const handleRowsPerPageChange = useCallback((e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
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
        (row) => {
            if (typeof onSelectView === "function") {
                onSelectView(row);
            } else if (typeof onView === "function") {
                const rowId = typeof row === "object" ? row._id || row.id : row;
                onView(rowId);
            }
        },
        [onView, onSelectView]
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
                onEdit: () => handleEditClick(row.id || row._id || row),
                onView: () => handleViewClick(row),
                onDelete: () => handleRowDeleteClick(row),
                onPopoverClick: (e) => handleClick(e, rowId, row),
                onCheckDigit: (e) => handleClick(e, rowId, row),
                onSign: (e) => handleClick(e, row._id, row),
                onVerifyFormat: (e) => handleClick(e, row._id, row),
                onRowSelect: () => handleRowSelect(row),
                onToggleNode: () => toggleNode(row.id),
                onToggleNodeSafe: (e) => { e.stopPropagation(); toggleNode(row.id); },
                onCheckboxCellClick: (e) => e.stopPropagation(),
            };
        },
        [
            handleEditClick,
            handleViewClick,
            handleRowDeleteClick,
            handleClick,
            handleRowSelect,
            toggleNode,
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
        setSelectedColumns(tempSelectedColumns); // ✅ Cập nhật state thật
        handleSearchButtonClick();
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

        handleCloseFilter();
    }, [handleCloseFilter]);

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
                <StyledPaper isMobieHeight={isMobieHeight} isInsideDialog={isInsideDialog} autoHeight={autoHeight} fixedHeight={fixedHeight} customMaxHeight={customMaxHeight} disablePaperHeight={disablePaperHeight}>
                    {!onlyTable && (
                        <StyledToolbar>
                            <ToolbarContent>
                                {!disableSearch && (
                                    <>
                                        <SearchContainer noPaddingLeft>
                                            <StyledSearchFieldJoined
                                                variant="outlined"
                                                size="small"
                                                placeholder={placeholder || "Tìm kiếm..."}
                                                value={inputValue}
                                                onChange={handleInputChange}
                                                onBlur={handleInputBlur}
                                                InputProps={{
                                                    endAdornment: (
                                                        <SearchAdornment>
                                                            {searchText && (
                                                                <SkyIconButton
                                                                    aria-label="clear search"
                                                                    onClick={handleClearSearch}
                                                                    edge="end"
                                                                    size="small"
                                                                >
                                                                    <StyledClearIcon />
                                                                </SkyIconButton>
                                                            )}
                                                        </SearchAdornment>
                                                    ),
                                                }}
                                            />
                                            <SkyClickAwayListener onClickAway={handleFilterAway}>
                                                <SkyBox>
                                                    {filter && filter.length > 1 && (
                                                        <StyledFilterButtonJoined onClick={handleFilterToggle}>
                                                            <TuneIcon />
                                                        </StyledFilterButtonJoined>
                                                    )}
                                                    {openFilter && (
                                                        <FilterBox>
                                                            {/* Header */}
                                                            <StyleBoxActionDropDown>
                                                                <span>Lọc tìm kiếm</span>
                                                                <Search />
                                                            </StyleBoxActionDropDown>

                                                            {/* Checkbox "Tất cả" */}
                                                            <StyleActionCheckBox>
                                                                <SkyFormControlLabel
                                                                    control={
                                                                        <SkyCheckbox
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
                                                                    <SkyFormControlLabel
                                                                        key={column.code}
                                                                        control={
                                                                            <SkyCheckbox
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
                                                </SkyBox>
                                            </SkyClickAwayListener>

                                            {/* Ô tìm kiếm ngày tháng đơn */}
                                                <StyledSearchButtonJoined
                                                    variant="contained"
                                                    onClick={handleSearchButtonClick}
                                                >
                                                    <SkyTooltip title="Tìm kiếm">
                                                        <Search />
                                                    </SkyTooltip>
                                                </StyledSearchButtonJoined>
                                            </SearchContainer>
                                    </>
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
                                    filtersAdvanced &&
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

                            </ToolbarContent>

                            <ActionsContainer
                                styleJustifyContent={isSmallScreen ? "flex-end" : "flex-end"}
                            >
                                <ActionsBox>
                                    {selected.length > 0 && isSmallScreen ? (
                                        <StyleBoxActionsRespon>



                                            {renderCustomActions && renderCustomActions(selected)}



                                            {!disableAdd &&
                                                (permissionsForModule === null ||
                                                    permissionsForModule === "all" ||
                                                    permissionsForModule.includes("add")) && (
                                                    <StyledButton variant="contained" onClick={onAdd}>
                                                        <SkyTooltip title="Thêm mới">
                                                            <Add />
                                                        </SkyTooltip>
                                                    </StyledButton>
                                                )}
                                        </StyleBoxActionsRespon>
                                    ) : (
                                        <>



                                            {renderCustomActions && renderCustomActions(selected)}


                                            {!disableAdd &&
                                                (permissionsForModule === null ||
                                                    permissionsForModule === "all" ||
                                                    permissionsForModule.includes("add")) && (
                                                    <StyledButton variant="contained" onClick={onAdd}>
                                                        <SkyTooltip title="Thêm mới">
                                                            <Add />
                                                        </SkyTooltip>
                                                    </StyledButton>
                                                )}


                                            {moreActions && moreActions()}
                                        </>
                                    )}
                                </ActionsBox>
                            </ActionsContainer>
                        </StyledToolbar>
                    )}

                    {extraContentBelowSearch && (
                        <ExtraContentBox>{extraContentBelowSearch}</ExtraContentBox>
                    )}

                    <StyledTableContainer isMaxHeight={isMaxHeight} customMaxHeight={customMaxHeight}>
                        <StyledTable>
                            <StyledTableHead>
                                <StyledTableRow>
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
                                                stylePaddingLeft={(idx === 0 || column.title === "Tiêu đề cuộc họp" || column.name === "Tiêu đề cuộc họp" || column.row === "Tiêu đề cuộc họp" || column.label === "Tiêu đề cuộc họp") ? "64px" : undefined}

                                            >
                                                {idx === 0 ? (
                                                    <TreeRowBoxLevel>
                                                        {!disableCheckbox && !disableSelectAll && (
                                                            <TreeCheckboxSlot>
                                                                <TreeCheckbox
                                                                    size="small"
                                                                    indeterminate={
                                                                        data?.length > 0 &&
                                                                        data.some((row) => {
                                                                            const rowId = isDeleteWithCode ? row.code : row._id || row.id || row.documentId;
                                                                            return selected.some(item => (typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item) === rowId);
                                                                        }) &&
                                                                        !data.every((row) => {
                                                                            const rowId = isDeleteWithCode ? row.code : row._id || row.id || row.documentId;
                                                                            return selected.some(item => (typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item) === rowId);
                                                                        })
                                                                    }
                                                                    checked={
                                                                        data?.length > 0 &&
                                                                        data.every((row) => {
                                                                            const rowId = isDeleteWithCode ? row.code : row._id || row.id || row.documentId;
                                                                            return selected.some(item => (typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item) === rowId);
                                                                        })
                                                                    }
                                                                    onChange={handleSelectAll}
                                                                />
                                                            </TreeCheckboxSlot>
                                                        )}
                                                        <TreeHeaderCellContainer align={column.align || "left"}>
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
                                                        </TreeHeaderCellContainer>
                                                    </TreeRowBoxLevel>
                                                ) : (
                                                    <HeaderCellContainer align={column.align || "left"}>
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
                                                )}
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

                            <SkyTableBody>
                                {data.length === 0 ? (
                                    <StyledTableRow>
                                        <StyledTableCell
                                            colSpan={columns.length + (anableSTT ? 1 : 0) + (!disableAct ? 1 : 0)}
                                            styleTextAlign ='center'
                                            align="center"
                                        >
                                            Không có dữ liệu
                                        </StyledTableCell>
                                    </StyledTableRow>
                                ) : (
                                    flattenTree(treeData).map((row, index) => {
                                        const handlers = createRowHandlers(row);
                                        const rowId = row.id || row._id;
                                        const isPopoverOpen =
                                            openPopoverId === rowId && Boolean(anchorEl);
                                        const hasChildren = row.children && row.children.length > 0;
                                        const isExpanded = expandedNodes.has(row.id);

                                        return (
                                            <StyledTableRow
                                                key={row._id || row.id}
                                                index={index}
                                                onClick={onSelectView ? () => onSelectView(row) : undefined}
                                                clickable={onSelectView ? true : undefined}
                                            // className="CustomCss"
                                            >
                                                {/* Removed old Checkbox Header Cell */}
                                                {anableSTT && (

                                                    <StyledTableCell>
                                                        {page * rowsPerPage + index + 1}
                                                    </StyledTableCell>
                                                )}

                                                {columns.map((column, colIdx) => {
                                                    const cellValue = column.accessor
                                                        ? column.accessor(row)
                                                        : row[column.row || column.name];
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
                                                            wrapContent={column.wrapContent}
                                                            styleTextAlign='left'
                                                        >
                                                            {colIdx === 0 ? (
                                                                <TreeRowIndenter $level={row.level || 0}>
                                                                    <TreeRowBoxLevel>
                                                                        <TreeToggleWrapper>
                                                                            {hasChildren && (
                                                                                <TreeToggleButton size="small" onClick={handlers.onToggleNodeSafe}>
                                                                                    {isExpanded ? <StyledCollapseIcon /> : <StyledExpandIcon />}
                                                                                </TreeToggleButton>
                                                                            )}
                                                                        </TreeToggleWrapper>

                                                                        {!disableCheckbox && (
                                                                            <TreeCheckboxSlot>
                                                                                {(alwaysShowCheckbox || row.flags?.hideCheckbox !== true) && (
                                                                                    <TreeCheckbox
                                                                                        size="small"
                                                                                        checked={selected.some((item) => {
                                                                                            const itemId = typeof item === 'object' ? (isDeleteWithCode ? item.code : item._id || item.id || item.documentId) : item;
                                                                                            const currentRowId = isDeleteWithCode ? row.code : row._id || row.id || row.documentId;
                                                                                            return itemId === currentRowId;
                                                                                        })}
                                                                                        onChange={handlers.onRowSelect}
                                                                                        onClick={handlers.onCheckboxCellClick}
                                                                                    />
                                                                                )}
                                                                            </TreeCheckboxSlot>
                                                                        )}

                                                                        <NodeName onClick={onSelectView ? undefined : handlers.onToggleNodeSafe}>
                                                                            {isHtml && typeof displayValue === 'string' ? (
                                                                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayValue) }} />
                                                                            ) : (
                                                                                displayValue
                                                                            )}
                                                                        </NodeName>
                                                                    </TreeRowBoxLevel>
                                                                </TreeRowIndenter>
                                                            ) : (
                                                                isHtml && typeof displayValue === 'string' ? (
                                                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayValue) }} />
                                                                ) : (
                                                                    displayValue
                                                                )
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
                                                                            handleViewClick(row),
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


                                                            return (
                                                                <>  {!isSmallScreen ? (
                                                                    items.map((it) => (
                                                                        <SkyTooltip key={it.key} title={it.title}>
                                                                            <ActionIconButton
                                                                                colorType={it.colorType}
                                                                                onClick={it.onClick}
                                                                            >
                                                                                {it.icon}
                                                                            </ActionIconButton>
                                                                        </SkyTooltip>
                                                                    ))
                                                                ) : (
                                                                    <SkyTooltip title="Thêm tùy chọn">
                                                                        <ActionIconButton
                                                                            onClick={handlers.onPopoverClick}
                                                                        >
                                                                            <MoreVertIcon />
                                                                        </ActionIconButton>
                                                                    </SkyTooltip>
                                                                )}

                                                                    <SkyPopover
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
                                                                                <CustomButton
                                                                                    key={it.key}
                                                                                    fullWidth
                                                                                    startIcon={it.icon}
                                                                                    onClick={handlePopoverItemClick(it)}
                                                                                >
                                                                                    {it.title}
                                                                                </CustomButton>
                                                                            ))}
                                                                        </PopoverContainer>
                                                                    </SkyPopover>
                                                                </>
                                                            );
                                                        })()}
                                                    </StyledTableCellActions>
                                                )}
                                            </StyledTableRow>
                                        );
                                    })
                                )}
                            </SkyTableBody>
                        </StyledTable>
                    </StyledTableContainer>

                    {(!onlyTable || paginationProps) && (
                        <ActionsContainer
                            styleJustifyContent={isSmallScreen ? "flex-end" : "flex-end"}
                        >
                            {(!isSmallScreen || paginationProps) && (

                                <PaginationWrapper>
                                    <PaginationContainerStyled>
                                        {/* Tổng số bản ghi */}
                                        <span>
                                            Tổng {total} {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, total)} bản ghi
                                        </span>

                                        {/* Nút Previous */}
                                        <SkyIconButton
                                            size="small"
                                            onClick={handlePrevPageClick}
                                            disabled={page === 0}
                                        >
                                            <StyleIcon />
                                        </SkyIconButton>

                                        {/* Hiển thị các số trang */}
                                        <StyleActionPage>
                                            {generatePaginationPages(page, totalPages, handlePageChange)}
                                        </StyleActionPage>

                                        {/* Nút Next */}
                                        <SkyIconButton
                                            size="small"
                                            onClick={handleNextPageClick}
                                            disabled={page >= totalPages - 1}
                                        >
                                            <StyleIconArrow />
                                        </SkyIconButton>

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
                                                        <SkyMenuItem key={option} value={option}>
                                                            {option}
                                                        </SkyMenuItem>
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
                                            <SkyMenuItem key={option} value={option}>
                                                {option}
                                            </SkyMenuItem>
                                        ))}
                                    </RowsPerPageSelect>
                                </RowsPerPageBox>
                            </PaginationContainer>
                        </ActionsContainerFooter>
                    )}
                </StyledPaper>
            </StyleBoxTittle>

            <LoadingDialog open={loading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
            <SkyMenu
                anchorEl={anchorEl}
                open={open}
                onClose={handleCloseMore}
            >
                {moreActions && Array.isArray(moreActions) && moreActions.map((action) => (
                    <SkyMenuItem
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
                        <SkyListItemText>{action?.label}</SkyListItemText>
                    </SkyMenuItem>
                ))}
            </SkyMenu>

        </>
    );
};



export default CustomTableTreeStatic;
