import React, {
    memo,
    useCallback,
    useContext,
    useEffect,
    useState,
    useMemo,
} from "react";
import { styled } from "@mui/material/styles";
import { ResponsiveContainer } from "recharts";
import { ResultPaper } from '@styles/StatisticsAndReports/StatisticsAndReports.styles';

const FlexibleResultPaper = styled(ResultPaper)({
    flex: 1,
    minWidth: 0,
    height: 'fit-content',
});

const StyledResponsiveContainer = styled(ResponsiveContainer)({
    width: '100% !important',
    height: '100% !important',
});



import {
    HeaderCellContainer,
    SortIconContainer,
    StyledArrowDown,
    StyledArrowUp,
    StyledTable,
    StyledTableCell,
    StyledTableContainer,
    StyledTableHead,
    StyledTableRow,
    ColumnResizer,
    STTHeaderCell,
    StyledButton,

} from "@styles/CustomTable.styles";
import { SkyTableBody, SkyDivider, SkyTooltip, SkyFormControlLabel, SkyRadio } from "@styles/SkyStyles";
import { useToast } from "@components/common/ToastProvider";
import { useDispatch, useSelector } from "react-redux";
import { settingViewConfig } from "@redux/slices/ViewConfig/ViewConfigSlice";
import { AuthContext } from "@AuthContext/AuthProvider";
import LoadingDialog from "@components/LoadingDialog";
import {
    SectionPaper,
    SectionTitle, ResultTitle, ResultHeaderBox,
    StatisticBoxInput, FilterHeaderBox, FilterCollapseBox, FilterSectionTitle,
    RadioFilterContainer, StyledFilterTitleBox
} from '@styles/StatisticsAndReports/StatisticsAndReports.styles'
import CustomInput from '@components/CustomInput/CustomInputBase'
import FilterDropdown from './Filter';
import { KeyboardArrowUp, KeyboardArrowDown, Archive } from '@mui/icons-material';
import { Collapse, IconButton, Menu, MenuItem, ListItemText, Typography, PaginationItem } from '@mui/material';
import { PieChart, Pie, Cell } from "recharts";
import DOMPurify from "dompurify";
import {
    PaginationContainer as BeautifulPaginationContainer,
    InfoBox as BeautifulInfoBox,
    StyledPagination as BeautifulStyledPagination,
    RowsPerPageBox as BeautifulRowsPerPageBox,
    DisplayTypography as BeautifulDisplayTypography,
    RowsPerPageSelect as BeautifulRowsPerPageSelect,
    RowsPerPageStack as BeautifulRowsPerPageStack,
} from "@builder-table/components/PaginationSection.styles";

// const StylePageButtonReport = styled(StylePageButton)({
//     fontSize: "0.8125rem",
// });

// const StylePageDotsReport = styled(StylePageDots)({
//     fontSize: "0.8125rem",
// });

// const createPageButton = (pageNumber, currentPage, handlePageChange) => {
//     const isActive = currentPage === pageNumber;

//     const handleClick = function () {
//         handlePageChange(null, pageNumber);
//     };

//     return (
//         <StylePageButtonReport
//             key={pageNumber}
//             size="small"
//             onClick={handleClick}
//             isActive={isActive}
//         >
//             {pageNumber}
//         </StylePageButtonReport>
//     );
// };

// const createPageDots = (key) => {
//     return <StylePageDotsReport key={key}>...</StylePageDotsReport>;
// };


