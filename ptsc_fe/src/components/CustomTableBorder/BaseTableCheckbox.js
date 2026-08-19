import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import {
  StyledTableContainer,
  StyledTableHead,
  StyledTableRow,
  StyledTableCell,
  StyledCheckbox,
	StyleStack,
} from "@styles/CustomTable.styles";
import {
  MenuItem,
  Popover,
  Tooltip,
  IconButton,
  ListItemText,
  TableBody,
  PaginationItem,
} from "@mui/material";

import configTable from "./config";
import { addDataFieldConfig } from "@redux/slices/FormDesign/formDesignSlice";
import { useDispatch } from "react-redux";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";

import {
  BuilderToolbar,
  DataTableCell,
  DraggableHeaderCell,
  PaginationContainer,
  PaginationInfo, PopoverContent, PopoverTitle, ResetButton, ResizeHandle, RowsPerPageSelect, StyledPagination, StyledTable, TableWrapper,
} from "@styles/BaseTableCheckbox.styles";
// import { h } from "@bpmn-io/properties-panel/preact";

const BaseTableCheckbox = ({
  type,
  data,
  color = "primary",
  showIndexColumn = false,
  showCheckboxColumn = false,
  onSelect,
  defaultValues = [],
  disabled = false,
  isDisablePage = false,
  pagination = {
    total: 0,
    page: 1,
    rowsPerPage: 25,
    totalPages: 1,
  },
  formatId = "id",
  onPage,
  dataColumn,
  mode = "builder",
  item,
  onPropChange,
}) => {
  logger.log("🚀 ~ BaseTableCheckbox ~ data:", data)
  const dispatch = useDispatch();

  const [columns, setColumns] = useState([]);
  logger.log("🚀 ~ BaseTableCheckbox ~ columns:", columns);
  const [selectedRows, setSelectedRows] = useState(defaultValues);
  const [page, setPage] = useState(pagination.page);
  const [rowsPerPage, setRowsPerPage] = useState(pagination.rowsPerPage);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [actions, setActions] = useState(item?.props?.configs || []);
  // const [selectOptions, setSelectOptions] = useState([]); // Di chuyển fetch ra đây để fetch 1 lần chung

  const resizingRef = useRef(null);

  const pickColor = { primary: "#0D66D0" };

  const allPossibleColumns = useMemo(() => {
    if (dataColumn?.length) {
      return dataColumn.map(({ name, isShow, ...rest }) => ({
        ...rest,
        key: name,
        name,
        
        isShow: isShow ?? true,
      }));
    }
    return (configTable[type] || []).map((c) => ({ ...c, isShow: true }));
  }, [dataColumn, type]);

  // sao tôi set action ở đây nó lại nháy phát nhỉ
  useEffect(() => {
    setActions(item?.props?.configs || []);
  }, [item?.props?.configs]);

  useEffect(() => {
    setColumns(allPossibleColumns);
    dispatch(addDataFieldConfig(allPossibleColumns));
  }, [allPossibleColumns, dispatch]);

  useEffect(() => {
    setPage(pagination.page);
    setRowsPerPage(pagination.rowsPerPage);
  }, [pagination.page, pagination.rowsPerPage]);

  useEffect(() => {
    setSelectedRows(defaultValues);
  }, [defaultValues]);

  useEffect(() => {
    if (onPropChange) {
      onPropChange(item.id, "configs", actions);
    }
  }, [actions, onPropChange, item?.id]);

  const handleCheckboxChange = useCallback(
    (rowId) => {
      const newSelected = selectedRows.includes(rowId)
        ? selectedRows.filter((id) => id !== rowId)
        : [...selectedRows, rowId];
      setSelectedRows(newSelected);
      if (onSelect) onSelect(newSelected);
    },
    [selectedRows, onSelect]
  );

  const handleSelectAll = useCallback(
    (event) => {
      if (event.target.checked) {
        const newSelected = data.map(
          (item, index) => item[formatId] || item._id || item.id || index
        );
        setSelectedRows(newSelected);
        if (onSelect) onSelect(newSelected);
      } else {
        setSelectedRows([]);
        if (onSelect) onSelect([]);
      }
    },
    [data, formatId, onSelect]
  );

  const handlePageChange = useCallback(
    (event, newPage) => {
      setPage(newPage);
      if (onPage) onPage({ page: newPage, rowsPerPage });
    },
    [onPage, rowsPerPage]
  );

  const handleRowsPerPageChange = useCallback(
    (e) => {
      const newRowsPerPage = parseInt(e.target.value, 10);
      setRowsPerPage(newRowsPerPage);
      setPage(1);
      if (onPage) onPage({ page: 1, rowsPerPage: newRowsPerPage });
    },
    [onPage]
  );

	const handleDragStart = useCallback(
		(index) => (e) => {
			setDraggedColumnIndex(index);
			e.dataTransfer.effectAllowed = "move";
		},
		[]
	);


  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
		(dropIndex) => (e) => {
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
		},
		[columns, dispatch, draggedColumnIndex]
  );

  const handleResizeMouseDown = useCallback((index) => (e) => {
    e.preventDefault();
    const th = e.target.parentElement;
    const nextTh = th.nextElementSibling;

    resizingRef.current = {
      index,
      startX: e.clientX,
      startWidth: th.offsetWidth,
      startWidthNext: nextTh ? nextTh.offsetWidth : 0,
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  const handleMouseMove = useCallback(
    (e) => {
      if (!resizingRef.current) return;

      const { index, startX, startWidth, startWidthNext } = resizingRef.current;
      const diff = e.clientX - startX;
      const minWidth = 50;

      setColumns((prev) => {
        const newCols = [...prev];
        const newWidth = Math.max(minWidth, startWidth + diff);
        const newWidthNext = Math.max(minWidth, startWidthNext - diff);

        newCols[index] = { ...newCols[index], width: `${newWidth}px` };
        if (newCols[index + 1]) {
          newCols[index + 1] = {
            ...newCols[index + 1],
            width: `${newWidthNext}px`,
          };
        }
        dispatch(addDataFieldConfig(newCols));
        return newCols;
      });
    },
    [dispatch]
  );

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

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

  const handleResetColumns = useCallback(() => {
    setColumns(allPossibleColumns);
    dispatch(addDataFieldConfig(allPossibleColumns));
    handleSettingsClose();
  }, [allPossibleColumns, dispatch, handleSettingsClose]);


  const startRecord = page === 1 ? 1 : (page - 1) * rowsPerPage + 1;
  const endRecord = Math.min(page * rowsPerPage, pagination.total);
  return (
    <TableWrapper>
      {mode === "builder" && (
        <BuilderToolbar>
          <Tooltip title="Cấu hình cột">
            <IconButton onClick={handleSettingsClick}>
              <ViewColumnIcon />
            </IconButton>
          </Tooltip>
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleSettingsClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <PopoverContent>
              <PopoverTitle variant="subtitle2">Hiển thị cột</PopoverTitle>
              {columns.map((colConfig) => (
                <MenuItem
                  key={colConfig.key}
                  onClick={handleToggleColumn(colConfig.key)}
                >
                  <StyledCheckbox checked={colConfig.isShow} size="small" />
                  <ListItemText primary={colConfig.label} />
                </MenuItem>
              ))}
              <ResetButton onClick={handleResetColumns} size="small">
                Đặt lại
              </ResetButton>
            </PopoverContent>
          </Popover>
        </BuilderToolbar>
      )}

      <StyledTableContainer>
        <StyledTable>
          <StyledTableHead styleColor={pickColor[color]}>
            <StyledTableRow>
              {showCheckboxColumn && (
								<StyledTableCell isBold styleWidth={70}>
                  <StyledCheckbox
                    disabled={disabled}
                    checked={
                      data?.length > 0 && selectedRows.length === data.length
                    }
                    onChange={handleSelectAll}
                    indeterminate={
                      selectedRows.length > 0 &&
                      selectedRows.length < data.length
                    }
                  />
                </StyledTableCell>
              )}
              {showIndexColumn && (
								<StyledTableCell isBold styleWidth={70}>
                  STT
                </StyledTableCell>
              )}
              {columns
                .filter((c) => c.isShow)
                .map(({ label, align, width }, index) => (
                  <DraggableHeaderCell
                    key={label}                    
                    align={align}
                    isBold
                    draggable
                    $isDragging={draggedColumnIndex === index}
										styleWidth={width}
                    onDragStart={handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(index)}
                  >
                    {label}
                    <ResizeHandle onMouseDown={handleResizeMouseDown(index)} />
                  </DraggableHeaderCell>
                ))}
            </StyledTableRow>
          </StyledTableHead>
          <TableBody>
            {data?.length > 0 ? (
              data.map((item, index) => {
                const rowId = item[formatId] || item._id || item.id || index;
                return (
                  <StyledTableRow key={rowId} index={index}>
                    {showCheckboxColumn && (
                      <StyledTableCell>
                        <StyledCheckbox
                          disabled={disabled}
                          checked={selectedRows.includes(rowId)}
                          onChange={handleCheckboxChange(rowId)}
                        />
                      </StyledTableCell>
                    )}
                    {showIndexColumn && (
                      <StyledTableCell>{index + 1}</StyledTableCell>
                    )}
                    {columns
                      .filter((c) => c.isShow)
                      .map(({ key, width }) => (
												<DataTableCell key={key} styleWidth={width}>
                          {item[key]}
                        </DataTableCell>
                      ))}

                  </StyledTableRow>
                );
              })
            ) : (
              <StyledTableRow>
                <StyledTableCell
                styleTextAlign
                  colSpan={
                    columns.filter((c) => c.isShow).length +
                    (showCheckboxColumn ? 1 : 0) +
                    (showIndexColumn ? 1 : 0)
                  }
                  align="center"
                >
                  Không có dữ liệu
                </StyledTableCell>
              </StyledTableRow>
            )}
          </TableBody>
        </StyledTable>
      </StyledTableContainer>
      {!isDisablePage && (
        <PaginationContainer>
          <PaginationInfo>
            <span>Tổng {pagination.total}</span>
            <span>{`${startRecord}-${endRecord} bản ghi`}</span>
          </PaginationInfo>
          <StyleStack direction="row" spacing={1}>
            <StyledPagination
              count={pagination.totalPages}
              page={page}
              onChange={handlePageChange}
              shape="rounded"
              variant="outlined"
              siblingCount={1}
              boundaryCount={1}
              showFirstButton={false}
              showLastButton={false}
              renderItem={(item) => {
                if (item.type === "previous") {
                  return (
                    <PaginationItem {...item} component="span" page={"<"} />
                  );
                }
                if (item.type === "next") {
                  return (
                    <PaginationItem {...item} component="span" page={">"} />
                  );
                }
                if (
                  item.type === "end-ellipsis" ||
                  item.type === "start-ellipsis"
                ) {
                  return (
                    <PaginationItem {...item} component="span" page={"..."} />
                  );
                }
                return <PaginationItem {...item} />;
              }}
            />
          </StyleStack>
          <PaginationInfo>
            <span>Hiển thị</span>
            <RowsPerPageSelect
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              size="small"
            >
              {[25, 50, 100].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </RowsPerPageSelect>
          </PaginationInfo>
        </PaginationContainer>
      )}
    </TableWrapper>
  );
};

BaseTableCheckbox.propTypes = {
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
  dataColumn: PropTypes.array,
  mode: PropTypes.string,
  item: PropTypes.object,
  onPropChange: PropTypes.func,
  processId: PropTypes.string,
  onAction: PropTypes.func,
};

export default BaseTableCheckbox;