const CustomTableReports = (props) => {
    const { isMaxHeight, customMaxHeight, filter, disableDefaultSort = false,
        defaultSort, onOrder, fetchData, advancedFilters: externalAdvancedFilters, idList, mapFunction, codeModule, columns: propColumns,
        tableSelectOptions, selectedTable, onChangeTable, onExport, title, advancedFilterConfig, initialFilters,
        autoGenerateReport,
        isLeader, reportType, onReportTypeChange, showRadioFilter,
        onSelectView, isTruongPhong
    } = props;
    const [page, setPage] = useState(0);
    const [columns, setColumns] = useState([]);
    const [viewConfigTable, setViewConfigTable] = useState();
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const [rowsPerPageOptions, setRowsPerPageOptions] = useState([25, 50, 100]);
    const { systemParams } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [committedSearchText] = useState("");
    const { dataViewConfig } = useSelector((state) => state.viewConfig);

    const [openFilter, setOpenFilter] = useState(true);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters || {});
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const openExportMenu = Boolean(exportAnchorEl);
    const toast = useToast();

    const hasFilterPanel = advancedFilterConfig && advancedFilterConfig.length > 0;
    const [isReportGenerated, setIsReportGenerated] = useState(
        !hasFilterPanel ||
        (initialFilters && Object.keys(initialFilters).length > 0) ||
        Boolean(autoGenerateReport)
    );

    useEffect(() => {
        if (initialFilters && Object.keys(initialFilters).length > 0) {
            setAppliedFilters(prev => {
                // Kiểm tra xem các giá trị trong initialFilters có khác với giá trị hiện tại không
                const isDifferent = Object.keys(initialFilters).some(key =>
                    JSON.stringify(prev[key]) !== JSON.stringify(initialFilters[key])
                );

                if (isDifferent) {
                    // Cập nhật các trường mới. Nhờ key={reportType} ở phía ngoài, 
                    // khi đổi báo cáo thì component remount và prev sẽ là {} nên không bị dính filter cũ.
                    return { ...prev, ...initialFilters };
                }
                return prev;
            });
            setIsReportGenerated(true);
        }
    }, [initialFilters]);

    useEffect(() => {
        if (autoGenerateReport) {
            setIsReportGenerated(true);
        }
    }, [autoGenerateReport]);

    const handleToggleFilter = useCallback(() => setOpenFilter(prev => !prev), []);
    const handleApplyFilter = useCallback((filters) => {
        setAppliedFilters(filters);
        setIsReportGenerated(true);
        setPage(0);
    }, []);

    const handleChangeTable = useCallback((e) => {
        if (onChangeTable) {
            onChangeTable(e);
        }
        setAppliedFilters({});
        setIsReportGenerated(false); // Luôn set false khi đổi bảng
        setData([]); // Clear dữ liệu cũ, bảng sẽ hiển thị trắng "Không có dữ liệu"
        setTotal(0); // Reset bộ đếm số lượng bản ghi
        setPage(0);
    }, [onChangeTable]);

    const finalAdvancedFilters = useMemo(() => {
        return Object.keys(appliedFilters).length > 0 || advancedFilterConfig ? appliedFilters : (externalAdvancedFilters || {});
    }, [appliedFilters, advancedFilterConfig, externalAdvancedFilters]);

    const handleReportTypeChange = useCallback((e) => {
        if (onReportTypeChange) {
            onReportTypeChange(e.target.value);
        }
    }, [onReportTypeChange]);

    const handleStopPropagation = useCallback((e) => {
        e.stopPropagation();
    }, []);


    const handleExportClick = useCallback((event) => {
        setExportAnchorEl(event.currentTarget);
    }, []);

    const handleExportClose = useCallback(() => {
        setExportAnchorEl(null);
    }, []);

    const handleExportPDF = useCallback(async () => {
        if (onExport) {
            setLoading(true);
            try {
                const blob = await onExport("pdf", {
                    ...finalAdvancedFilters,
                    page: page + 1,
                    limit: rowsPerPage,
                });
                if (blob) {
                    const url = window.URL.createObjectURL(new Blob([blob]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `${props.fileName || 'bao-cao'}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }
            } catch (error) {
                toast("Xuất file PDF thất bại", "error");
            } finally {
                setLoading(false);
            }
        }
        handleExportClose();
    }, [onExport, finalAdvancedFilters, handleExportClose, page, rowsPerPage, props.fileName, toast]);

    const handleExportExcel = useCallback(async () => {
        if (onExport) {
            setLoading(true);
            try {
                const blob = await onExport("excel", {
                    ...finalAdvancedFilters,
                    page: page + 1,
                    limit: rowsPerPage,
                });
                if (blob) {
                    const url = window.URL.createObjectURL(new Blob([blob]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `${props.fileName || 'bao-cao'}.xlsx`);
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }
            } catch (error) {
                toast("Xuất file Excel thất bại", "error");
            } finally {
                setLoading(false);
            }
        }
        handleExportClose();
    }, [onExport, finalAdvancedFilters, handleExportClose, page, rowsPerPage, props.fileName, toast]);

    const [selectedColumns, setSelectedColumns] = useState(
        filter?.map((col) => col.name) || []
    );
    const [total, setTotal] = useState(0);
    const [data, setData] = useState([]);
    const [chartStats, setChartStats] = useState(null);
    const [resizingCol, setResizingCol] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);
    const dispatch = useDispatch();
    const getInitialSort = () => {
        if (disableDefaultSort || !defaultSort) {
            return { initialOrderBy: null, initialOrder: "asc" };
        }

        // Kiểm tra nếu defaultSort là object
        if (typeof defaultSort === "object" && defaultSort !== null) {
            return {
                initialOrderBy: defaultSort.orderBy,
                initialOrder: defaultSort.order || "asc",
            };
        }
        // Giữ lại logic cũ nếu defaultSort là string
        if (typeof defaultSort === "string") {
            const [field, direction] = defaultSort.split(":");
            return { initialOrderBy: field, initialOrder: direction || "asc" };
        }
        return { initialOrderBy: null, initialOrder: "asc" };
    };

    const { initialOrderBy, initialOrder } = getInitialSort();
    const [order, setOrder] = useState(initialOrder);
    const [orderBy, setOrderBy] = useState(initialOrderBy);

    const [columnWidths, setColumnWidths] = useState(() => {
        const map = {};
        (columns || []).forEach((c) => {
            if (c?.width) map[c.row] = c.width;
        });
        return map;
    });


    useEffect(() => {
        if (propColumns) {
            setColumns(propColumns);
        }
    }, [propColumns]);



    // const getFilterParams = useCallback(() => {
    //     const filterParams = {};
    //     const query = committedSearchText;
    //     const matchedColumns = filter?.filter((col) =>
    //         selectedColumns.includes(col.name)
    //     );
    //     const validCodes = matchedColumns?.map((col) => col.code) || [];

    //     // Transform general search query into specific filter params
    //     if (query && validCodes.length > 0) {
    //         validCodes.forEach(c => {
    //             filterParams[`filter[${c}]`] = query;
    //         });
    //     }

    //     Object?.keys(finalAdvancedFilters || {})?.forEach(key => {
    //         if (finalAdvancedFilters[key]) {
    //             if (key.includes('.')) {
    //                 const bracketKey = key.split('.').join('][');
    //                 filterParams[`filter[${bracketKey}]`] = finalAdvancedFilters[key];
    //             } else {
    //                 filterParams[`filter[${key}]`] = finalAdvancedFilters[key];
    //             }
    //         }
    //     });

    //     return filterParams;
    // }, [committedSearchText, filter, selectedColumns, finalAdvancedFilters]);

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

            const idPayload = viewConfigTable?._id || viewConfigTable?.id;
            if (!idPayload) {
                toast("Bảng này chưa được cấu hình lưu cài đặt (không có ID).", "warning");
                return;
            }

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
                await dispatch(
                    settingViewConfig({ id: idPayload, payload: payload })
                ).unwrap();
                toast("Cập nhật vị trí cột thành công", "success");
            } catch (error) {
                logger.log("Cập nhật vị trí cột thất bại!", "error");
            }
        },
        [columns, viewConfigTable, dispatch, toast]
    );

    const handleMouseDownResize = useCallback((e, colRow) => {
        e.preventDefault();
        const el = document.getElementById(`col-${colRow}`);
        const curWidth = el ? el.offsetWidth : 120;
        setResizingCol(colRow);
        setStartX(e.clientX);
        setStartWidth(curWidth);
    }, []);

    const handleSort = useCallback(
        (column) => {
            const isCurrentColumn = orderBy === column;
            const newOrder = isCurrentColumn
                ? order === "asc"
                    ? "desc"
                    : "asc"
                : "asc";

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

    const handlePageChange = useCallback((e, newPage) => {
        setPage(newPage - 1);
    }, []);

    // const handlePrevPageClick = (e) => {
    //     handlePageChange(e, page)
    // }

    // const handleNextPageClick = (e) => {
    //     handlePageChange(e, page + 2)
    // }

    const handleRowsPerPageChange = useCallback((e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    }, []);

    const fetchTableData = useCallback(
        async (query = "", code = [], sort, selectedType) => {
            if (fetchData) {
                setLoading(true);
                const validCodes = Array.isArray(code)
                    ? code.filter((c) => c && c !== "parent")
                    : [];

                const filterParams = {};

                if (query && validCodes.length > 0) {
                    validCodes.forEach(c => {
                        filterParams[`filter[${c}]`] = query;
                    });
                }

                Object.keys(finalAdvancedFilters || {}).forEach(key => {
                    let val = finalAdvancedFilters[key];
                    // Nếu giá trị là object (do autocomplete trả về), ta cần lấy ID
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        val = val._id || val.id || val.value || val.code || val;
                    }

                    if (val) {
                        if (key.includes('.')) {
                            const bracketKey = key.split('.').join('][');
                            filterParams[`filter[${bracketKey}]`] = val;
                        } else {
                            filterParams[`filter[${key}]`] = val;
                        }
                    }
                });

                const params = {
                    page: page + 1,
                    limit: rowsPerPage,
                    sort,
                    processID: idList ? idList : null,
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
                        setChartStats(result.chartStats || null);
                        setLoading(false);
                    })
                    .catch((error) => {
                        setLoading(false);
                        toast("Có lỗi khi gọi dữ liệu!", error);
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            }
        },
        [
            fetchData,
            idList,
            mapFunction,
            page,
            rowsPerPage,
            toast,
            finalAdvancedFilters
        ]
    );

    // const generatePaginationPages = (page, totalPages, handlePageChange) => {
    //     const pages = [];
    //     const currentPage = page + 1;

    //     if (totalPages === 0) return pages;
    //     pages.push(createPageButton(1, currentPage, handlePageChange));
    //     if (totalPages === 1) return pages;

    //     if (currentPage > 4) {
    //         pages.push(createPageDots('dots-start'));
    //     }

    //     let startPage = Math.max(2, currentPage - 1);
    //     let endPage = Math.min(totalPages - 1, currentPage + 1);

    //     if (currentPage <= 3) {
    //         endPage = Math.min(totalPages - 1, 4);
    //     }

    //     if (currentPage >= totalPages - 2) {
    //         startPage = Math.max(2, totalPages - 3);
    //     }

    //     for (let i = startPage; i <= endPage; i++) {
    //         pages.push(createPageButton(i, currentPage, handlePageChange));
    //     }

    //     if (currentPage < totalPages - 2 && totalPages > 5) {
    //         pages.push(createPageDots('dots-end'));
    //     }

    //     if (totalPages > 1) {
    //         pages.push(createPageButton(totalPages, currentPage, handlePageChange));
    //     }

    //     return pages;
    // };

    useEffect(() => {
        if (filter) {
            const newSelected = filter.map((col) => col.name);
            setSelectedColumns((prev) => {
                if (JSON.stringify(prev) === JSON.stringify(newSelected)) return prev;
                return newSelected;
            });
        }
    }, [filter]);


    const codeValues = useMemo(() => {
        return filter
            ?.filter((col) => selectedColumns.includes(col.name))
            .map((col) => col.code) || [];
    }, [filter, selectedColumns]);

    useEffect(() => {
        if (fetchData && isReportGenerated) {
            let sort = null;
            if (orderBy) {
                sort = JSON.stringify({ [orderBy]: order === "asc" ? 1 : -1 });
            }
            fetchTableData(committedSearchText, codeValues, sort);
        }
    }, [
        page,
        rowsPerPage,
        fetchData,
        orderBy,
        order,
        committedSearchText,
        fetchTableData,
        isReportGenerated,
        codeValues
    ]);



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

                (async () => {
                    const idPayload = viewConfigTable?._id || viewConfigTable?.id;
                    if (!idPayload) {
                        toast("Bảng này chưa được cấu hình lưu cài đặt (không có ID).", "warning");
                        return;
                    }

                    try {
                        const payload = {
                            ...viewConfigTable,
                            field: updatedColumns,
                        };
                        await dispatch(settingViewConfig({ id: idPayload, payload })).unwrap();
                        toast("Cập nhật độ rộng cột thành công", "success");
                    } catch (error) {
                        logger.error(error);
                        // toast("Cập nhật độ rộng cột thất bại!", "error");
                    }
                })();

                return currentWidthsSnapshot;
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

            const isLeaderRole = isLeader;
            // const isTruongPhongRole = isTruongPhong;
            const isMatch = (str) => {
                if (typeof str !== 'string') return false;
                const normalized = str.normalize('NFC').trim().toLowerCase();
                return normalized === 'phòng ban' || normalized === 'phong ban';
            };

            if (isLeaderRole && selectedTable === 'columnsPerformanceJobPerson' && reportType === 'department') {
                columnsTable = columnsTable.map(col => {
                    let name = col.name;
                    let label = col.label;
                    let labelFilter = col.labelFilter;
                    let lableFilter = col.lableFilter;
                    if (col?.code === 'phongBan' || col?.key === 'phongBan' || col?.row === 'phongBan' || isMatch(name) || isMatch(label) || isMatch(labelFilter) || isMatch(lableFilter)) {
                        name = 'Cơ quan, đơn vị';
                        label = 'Cơ quan, đơn vị';
                        labelFilter = 'Cơ quan, đơn vị';
                        lableFilter = 'Cơ quan, đơn vị';
                    }
                    return {
                        ...col,
                        name,
                        label,
                        labelFilter,
                        lableFilter
                    };
                });
            }

            setViewConfigTable(viewConfig);
            if (!propColumns) {
                setColumns(columnsTable);
            }
        }
    }, [dataViewConfig, codeModule, isLeader, isTruongPhong, selectedTable, reportType, propColumns]);

    useEffect(() => {
        if (systemParams?.data) {
            const paginationConfig = systemParams.data.find(item => item.type === "pagination");
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

    useEffect(() => {
        const map = {};
        (columns || []).forEach((c) => {
            if (c?.width) map[c.row] = c.width;
        });
        setColumnWidths((prev) => ({ ...map, ...prev }));
    }, [columns]);

    const totalPages = Math.ceil(total / rowsPerPage);

    const tableContent = (
        <>
            <StyledTableContainer isMaxHeight={isMaxHeight} customMaxHeight={customMaxHeight}>
                <StyledTable>
                    <StyledTableHead>
                        <StyledTableRow>
                            <STTHeaderCell>
                                <HeaderCellContainer align="left">
                                    STT
                                </HeaderCellContainer>
                            </STTHeaderCell>
                            {columns.map((column, idx) => {
                                if (column.isShow === false) return null;
                                const handlers = {
                                    onDragStart: (e) => handleDragStart(e, idx),
                                    onDragOver: handleDragOver,
                                    onDrop: (e) => handleDrop(e, idx),
                                    onSort: () => handleSort(column.row || column.name),
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
                                        <HeaderCellContainer align="left">
                                            <SkyTooltip title={column.label || column.title || column.name}>
                                                <span style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    display: 'block',
                                                    width: '100%'
                                                }}>
                                                    {column.label || column.title || column.name}
                                                </span>
                                            </SkyTooltip>
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
                                        <ColumnResizer onMouseDown={handlers.onResize} />
                                    </StyledTableCell>
                                );
                            })}
                        </StyledTableRow>
                    </StyledTableHead>

                    <SkyTableBody>
                        {data.length === 0 ? (
                            <StyledTableRow>
                                <StyledTableCell colSpan={columns.filter(col => col.isShow !== false).length + 1} align="center" styleTextAlign="center">
                                    Không có dữ liệu
                                </StyledTableCell>
                            </StyledTableRow>
                        ) : (
                            data.map((row, index) => {
                                return (
                                    <StyledTableRow key={row._id} index={index}
                                        onClick={onSelectView ? () => onSelectView(row) : undefined}
                                        clickable={onSelectView ? true : undefined}
                                    >
                                        <StyledTableCell>
                                            {page * rowsPerPage + index + 1}
                                        </StyledTableCell>
                                        {columns.map((column) => {
                                            if (column.isShow === false) return null;
                                            const cellValue = column.accessor
                                                ? column.accessor(row)
                                                : row[column.row || column.code || column.name];
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
                                                if (React.isValidElement(cellValue)) {
                                                    displayValue = cellValue;
                                                } else {
                                                    displayValue = cellValue.name || "[Object]";
                                                }
                                            } else {
                                                const stringValue = cellValue != null ? String(cellValue) : "";
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
                                                >
                                                    <SkyTooltip title={(!isHtml && (typeof displayValue === 'string' || typeof displayValue === 'number')) ? displayValue : ""}>
                                                        {isHtml && typeof displayValue === 'string' ? (
                                                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayValue) }} />
                                                        ) : (
                                                            <span style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                display: 'block',
                                                                width: '100%'
                                                            }}>
                                                                {displayValue}
                                                            </span>
                                                        )}
                                                    </SkyTooltip>
                                                </StyledTableCell>
                                            );
                                        })}
                                    </StyledTableRow>
                                );
                            })
                        )}
                    </SkyTableBody>
                </StyledTable>
            </StyledTableContainer>
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
        </>
    );

    return (
        <>
            {tableSelectOptions && (
                <SectionPaper>
                    <SectionTitle variant="h6">CHỌN LOẠI BÁO CÁO</SectionTitle>
                    <StatisticBoxInput>
                        <CustomInput
                            select
                            value={selectedTable}
                            onChange={handleChangeTable}
                            options={tableSelectOptions}
                            disableClear
                        />
                    </StatisticBoxInput>
                </SectionPaper>
            )}

            {advancedFilterConfig && advancedFilterConfig.length > 0 && (
                <SectionPaper>
                    <FilterHeaderBox onClick={handleToggleFilter}>
                        <StyledFilterTitleBox>
                            <FilterSectionTitle variant="h6">ĐIỀU KIỆN LỌC</FilterSectionTitle>
                            {isLeader && showRadioFilter && (
                                <RadioFilterContainer
                                    row
                                    value={reportType}
                                    onChange={handleReportTypeChange}
                                    onClick={handleStopPropagation}
                                >
                                    <SkyFormControlLabel
                                        value="department"
                                        control={<SkyRadio size="small" />}
                                        label={(isLeader && isTruongPhong) ? "Cơ quan, đơn vị" : (isTruongPhong ? "Phòng ban" : "Cơ quan, đơn vị")}
                                        labelPlacement="start"
                                    />
                                    <SkyFormControlLabel
                                        value="personal"
                                        control={<SkyRadio size="small" />}
                                        label="Cá nhân"
                                        labelPlacement="start"
                                    />
                                </RadioFilterContainer>
                            )}
                        </StyledFilterTitleBox>
                        <IconButton size="small">
                            {openFilter ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                    </FilterHeaderBox>
                    <Collapse in={openFilter}>
                        <FilterCollapseBox>
                            <FilterDropdown
                                handleApplyFilterClick={handleApplyFilter}
                                advancedFilters={appliedFilters}
                                config={advancedFilterConfig}
                                applyButtonText="Tạo báo cáo"
                            />
                        </FilterCollapseBox>
                    </Collapse>
                </SectionPaper>
            )}

            {title ? (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', width: '100%' }}>
                    <FlexibleResultPaper>
                        <ResultHeaderBox>
                            <ResultTitle variant="body1">{title}</ResultTitle>
                            {onExport && (
                                <>
                                    <StyledButton
                                        variant="contained"
                                        onClick={handleExportClick}
                                    >
                                        <SkyTooltip title="Xuất file">
                                            <Archive />
                                        </SkyTooltip>
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
                        </ResultHeaderBox>
                        {`Tìm thấy ${total} bản ghi`}
                        <SkyDivider />
                        {tableContent}
                    </FlexibleResultPaper>

                    {selectedTable === 'columnsDeptWorkStats' && (
                        <div style={{ width: '320px', minWidth: '320px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>Trạng thái nhiệm vụ</div>
                            {chartStats ? (() => {
                                const grandTotalVal = chartStats.grandTotal ||
                                    ((chartStats.completed?.count || 0) +
                                        (chartStats.inProgress?.count || 0) +
                                        (chartStats.overdue?.count || 0) +
                                        (chartStats.pending?.count || 0));
                                const hasData = grandTotalVal > 0;
                                const chartData = hasData ? [
                                    { name: 'Đã hoàn thành', value: chartStats.completed?.count || 0, color: '#10b981' },
                                    { name: 'Đang thực hiện', value: chartStats.inProgress?.count || 0, color: '#2364B0' },
                                    { name: 'Quá hạn', value: chartStats.overdue?.count || 0, color: '#ef4444' },
                                    { name: 'Chờ xử lý', value: chartStats.pending?.count || 0, color: '#f59e0b' }
                                ].filter(item => item.value > 0) : [
                                    { name: 'Không có dữ liệu', value: 1, color: '#e2e8f0' }
                                ];

                                return (
                                    <>
                                        <div style={{ width: '100%', height: '200px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <StyledResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={chartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={55}
                                                        outerRadius={75}
                                                        paddingAngle={hasData ? 2 : 0}
                                                        dataKey="value"
                                                    >
                                                        {chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </StyledResponsiveContainer>
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{grandTotalVal}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                            {[
                                                { name: 'Đã hoàn thành', count: chartStats.completed?.count || 0, percent: chartStats.completed?.percent || 0, color: '#10b981' },
                                                { name: 'Đang thực hiện', count: chartStats.inProgress?.count || 0, percent: chartStats.inProgress?.percent || 0, color: '#2364B0' },
                                                { name: 'Quá hạn', count: chartStats.overdue?.count || 0, percent: chartStats.overdue?.percent || 0, color: '#ef4444' },
                                                { name: 'Chờ xử lý', count: chartStats.pending?.count || 0, percent: chartStats.pending?.percent || 0, color: '#f59e0b' }
                                            ].map((item) => (
                                                <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '4px', height: '24px', backgroundColor: item.color, borderRadius: '2px' }} />
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{item.name}</span>
                                                            <span style={{ fontSize: '11px', color: item.color, fontWeight: 500 }}>{item.percent}%</span>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{item.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })() : (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#64748b' }}>Đang tải dữ liệu biểu đồ...</div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                tableContent
            )}

            <LoadingDialog open={loading}>
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
        </>
    );
};
export default memo(CustomTableReports);
