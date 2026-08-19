import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { createPortal } from 'react-dom';
import { List } from "react-window";
import {
  CircularProgress,
  TableBody,
  FormControlLabel,
  Checkbox,
  ClickAwayListener,
  Tooltip,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  ListItemText,
  Collapse,
  Fade,
  IconButton,
} from "@mui/material";
import {
  Search,
  Add,
  FilterAlt,
  Close,
  DeleteOutline,
  RemoveRedEyeOutlined,
  EditOutlined,
  DeleteOutlineOutlined,
  LoopOutlined,
  // Menu as MenuIcon,
  Dehaze,
  Tune,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import PropTypes from "prop-types";
import { getPermissionLabel } from "@pages/AdministrationSystem/DetailGroupUser/constantsDistrict";
import {
  HeaderCellContainer,
  StyledPaper,
  StyledTable,
  StyledTableCell,
  StyledTableContainer,
  StyledTableHead,
  StyledTableRow,
  // StyledToolbar,
  ToolbarContent,
  StyleBoxActionDropDown,
  StyleActionCheckBox,
  StyleActionCellCheckBox,
  StyleActionButton,
  StyleActionButtonCancel,
  StyleActionButtonApply,
  CheckboxHeaderCell,
  StyledTableCellActions,
  ActionsContainer,
  ActionsBox,
  DeleteSelectedButton,
  AddButton,
  SynchronizeButton,
  StyledButton,
  AdvancedFilterWrapper,
	StyledMenuIconButton,
	StyledMenuIcon,
	StyledListItemIcon2,
	StyledTableCellLoadMore,
  SearchBarWrapper,
  UnifiedSearchGroup,
  FilterTriggerBox,
  FilterTrigger,
  FilterDropdownContainer,
  TuneTriggerContainer,
  TuneIconBox,
  ClearIconButton,
  UnifiedInput,
  SearchFilterPopupAnchor,
  SearchLeftFilterTrigger,
  FilterBoxFixed,
	StyledToolbarLoadmore,
	UnifiedSearchButtonLoadmore,
	SearchAdornmentStackLoadmore,
} from "@styles/CustomTable.styles";
import "./CustomCss.css";

import {
  // useDispatch,
  useSelector,
} from "react-redux";
import {
  StyleBoxTittle,
  StyleTittleBox,
  StyleTittleTyprography,
} from "@builder-table/components/SearchSection.styles";
import {
  // TreeTableWithIconCellContentContainer,
  // NodeName,
  // ContainerCellContent,
  TreeTableWithIconCell,
  TreeTableWithIconToggleButton,
  StyleIconFolder,
  StyleIconInsertDriveFile,
} from "@styles/CustomTableTreeWithIcon.styles";
import {
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
} from "@pages/RecordExploitation/components/RecipientInfoTable.styles";
import FilterDropdown from "./FilterDropdown";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import { useToast } from "@components/common/ToastProvider";
import { AuthContext } from "@AuthContext/AuthProvider";
// import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";

import { styled } from "@mui/material/styles";

const StyledScrollButton = styled(IconButton, {
  shouldForwardProp: (prop) => !["direction", "leftOffset"].includes(prop),
})(({ theme, direction, leftOffset }) => {
  const isDark = theme.palette.mode === "dark";
  const headerBg = isDark ? "#1e293b" : "#f9fafb";
  const borderColor = isDark ? theme.palette.divider : "#dee2e6";

  return {
    position: "absolute",
    top: "0px",
    height: "56px",
    width: "36px",
    borderRadius: 0,
    zIndex: 1010,
    left: direction === "left" ? leftOffset || "399px" : "auto",
    right: direction === "right" ? "0px" : "auto",
    backgroundColor: headerBg,
    color: theme.palette.text.primary,
    boxShadow: "none",
    borderLeft: `1px solid ${borderColor}`,
    borderRight: `1px solid ${borderColor}`,
    borderBottom: `1px solid ${borderColor}`,
    borderTop: `1px solid ${borderColor}`,
    "&:hover": {
      backgroundColor: headerBg,
    },
  };
});

const VIRTUAL_ROW_HEIGHT = 48;
const VIRTUAL_SENTINEL_ROW_HEIGHT = 40;

const EllipsisCell = ({ children, align = "left" }) => {
  const innerRef = useRef(null);
  const [tooltipTitle, setTooltipTitle] = useState("");

  const handleMouseEnter = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    // Check self (for plain text / inline children)
    let overflowed =
      el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
    // Check direct children (for block-level React element children that clip themselves)
    if (!overflowed) {
      for (const child of el.children) {
        if (
          child.scrollWidth > child.clientWidth ||
          child.scrollHeight > child.clientHeight
        ) {
          overflowed = true;
          break;
        }
      }
    }
    setTooltipTitle(overflowed ? el.textContent || "" : "");
  }, []);

  return (
    <Tooltip
      title={tooltipTitle}
      followCursor
      placement="top-start"
      slotProps={{
        tooltip: {
          sx: {
            whiteSpace: "nowrap",
            maxWidth: "none",
          }
        }
      }}
    >
      <span
        ref={innerRef}
        onMouseEnter={handleMouseEnter}
        className="ellipsis-cell-wrap"
        style={{
          display: "block",
          flex: 1,
          minWidth: 0,
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: align,
        }}
      >
        {children}
      </span>
    </Tooltip>
  );
};

const getPermissionMatrixProcessKey = (row) => row?.processKey || row?.processID || row?.id || row?._id;

const getPermissionMatrixRoleTasks = (tasksByProcess, row, column) => {
  const processKey = getPermissionMatrixProcessKey(row);
  if (!processKey || !tasksByProcess) return [];
  const roles = tasksByProcess[processKey] || [];
  const colKey = String(column?.row || '').toLowerCase();
  const matchedRole = roles.find((role) => {
    const roleCode = String(role?.roleCode || '').toLowerCase();
    const roleName = String(role?.name || '').toLowerCase();
    return colKey === roleCode || colKey === roleName;
  });
  return Array.isArray(matchedRole?.actions) ? matchedRole.actions : [];
};
const formatPermissionMatrixTaskTitle = (value) => {
  const text = String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  const lowerText = text.toLocaleLowerCase("vi-VN");
  return lowerText.charAt(0).toLocaleUpperCase("vi-VN") + lowerText.slice(1);
};

const getPermissionMatrixTaskDisplayName = (task) => {
  const rawTitle = task?.type === "bpmn:SequenceFlow" && task?.groupLabel
    ? task.groupLabel
    : task?.label || task?.name || task?.taskId || task?.id || "";

  return formatPermissionMatrixTaskTitle(rawTitle);
};

const CenteredPermissionMatrixLoading = ({ size = 20, viewportWidth }) => {
  const hasViewportWidth = Number(viewportWidth) > 0;

  return (
    <div
      style={{
        position: hasViewportWidth ? "sticky" : "static",
        left: hasViewportWidth ? 0 : undefined,
        width: hasViewportWidth ? `${viewportWidth}px` : "100%",
        minHeight: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      <CircularProgress size={size} />
    </div>
  );
};

CenteredPermissionMatrixLoading.propTypes = {
  size: PropTypes.number,
  viewportWidth: PropTypes.number,
};

const PermissionMatrixUserTaskCell = ({ tasks = [], expanded = false, loading = false, onToggle }) => {
  if (loading) return <CenteredPermissionMatrixLoading size={16} />;
  if (!Array.isArray(tasks) || tasks.length === 0) return null;

  const handleToggle = (event) => {
    event.stopPropagation();
    onToggle?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", width: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
        <TreeTableWithIconToggleButton size="small" onClick={handleToggle} disabled={!onToggle}>
          {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </TreeTableWithIconToggleButton>
        <span style={{ fontSize: "11px", lineHeight: "14px", fontWeight: 600, whiteSpace: "nowrap" }}>{tasks.length} Hành động</span>
      </div>
      <Collapse in={expanded} timeout={180} collapsedSize={0} unmountOnExit={false}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%", alignItems: "center", maxHeight: "112px", overflowY: "auto", overflowX: "hidden", paddingRight: "4px", scrollbarGutter: "stable" }}>
          {tasks.map((task) => (
            <Tooltip key={task.taskId || task.id || task.code} title={getPermissionMatrixTaskDisplayName(task)}>
              <span style={{ display: "block", maxWidth: "130px", minHeight: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px", lineHeight: "14px" }}>
                {getPermissionMatrixTaskDisplayName(task)}
              </span>
            </Tooltip>
          ))}
        </div>
      </Collapse>
    </div>
  );
};

PermissionMatrixUserTaskCell.propTypes = {
  tasks: PropTypes.array,
  expanded: PropTypes.bool,
  loading: PropTypes.bool,
  onToggle: PropTypes.func,
};

const normalizeColWidth = (w) => {
  if (!w) return undefined;
  if (typeof w === "number") return `${w}px`;
  if (typeof w === "string") {
    const trimmed = w.trim();
    if (/^(calc|max|min|clamp)\(/.test(trimmed) || /(%|rem|em|px|vw|vh)/.test(trimmed)) return trimmed;
    const num = parseFloat(trimmed);
    return isNaN(num) ? undefined : `${num}px`;
  }
  return undefined;
};

const getPermissionMatrixColumnMinWidth = (column, isSmallScreen) => {
  const fallback = column?.isTree ? "400px" : column?.isRole ? "180px" : "160px";
  const width = isSmallScreen && column?.mobileWidth ? column.mobileWidth : column?.minWidth || column?.width;
  return normalizeColWidth(width) || fallback;
};

const getPermissionMatrixColumnMinWidthPx = (column, isSmallScreen) => {
  const fallback = column?.isTree ? 400 : column?.isRole ? 180 : 160;
  const minWidth = getPermissionMatrixColumnMinWidth(column, isSmallScreen);
  return minWidth?.endsWith("px") ? parseFloat(minWidth) || fallback : fallback;
};

const addCssOffsetToLength = (baseLength, offsetLength) => {
  const normalizedOffset = normalizeColWidth(offsetLength);
  if (!normalizedOffset || normalizedOffset === "0" || normalizedOffset === "0px") return baseLength;
  if (normalizedOffset.startsWith("-")) return `calc(${baseLength} - ${normalizedOffset.slice(1)})`;
  return `calc(${baseLength} + ${normalizedOffset})`;
};

const TableContext = React.createContext();

// eslint-disable-next-line no-unused-vars
const VirtualRow = React.memo(({ index, style, flatRows: rowFlatRows }) => {
  const context = React.useContext(TableContext);
  const {
    virtualScrollbarWidth,
    rowColGroupEl,
    totalColumns,
    isParentLoading,
    nodeChildren,
    rowKey,
    selected,
    openMenuRowId,
    menuAnchorPosition,
    expanded,
    loadChildren,
    toggleExpand,
    handleOpenMenu,
    handleCloseMenu,
    handlePopoverOptionClick,
    onEdit,
    onView,
    onDelete,
    optionMore,
    columns,
    disableCheckbox,
    disableAction,
    disableEdit,
    disableDetail,
    disableDelete,
    disableMore,
    theme,
    renderMode,
    isSmallScreen,
    mergeColumns,
    disableIcon,
    handleCheckboxClick,
    styleLeftColumnFirst,
    onPermissionMatrixRowClick,
    permissionMatrixUserTasks,
    permissionMatrixExpandedRows,
    permissionMatrixLoadingRows,
    onPermissionMatrixToggleTasks,
  } = context;

  const item = rowFlatRows?.[index];
  if (!item) return null;

  if (item.type !== "data") {
    return (
      <div style={style}>
        <table
          className="custom-table-tree-virtual-row-table"
          style={{ width: `calc(100% + ${virtualScrollbarWidth}px)` }}
        >
          {rowColGroupEl}
          <tbody>
            <StyledTableRow>
              <StyledTableCell colSpan={totalColumns} styleTextAlign="center">
                {(isParentLoading || (item.parentId && nodeChildren[item.parentId]?.loading)) ? (
                  <CircularProgress size={20} />
                ) : (
                  ""
                )}
              </StyledTableCell>
            </StyledTableRow>
          </tbody>
        </table>
      </div>
    );
  }

  const { row, level, isExpanded } = item;
  const rowId = row[rowKey] || row.processKey || row.id || row._id || row.name;
  const isSelected = selected.indexOf(rowId) !== -1;
  const isMenuOpen = openMenuRowId === rowId && Boolean(menuAnchorPosition);

  const handleToggleExpand = async (event) => {
    event?.stopPropagation();
    if (!expanded[rowId] && !nodeChildren[rowId]) {
      await loadChildren(rowId, 1, true);
    }
    toggleExpand(rowId);
  };

  const handleRowClick = () => {
    if (renderMode === "permissionMatrix") {
      onPermissionMatrixRowClick?.(row, { level, rowId });
    }
  };

  const handleEdit = () => {
    handleCloseMenu();
    onEdit(rowId);
  };

  const handleView = () => {
    handleCloseMenu();
    onView(rowId);
  };

  const handleDelete = () => {
    handleCloseMenu();
    onDelete([rowId]);
  };

  const handleMenuClick = (e) => handleOpenMenu(e, rowId);
  const createOptionMoreHandler = (it) => () => {
    handleCloseMenu();
    handlePopoverOptionClick(
      it.onClick,
      it?.isFullDataRow ? row : row._id || row.id
    );
  };

  const renderIcon = () => {
    switch (row?.type) {
      case "groupFile":
        return <StyleIconFolder isExpanded={isExpanded} />;
      case "folder":
        return <StyleIconFolder isExpanded={isExpanded} />;
      case "file":
      default:
        return <StyleIconInsertDriveFile />;
    }
  };

  return (
    <div style={style}>
      <table
        className="custom-table-tree-virtual-row-table"
        style={{ width: `calc(100% + ${virtualScrollbarWidth}px)` }}
      >
        {rowColGroupEl}
        <tbody>
          {renderMode === "permissionMatrix" ? (
            <Fade in appear={level > 0} timeout={level > 0 ? 180 : 0}>
            <StyledTableRow selected={isSelected} onClick={handleRowClick}>
              {columns?.map((column) => {
                if (column.isTree) {
                  const isParent = level === 0;
                  return (
                    <StyledTableCell
                      key={`${rowId}-${column.row}`}
                      // eslint-disable-next-line react/forbid-component-props
                      className="pm-sticky-col"
                      styleWidth={column.width}
                      stylePosition="relative"
                      styleZIndex={5}
                      styleOverflow="hidden"
                      styleBgColor={theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff"}
                      styleBoxShadow="2px 0 5px rgba(0,0,0,0.05)"
                      // eslint-disable-next-line react/forbid-component-props
                      style={{
                        transform: `translateX(calc(var(--scroll-left, 0px) + ${styleLeftColumnFirst || "0px"}))`
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          minWidth: 0,
                          overflow: "hidden",
                          paddingLeft: `${level * 24 + 10}px`,
                        }}
                      >
                        {isParent ? (
                          <TreeTableWithIconToggleButton size="small" onClick={handleToggleExpand}>
                            {nodeChildren[rowId]?.loading && !nodeChildren[rowId]?.children?.length ? (
                              <CircularProgress size={16} />
                            ) : isExpanded ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </TreeTableWithIconToggleButton>
                        ) : (
                          <div style={{ width: "22px", flexShrink: 0 }} />
                        )}
                        <EllipsisCell>{row.processKeyName || row.name || ""}</EllipsisCell>
                      </div>
                    </StyledTableCell>
                  );
                }

                if (column.isRole) {
                  const isFeature = level > 0;
                  const processKey = getPermissionMatrixProcessKey(row);
                  const roleTasks = !isFeature ? getPermissionMatrixRoleTasks(permissionMatrixUserTasks, row, column) : [];
                  const isTasksExpanded = Boolean(permissionMatrixExpandedRows?.[processKey]);
                  const isTasksLoading = Boolean(permissionMatrixLoadingRows?.[processKey]);
                  const hasRole = (() => {
                    if (!isFeature) return false;
                    let checked = false;
                    if (Array.isArray(row.roles)) {
                      const matchedRole = row.roles.find((r) => {
                        const colKey = String(column.row || "").toLowerCase();
                        const rCode = String(r.roleCode || "").toLowerCase();
                        const rName = String(r.name || "").toLowerCase();
                        return colKey === rCode || colKey === rName;
                      });
                      if (matchedRole) {
                        checked = Array.isArray(matchedRole.permissions) && matchedRole.permissions.includes(row.code);
                      }
                    }
                    return checked;
                  })();
                  return (
                    <StyledTableCell
                      key={`${rowId}-${column.row}`}
                      styleWidth={column.width}
                      align="center"
                      styleVerticalAlign={!isFeature ? "top" : undefined}
                      stylePadding={!isFeature ? "4px 10px 0" : undefined}
                    >
                      {isFeature ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                          <Checkbox checked={hasRole} disabled size="small" />
                        </div>
                      ) : (
                        <PermissionMatrixUserTaskCell
                          tasks={roleTasks}
                          expanded={isTasksExpanded}
                          loading={isTasksLoading}
                          onToggle={processKey ? () => onPermissionMatrixToggleTasks?.(processKey) : undefined}
                        />
                      )}
                    </StyledTableCell>
                  );
                }

                const rawValue = column.accessor ? column.accessor(row) : row[column?.row];
                return (
                  <StyledTableCell
                    key={`${rowId}-${column.row}`}
                    styleWidth={column.width}
                  >
                    <EllipsisCell>{rawValue}</EllipsisCell>
                  </StyledTableCell>
                );
              })}
            </StyledTableRow>
            </Fade>
          ) : mergeColumns ? (
            <StyledTableRow selected={isSelected}>
              {!disableCheckbox && (
                <CheckboxHeaderCell>
                  <Checkbox
                    checked={isSelected}
                    data-row-id={rowId}
                    onClick={handleCheckboxClick}
                  />
                </CheckboxHeaderCell>
              )}

              {columns?.map((column) => {
                const rawValue = column.accessor ? column.accessor(row) : row[column?.row];
                return (
                  <StyledTableCell
                    key={`${rowId}-${column.row}`}
                    styleWidth={isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width                     }                     stylePosition="relative"                     styleZIndex={0}
                    styleOverflow="hidden"
                  >
                    {column.isIcon ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "4px",
                          width: "100%",
                          minWidth: 0,
                          overflow: "hidden",
                          paddingLeft: `${level * 24 + 10}px`,
                        }}
                      >
                        {(row?.type === "folder" || row?.type === "groupFile") ? (
                          <TreeTableWithIconToggleButton size="small" onClick={handleToggleExpand}>
                            {nodeChildren[rowId]?.loading && !nodeChildren[rowId]?.children?.length ? (
                              <CircularProgress size={16} />
                            ) : isExpanded ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </TreeTableWithIconToggleButton>
                        ) : (
                          <div style={{ width: "22px", flexShrink: 0 }} />
                        )}
                        <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                          {disableIcon ? null : renderIcon()}
                        </span>
                        {column.noEllipsis ? (
                          <div style={{ flex: 1, minWidth: 0, width: "100%", overflow: "hidden" }}>
                            {rawValue}
                          </div>
                        ) : (
                          <EllipsisCell>{rawValue}</EllipsisCell>
                        )}
                      </div>
                    ) : (
                      column.noEllipsis ? rawValue : <EllipsisCell>{rawValue}</EllipsisCell>
                    )}
                  </StyledTableCell>
                );
              })}

              {!disableAction && (
                <StyledTableCellActions isAction>
                  {row?.type !== "groupFile" && (
                    <StyledMenuIconButton
                      onClick={handleMenuClick}
                      aria-controls={isMenuOpen ? `action-menu-${rowId}` : undefined}
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen ? "true" : undefined}
                    >
                      <StyledMenuIcon />
                    </StyledMenuIconButton>
                  )}

                  <Menu
                    id={`action-menu-${rowId}`}
                    anchorReference="anchorPosition"
                    anchorPosition={menuAnchorPosition || undefined}
                    open={isMenuOpen}
                    onClose={handleCloseMenu}
                    MenuListProps={{ "aria-labelledby": "basic-button" }}
                    transformOrigin={{ horizontal: "right", vertical: "top" }}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    PaperProps={{ style: { minWidth: "220px" } }}
                  >
                    {!disableEdit && (
                      <MenuItem onClick={handleEdit}>
                        <StyledListItemIcon2>
                          <EditOutlined />
                        </StyledListItemIcon2>
                        <ListItemText>Cập nhật</ListItemText>
                      </MenuItem>
                    )}

                    {!disableDetail && (
                      <MenuItem onClick={handleView}>
                        <StyledListItemIcon2>
                          <RemoveRedEyeOutlined />
                        </StyledListItemIcon2>
                        <ListItemText>Xem chi tiết</ListItemText>
                      </MenuItem>
                    )}

                    {!disableDelete && (
                      <MenuItem onClick={handleDelete}>
                        <StyledListItemIcon2>
                          <DeleteOutlineOutlined />
                        </StyledListItemIcon2>
                        <ListItemText>Xóa</ListItemText>
                      </MenuItem>
                    )}

                    {!disableMore &&
                      optionMore?.length > 0 &&
                      optionMore.map((it, i) => (
                        <MenuItem
                          key={typeof it.title === "function" ? `opt-${i}` : it.title || `opt-${i}`}
                          onClick={createOptionMoreHandler(it)}
                        >
                          {it.icon && (
                            <StyledListItemIcon2>
                              {React.createElement(it.icon)}
                            </StyledListItemIcon2>
                          )}
                          <ListItemText>
                            {typeof it.title === "function" ? it.title(row) : it.title}
                          </ListItemText>
                        </MenuItem>
                      ))}
                  </Menu>
                </StyledTableCellActions>
              )}
            </StyledTableRow>
          ) :
          (
            <StyledTableRow selected={isSelected}>
              {!disableCheckbox && (
                <CheckboxHeaderCell>
                  <Checkbox
                    checked={isSelected}
                    data-row-id={rowId}
                    onClick={handleCheckboxClick}
                  />
                </CheckboxHeaderCell>
              )}

              <TreeTableWithIconCell $level={level}>
                {(row?.type === "folder" || row?.type === "groupFile") && (
                  <TreeTableWithIconToggleButton size="small" onClick={handleToggleExpand}>
                    {nodeChildren[rowId]?.loading && !nodeChildren[rowId]?.children?.length ? (
                      <CircularProgress size={16} />
                    ) : isExpanded ? (
                      <KeyboardArrowUpIcon />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )}
                  </TreeTableWithIconToggleButton>
                )}
              </TreeTableWithIconCell>

              {columns?.map((column) => {
                const rawValue = column.accessor ? column.accessor(row) : row[column?.row];
                return (
                  <StyledTableCell
                    key={`${rowId}-${column.row}`}
                    styleWidth={
                      isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width
                    }
                    stylePosition="relative"
                    styleZIndex={0}
                    styleOverflow="hidden"
                  >
                    {column.isIcon ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          width: "100%",
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                          {disableIcon ? null : renderIcon()}
                        </span>
                        <EllipsisCell>{rawValue}</EllipsisCell>
                      </div>
                    ) : (
                      <EllipsisCell>{rawValue}</EllipsisCell>
                    )}
                  </StyledTableCell>
                );
              })}

              {!disableAction && (
                <StyledTableCellActions isAction>
                  {row?.type !== "groupFile" && (
                    <StyledMenuIconButton
                      onClick={handleMenuClick}
                      aria-controls={isMenuOpen ? `action-menu-${rowId}` : undefined}
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen ? "true" : undefined}
                    >
                      <StyledMenuIcon />
                    </StyledMenuIconButton>
                  )}

                  <Menu
                    id={`action-menu-${rowId}`}
                    anchorReference="anchorPosition"
                    anchorPosition={menuAnchorPosition || undefined}
                    open={isMenuOpen}
                    onClose={handleCloseMenu}
                    MenuListProps={{ "aria-labelledby": "basic-button" }}
                    transformOrigin={{ horizontal: "right", vertical: "top" }}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    PaperProps={{ style: { minWidth: "220px" } }}
                  >
                    {!disableEdit && (
                      <MenuItem onClick={handleEdit}>
                        <StyledListItemIcon2>
                          <EditOutlined />
                        </StyledListItemIcon2>
                        <ListItemText>Cập nhật</ListItemText>
                      </MenuItem>
                    )}

                    {!disableDetail && (
                      <MenuItem onClick={handleView}>
                        <StyledListItemIcon2>
                          <RemoveRedEyeOutlined />
                        </StyledListItemIcon2>
                        <ListItemText>Xem chi tiết</ListItemText>
                      </MenuItem>
                    )}

                    {!disableDelete && (
                      <MenuItem onClick={handleDelete}>
                        <StyledListItemIcon2>
                          <DeleteOutlineOutlined />
                        </StyledListItemIcon2>
                        <ListItemText>Xóa</ListItemText>
                      </MenuItem>
                    )}

                    {!disableMore &&
                      optionMore?.length > 0 &&
                      optionMore.map((it, i) => (
                        <MenuItem
                          key={typeof it.title === "function" ? `opt-${i}` : it.title || `opt-${i}`}
                          onClick={createOptionMoreHandler(it)}
                        >
                          {it.icon && (
                            <StyledListItemIcon2>
                              {React.createElement(it.icon)}
                            </StyledListItemIcon2>
                          )}
                          <ListItemText>
                            {typeof it.title === "function" ? it.title(row) : it.title}
                          </ListItemText>
                        </MenuItem>
                      ))}
                  </Menu>
                </StyledTableCellActions>
              )}
            </StyledTableRow>
          )}
        </tbody>
      </table>
    </div>
  );
});
VirtualRow.displayName = "VirtualRow";

// SentinelRow component to observe visibility of sentinel loading row in direct rendering (permissionMatrix)
const SentinelRow = ({ item, totalColumns, isParentLoading, nodeChildren, onIntersectionChange, viewportWidth }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          onIntersectionChange(item, entry.isIntersecting);
        });
      },
      {
        root: null,
        threshold: 0.1,
      }
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
      observer.disconnect();
      onIntersectionChange(item, false);
    };
  }, [item, onIntersectionChange]);

  const isLoading = isParentLoading || (item.parentId && nodeChildren[item.parentId]?.loading);

  return (
    <StyledTableRow ref={ref}>
      <StyledTableCell colSpan={totalColumns} styleTextAlign="center" styleOverflow="visible">
        {isLoading ? <CenteredPermissionMatrixLoading viewportWidth={viewportWidth} /> : ""}
      </StyledTableCell>
    </StyledTableRow>
  );
};

SentinelRow.propTypes = {
  item: PropTypes.object.isRequired,
  totalColumns: PropTypes.number.isRequired,
  isParentLoading: PropTypes.bool.isRequired,
  nodeChildren: PropTypes.object.isRequired,
  onIntersectionChange: PropTypes.func.isRequired,
  viewportWidth: PropTypes.number,
};

const CustomTableTreeLoadmore = ({
  children,
  data: propData,
  fetchData,
  fetchChildren,
  filter,
  columns,
  onAdd,
  onDelete,
  onEdit,
  onView,
  disableCheckbox = false,
  disableHeaderTable = false,
  disableEdit = false,
  disableDetail = false,
  disableDelete = false,
  disableMore = false,
  disableAdd = false,
  disableSynchronize = false,
  optionMore,
  reload,
  disableAction,
  disablePagination = false,
  autoHeight = false,
  selection,
  onSelectionChange,
  rowKey = "_id",
  onSelectRow,
  disableSearch = false,
  autoFilter = false,
  noneTitle = false,
  mainLimits,
  childrenLimits,
  disableBL,
  enableSearchFilterPopup = false,
  enableAdvancedFilterPopup = false,
  enableAdvancedFilterDialog = false,
  renderFilterContent = null,
  filtersAdvanced,
  advancedFilterConfig,
  advancedFiltersParams,
  onApplyAdvancedFilter,
  onAdvancedFieldChange,
	unsetStyledMaxHeight,
	disableIcon,
	noPadding,
	pdBottom,
  mergeColumns = false,
  virtualListHeight,
  isTreeSearch = false,
  renderMode,
	styleLeftColumnFirst,
  filterMore,
  initialFilters,
	styledMaxHeight,
  stickyTreeParent = false,
  onPermissionMatrixRowClick,
  permissionMatrixUserTasks = {},
  permissionMatrixExpandedRows = {},
  permissionMatrixLoadingRows = {},
  onPermissionMatrixToggleTasks,
  ...restOptionsProps
}) => {
  // const dispatch = useDispatch();
  const [internalSelected, setInternalSelected] = useState([]);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [tableViewportWidth, setTableViewportWidth] = useState(0);
  const [permissionMatrixStickyColumnRight, setPermissionMatrixStickyColumnRight] = useState(null);

  useEffect(() => {
    if (renderMode !== "permissionMatrix") {
      setTableViewportWidth(0);
      return undefined;
    }

    const el = tableContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const newViewportWidth = el.clientWidth || 0;
      // Chỉ cập nhật trạng thái nút cuộn (không còn dùng CSS variable cho sticky)
      const newCanScrollLeft = scrollLeft > 0;
      const newCanScrollRight = scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setTableViewportWidth((prev) => (prev === newViewportWidth ? prev : newViewportWidth));
      setCanScrollLeft((prev) => (prev === newCanScrollLeft ? prev : newCanScrollLeft));
      setCanScrollRight((prev) => (prev === newCanScrollRight ? prev : newCanScrollRight));
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    const resizeObserver = new ResizeObserver(() => handleScroll());
    resizeObserver.observe(el);
    handleScroll();

    return () => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [renderMode]);


  const handleScrollLeftClick = useCallback(() => {
    tableContainerRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  }, []);

  const handleScrollRightClick = useCallback(() => {
    tableContainerRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  }, []);

  const currentPageTitle = useSelector(
    (state) => state.layout.currentPageTitle
  );

  const [inputValue, setInputValue] = useState(""); // State để nhập liệu mượt hơn
  const [committedSearchText, setCommittedSearchText] = useState(""); // State cho tìm kiếm thực tế
  const [isUserTyping, setIsUserTyping] = useState(false);
  const searchVersionRef = useRef(0);
  const [, setIsLoading] = useState(false);
  const mainLimit = mainLimits || 10;
  const childrenLimit = childrenLimits || 20;
  const [isParentLoading, setIsParentLoading] = useState(false);
  const [hasMoreParents, setHasMoreParents] = useState(true);
  const [openFilter, setOpenFilter] = useState(false);
  const tuneContainerRef = useRef(null);
  const filterBoxRef = useRef(null);
  const [filterBoxAnchor, setFilterBoxAnchor] = useState({ top: 0, right: 0 });
  const [selectedColumns, setSelectedColumns] = useState(
    filter?.map((col) => col.name)
  );

  // ===== Quản lý dữ liệu theo trang (PARENT) =====
  const [loadedPages, setLoadedPages] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const [data, setData] = useState(propData || []);
  const toast = useToast();
  const { systemParams } = useContext(AuthContext);
  const [menuAnchorPosition, setMenuAnchorPosition] = useState(null);
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [tempSelectedColumns, setTempSelectedColumns] =
    useState(selectedColumns);

  const isControlled =
    selection !== undefined && onSelectionChange !== undefined;
  const selected = isControlled ? selection : internalSelected;
  const setSelected = isControlled ? onSelectionChange : setInternalSelected;

  /**
   * nodeChildren[parentId] = {
   *   children: [],
   *   highestPage: 1,
   *   loadedPages: Set([1]),
   *   hasMoreDown: true,
   *   loading: false,
   * }
   */
  const [nodeChildren, setNodeChildren] = useState({});
  const tableContainerRef = useRef(null);
  const tableHeadRef = useRef(null);
  const permissionMatrixStickyHeaderCellRef = useRef(null);
  const loadDataMainRef = useRef(null);
  const virtualListWrapperRef = useRef(null);
  const isSearchActionRef = useRef(false);
  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const hasScrolledRef = useRef(false);
  const intersectingSentinelsRef = useRef(new Map());
  const activeChildRequestsRef = useRef(new Set());
  const [stickyTreeParentTop, setStickyTreeParentTop] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isFetchingRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (renderMode !== "permissionMatrix" || !stickyTreeParent || disableHeaderTable) {
      setStickyTreeParentTop(0);
      return undefined;
    }

    const headerEl = tableHeadRef.current;
    if (!headerEl) return undefined;

    const updateStickyTop = () => {
      setStickyTreeParentTop(Math.ceil(headerEl.getBoundingClientRect().height));
    };

    updateStickyTop();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateStickyTop);
      return () => window.removeEventListener("resize", updateStickyTop);
    }

    const resizeObserver = new ResizeObserver(updateStickyTop);
    resizeObserver.observe(headerEl);
    return () => resizeObserver.disconnect();
  }, [renderMode, stickyTreeParent, disableHeaderTable, columns]);
  const [virtualScrollbarWidth, setVirtualScrollbarWidth] = useState(0);
  const [openAdvancedFilter, setOpenAdvancedFilter] = useState(false);
  const [openFilterAdvanced, setOpenFilterAdvanced] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(
    advancedFiltersParams || {}
  );
  const [externalFilters, setExternalFilters] = useState(initialFilters || {});
  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters || {});

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(externalFilters);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [externalFilters]);
  const [advancedFilterSelection, setAdvancedFilterSelection] = useState(
    selectedColumns?.[0] || ""
  );
  const canShowSearchFilterPopup =
    !autoFilter &&
    enableSearchFilterPopup &&
    Array.isArray(filter) &&
    filter.length > 0;
  const canShowAdvancedFilterPopup =
    enableAdvancedFilterPopup &&
    !!filtersAdvanced;
  const canShowAdvancedFilterDialog =
    enableAdvancedFilterDialog &&
    !!disableBL;

  useEffect(() => {
    if (propData && !fetchData) setData(propData);
  }, [propData, fetchData, systemParams]);

  // Khi mở dialog "Bộ lọc nâng cao", prefill selection từ selectedColumns hiện tại
  useEffect(() => {
    if (openAdvancedFilter) {
      setAdvancedFilterSelection(selectedColumns?.[0] || "");
    }
  }, [openAdvancedFilter, selectedColumns]);

  useEffect(() => {
    const measureScrollbar = () => {
      const wrapperEl = virtualListWrapperRef.current;
      const scrollerEl = wrapperEl?.firstElementChild;
      if (!scrollerEl) {
        setVirtualScrollbarWidth(0);
        return;
      }
      const width = Math.max(0, scrollerEl.offsetWidth - scrollerEl.clientWidth);
      setVirtualScrollbarWidth(width);
    };

    const rafId = requestAnimationFrame(measureScrollbar);
    window.addEventListener("resize", measureScrollbar);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measureScrollbar);
    };
  }, [autoHeight, data.length, currentPage, hasMoreParents]);
  // ===== LOAD DATA MAIN - CÓ XỬ LÝ XÓA TRANG CŨ =====
  const loadDataMain = useCallback(
    async (newPage, isNewSearch = false, customLimit = mainLimit) => {
      if (!fetchData) return;

      if (!isNewSearch) {
        if (disablePagination) return;
        if (isParentLoading || isFetchingRef.current) return;
        if (loadedPages.has(newPage)) return;
        if (newPage !== currentPage + 1) return;
      }

      if (isNewSearch || newPage === 1) {
        searchVersionRef.current += 1;
      }
      const myVersion = searchVersionRef.current;

      const myLimit = committedSearchText ? 50 : customLimit;

      const shouldShowSearchLoading =
        isNewSearch && isSearchActionRef.current;
      const shouldShowLoadMoreLoading = !isNewSearch;
      const shouldShowGlobalLoading =
        shouldShowSearchLoading || shouldShowLoadMoreLoading;
      if (shouldShowSearchLoading) {
        isSearchActionRef.current = false;
      }

      if (shouldShowGlobalLoading) {
        setIsLoading(true);
      }

      isFetchingRef.current = true;
      setIsParentLoading(true);
      try {
        const codeValues = filter
          ?.filter((col) => selectedColumns.includes(col.name))
          .map((col) => col.code);

        const filterParams = {};

        if (isTreeSearch && committedSearchText) {
          filterParams.filter = JSON.stringify({ name: committedSearchText });
          filterParams.search = committedSearchText;
          filterParams.q = committedSearchText;
          filterParams.isTreeSearch = true;
        } else {
          const validCodes = Array.isArray(codeValues)
            ? codeValues.filter((c) => c && c !== "parent")
            : [];
          if (committedSearchText && validCodes.length > 0) {
            validCodes.forEach((c) => {
              filterParams[`filter[${c}]`] = committedSearchText;
            });
          }
        }

        if (advancedFilters && typeof advancedFilters === "object") {
          Object.keys(advancedFilters).forEach((key) => {
            if (advancedFilters[key]) {
              if (key.includes(".")) {
                const bracketKey = key.split(".").join("][");
                filterParams[`filter[${bracketKey}]`] = advancedFilters[key];
              } else {
                filterParams[`filter[${key}]`] = advancedFilters[key];
              }
            }
          });
        }

        if (debouncedFilters && typeof debouncedFilters === "object") {
          Object.keys(debouncedFilters).forEach((key) => {
            const val = debouncedFilters[key];
            if (val !== undefined && val !== null && val !== "") {
              filterParams[key] = val;
            }
          });
        }

        const result = await fetchData({
          page: newPage,
          limit: myLimit,
          ...filterParams,
        });

        if (!isMountedRef.current || myVersion !== searchVersionRef.current) {
          return;
        }

        const formatTreeNodes = (nodes) => {
          if (!Array.isArray(nodes)) return [];
          return nodes.map((node) => {
            const mappedNode = {
              ...node,
              _id: node._id || node.id,
              parent: node.parent || node.parentId,
              type: node.type || "folder",
            };
            if (Array.isArray(node.children)) {
              mappedNode.children = formatTreeNodes(node.children);
            }
            return mappedNode;
          });
        };

        const newData = formatTreeNodes(result.data || []);
        const newTotal = result.total || 0;

        if (newPage === 1) {
          setTotalRecords(newTotal);
        }

        if (isNewSearch || newPage === 1) {
          setData(newData);
          setLoadedPages(new Set([newPage]));
          setCurrentPage(newPage);
          setNodeChildren({});
          setExpanded({});
          setHasMoreParents(
            (committedSearchText || disablePagination) ? false : (newData.length === myLimit && newData.length < newTotal)
          );
          return;
        }

        if (newPage === currentPage + 1) {
          if (newData.length === 0) {
            setHasMoreParents(false);
            setLoadedPages((prev) => new Set([...prev, newPage]));
            return;
          }
          setData((prev) => {
            const updated = [...prev, ...newData];
            const hasMore = disablePagination ? false : updated.length < totalRecords;
            setHasMoreParents(hasMore);
            return updated;
          });
          setCurrentPage(newPage);
          setLoadedPages((prev) => new Set([...prev, newPage]));
          return;
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        toast("Có lỗi khi gọi dữ liệu!", "error");
        setLoadedPages((prev) => new Set([...prev, newPage]));
        if (!isNewSearch) {
          setHasMoreParents(false);
        }
      } finally {
        if (isMountedRef.current && myVersion === searchVersionRef.current) {
          isFetchingRef.current = false;
          setIsParentLoading(false);
          if (shouldShowGlobalLoading) {
            setIsLoading(false);
          }
        }
      }
    },
    [
      fetchData,
      isParentLoading,
      filter,
      selectedColumns,
      committedSearchText,
      mainLimit,
      loadedPages,
      currentPage,
      totalRecords,
      toast,
      advancedFilters,
      debouncedFilters,
      isTreeSearch,
      disablePagination,
    ]
  );

  // Cập nhật ref để luôn trỏ tới loadDataMain mới nhất
  loadDataMainRef.current = loadDataMain;

  // Trigger load data khi các tiêu chí tìm kiếm/lọc thay đổi
  // KHÔNG đưa loadDataMain vào deps để tránh vòng lặp vô hạn
  useEffect(() => {
    setData([]);
    setLoadedPages(new Set());
    setCurrentPage(0);
    setNodeChildren({});
    setExpanded({});
    setHasMoreParents(false);
    isFetchingRef.current = false;
    hasScrolledRef.current = false;

    loadDataMainRef.current(1, true, mainLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedSearchText, selectedColumns, reload, advancedFilters, debouncedFilters, mainLimit]);

  // Đồng bộ hóa sâu advancedFiltersParams khi prop thay đổi
  const prevAdvancedFiltersParamsRef = useRef(advancedFiltersParams);
  useEffect(() => {
    const isDifferent = JSON.stringify(advancedFiltersParams) !== JSON.stringify(prevAdvancedFiltersParamsRef.current);
    if (isDifferent) {
      setAdvancedFilters(advancedFiltersParams || {});
      prevAdvancedFiltersParamsRef.current = advancedFiltersParams;
    }
  }, [advancedFiltersParams]);

  // Đồng bộ hóa sâu filter khi prop thay đổi
  const prevFilterRef = useRef(filter);
  useEffect(() => {
    const isDifferent = JSON.stringify(filter) !== JSON.stringify(prevFilterRef.current);
    if (isDifferent) {
      setSelectedColumns(filter?.map((col) => col.name) || []);
      prevFilterRef.current = filter;
    }
  }, [filter]);

  const totalColumns = mergeColumns ? ((columns?.length || 0) + (!disableCheckbox ? 1 : 0) + (!disableAction ? 1 : 0))
    : ((columns?.length || 0) + 1 + (!disableCheckbox ? 1 : 0) + (!disableAction ? 1 : 0));

  const permissionMatrixColumnLayout = useMemo(() => {
    if (renderMode !== "permissionMatrix") {
      return { columnWidths: [], tableMinWidth: undefined };
    }

    const visibleColumns = columns || [];
    const shareWidth = visibleColumns.length > 0 ? `${100 / visibleColumns.length}%` : undefined;
    const controlMinWidth = (!disableCheckbox ? 50 : 0) + (!mergeColumns ? 60 : 0) + (!disableAction ? 100 : 0);
    const columnWidths = visibleColumns.map((column) => {
      const minWidth = getPermissionMatrixColumnMinWidth(column, isSmallScreen);
      return {
        minWidth,
        width: shareWidth ? `max(${minWidth}, ${shareWidth})` : minWidth,
      };
    });
    const dataMinWidth = visibleColumns.reduce(
      (total, column) => total + getPermissionMatrixColumnMinWidthPx(column, isSmallScreen),
      0
    );

    return {
      columnWidths,
      tableMinWidth: `max(100%, ${controlMinWidth + dataMinWidth}px)`,
    };
  }, [columns, disableAction, disableCheckbox, isSmallScreen, mergeColumns, renderMode]);

  const permissionMatrixScrollLeftFallbackOffset = useMemo(() => {
    if (renderMode !== "permissionMatrix") return "399px";

    const firstColumnWidth = permissionMatrixColumnLayout.columnWidths[0]?.width
      || permissionMatrixColumnLayout.columnWidths[0]?.minWidth
      || (columns?.[0] ? getPermissionMatrixColumnMinWidth(columns[0], isSmallScreen) : "400px");

    return addCssOffsetToLength(firstColumnWidth || "400px", styleLeftColumnFirst);
  }, [columns, isSmallScreen, permissionMatrixColumnLayout.columnWidths, renderMode, styleLeftColumnFirst]);

  useEffect(() => {
    if (renderMode !== "permissionMatrix" || disableHeaderTable) {
      setPermissionMatrixStickyColumnRight(null);
      return undefined;
    }

    const container = tableContainerRef.current;
    const stickyHeaderCell = permissionMatrixStickyHeaderCellRef.current;
    if (!container || !stickyHeaderCell) {
      setPermissionMatrixStickyColumnRight(null);
      return undefined;
    }

    const updateStickyColumnRight = () => {
      const containerRect = container.getBoundingClientRect();
      const cellRect = stickyHeaderCell.getBoundingClientRect();
      const nextLeft = Math.max(0, Math.round(cellRect.right - containerRect.left));
      setPermissionMatrixStickyColumnRight((prev) => (prev === nextLeft ? prev : nextLeft));
    };

    updateStickyColumnRight();
    container.addEventListener("scroll", updateStickyColumnRight, { passive: true });
    window.addEventListener("resize", updateStickyColumnRight);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateStickyColumnRight);
      resizeObserver.observe(container);
      resizeObserver.observe(stickyHeaderCell);
    }

    return () => {
      container.removeEventListener("scroll", updateStickyColumnRight);
      window.removeEventListener("resize", updateStickyColumnRight);
      resizeObserver?.disconnect();
    };
  }, [disableHeaderTable, permissionMatrixColumnLayout.tableMinWidth, renderMode, styleLeftColumnFirst]);

  const permissionMatrixScrollLeftButtonOffset = permissionMatrixStickyColumnRight !== null
    ? `${permissionMatrixStickyColumnRight}px`
    : permissionMatrixScrollLeftFallbackOffset;

  const headerColGroupEl = useMemo(() => {
    const cols = [];
    if (!disableCheckbox) cols.push({ key: "col-cb", width: "50px", minWidth: "50px" });
    if (!mergeColumns) cols.push({ key: "col-exp", width: "60px", minWidth: "60px" });
    (columns || []).forEach((col, index) => {
      const w = isSmallScreen && col.mobileWidth ? col.mobileWidth : col.width;
      const permissionWidth = permissionMatrixColumnLayout.columnWidths[index];
      cols.push({
        key: `col-${col.row || col.name}`,
        width: renderMode === "permissionMatrix" ? permissionWidth?.width : normalizeColWidth(w),
        minWidth: renderMode === "permissionMatrix" ? permissionWidth?.minWidth : undefined,
      });
    });
    if (!disableAction) cols.push({ key: "col-act", width: "100px", minWidth: "100px" });
    return (
      <colgroup>
        {cols.map(({ key, width, minWidth }) => (
          <col key={key} style={width || minWidth ? { width, minWidth } : undefined} />
        ))}
      </colgroup>
    );
  }, [columns, disableCheckbox, disableAction, isSmallScreen, mergeColumns, permissionMatrixColumnLayout.columnWidths, renderMode]);

  const rowColGroupEl = useMemo(() => {
    const cols = [];
    if (!disableCheckbox) cols.push({ key: "col-cb", width: "50px", minWidth: "50px" });
    if (!mergeColumns) cols.push({ key: "col-exp", width: "60px", minWidth: "60px" });
    (columns || []).forEach((col, index) => {
      const w = isSmallScreen && col.mobileWidth ? col.mobileWidth : col.width;
      const permissionWidth = permissionMatrixColumnLayout.columnWidths[index];
      cols.push({
        key: `col-${col.row || col.name}`,
        width: renderMode === "permissionMatrix" ? permissionWidth?.width : normalizeColWidth(w),
        minWidth: renderMode === "permissionMatrix" ? permissionWidth?.minWidth : undefined,
      });
    });
    if (!disableAction) cols.push({ key: "col-act", width: "100px", minWidth: "100px" });
    return (
      <colgroup>
        {cols.map(({ key, width, minWidth }) => (
          <col key={key} style={width || minWidth ? { width, minWidth } : undefined} />
        ))}
      </colgroup>
    );
  }, [columns, disableCheckbox, disableAction, isSmallScreen, mergeColumns, permissionMatrixColumnLayout.columnWidths, renderMode]);

  const handleSearchFilter = (e) => {
    const inputVal = e.target.value;
    setInputValue(inputVal); // Update inputValue for real-time typing
    setIsUserTyping(true);
  };

  const handleSearchClick = useCallback(
    (query) => {
      setIsUserTyping(false);
      isSearchActionRef.current = true;
      setCommittedSearchText(query.trim());
    },
    []
  );

  const [expanded, setExpanded] = useState({});

  const toggleExpand = useCallback((id) => {
    hasScrolledRef.current = false;
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    setNodeChildren({});
  }, [reload]);

  /**
   * LOAD CHILDREN 2 CHIỀU (DOWN/UP) + WINDOWING (xoá trang xa nhất)
   * Yêu cầu:
   * - mở node: load page 1
   * - cuộn xuống: load page 2, page 3...
   * - đến page 3 thì xoá page 1
   * - cuộn ngược lên: call lại page 1 và xoá page 3 (giữ [1,2])
   */
  const loadChildren = useCallback(
    async (
      parentId,
      pageNum,
      showGlobalLoading = false
      // direction = "down"
    ) => {
      if (!fetchChildren) return;

      const key = `${parentId}-${pageNum}`;
      if (activeChildRequestsRef.current.has(key)) return;
      activeChildRequestsRef.current.add(key);

      if (showGlobalLoading) {
        setIsLoading(true);
      }

      const node = nodeChildren[parentId];

      // Chặn nếu đang loading
      if (node?.loading) return;

      // Nếu page đã có trong memory thì bỏ qua
      if (node?.loadedPages?.has?.(pageNum)) return;

      // Chặn "nhảy cóc" page (chỉ cho phép load liên tiếp)
      if (node && node.loadedPages && node.loadedPages.size > 0) {
        const expectedDown = (node.highestPage || 0) + 1;
        const isValid = pageNum === 1 || pageNum === expectedDown;
        if (!isValid) return;
      }

      // set loading
      setNodeChildren((prev) => ({
        ...prev,
        [parentId]: {
          ...(prev[parentId] || {
            children: [],
            highestPage: 0,
            loadedPages: new Set(),
            hasMoreDown: true,
          }),
          loading: true,
        },
      }));

      try {
        // Build filter params giống loadDataMain
        const filterParams = {};

        // Transform search text thành filter[code] cho từng cột được chọn
        if (isTreeSearch && committedSearchText) {
          filterParams.filter = JSON.stringify({ name: committedSearchText });
          filterParams.search = committedSearchText;
          filterParams.q = committedSearchText;
          filterParams.isTreeSearch = true;
        } else {
          const codeValues = filter
            ?.filter((col) => selectedColumns.includes(col.name))
            .map((col) => col.code);
          const validCodes = Array.isArray(codeValues)
            ? codeValues.filter((c) => c && c !== "parent")
            : [];
          if (committedSearchText && validCodes.length > 0) {
            validCodes.forEach((c) => {
              filterParams[`filter[${c}]`] = committedSearchText;
            });
          }
        }

        // Transform advancedFilters thành filter params
        if (advancedFilters && typeof advancedFilters === "object") {
          Object.keys(advancedFilters).forEach((key) => {
            if (advancedFilters[key]) {
              if (key.includes(".")) {
                const bracketKey = key.split(".").join("][");
                filterParams[`filter[${bracketKey}]`] = advancedFilters[key];
              } else {
                filterParams[`filter[${key}]`] = advancedFilters[key];
              }
            }
          });
        }

        if (debouncedFilters && typeof debouncedFilters === "object") {
          Object.keys(debouncedFilters).forEach((key) => {
            const val = debouncedFilters[key];
            if (val !== undefined && val !== null && val !== "") {
              filterParams[key] = val;
            }
          });
        }

        const res = await fetchChildren({
          parentId,
          page: pageNum,
          limit: childrenLimit,
          ...filterParams,
        });

        if (!isMountedRef.current) return;

        const newChildren = res?.data || res || [];
        const hasMoreDown = newChildren.length === childrenLimit;

        setNodeChildren((prev) => {
          const current = prev[parentId] || {
            children: [],
            highestPage: 0,
            loadedPages: new Set(),
            hasMoreDown: true,
          };

          // Nếu là lần đầu (node chưa có trang nào) => nhận page 1
          if (current.loadedPages.size === 0) {
            return {
              ...prev,
              [parentId]: {
                children: newChildren,
                highestPage: pageNum,
                loadedPages: new Set([pageNum]),
                hasMoreDown,
                loading: false,
              },
            };
          }

          let childrenArr = current.children;
          let highestP = current.highestPage;
          const loaded = new Set(current.loadedPages);

          const isLoadDown = pageNum === highestP + 1;

          if (newChildren.length === 0) {
            const loadedEmpty = new Set(current.loadedPages);
            loadedEmpty.add(pageNum);

            if (isLoadDown) {
              return {
                ...prev,
                [parentId]: {
                  ...current,
                  hasMoreDown: false,
                  loadedPages: loadedEmpty,
                  loading: false,
                },
              };
            }
          }

          if (isLoadDown) {
            childrenArr = [...childrenArr, ...newChildren];
            highestP = pageNum;
          }

          loaded.add(pageNum);

          return {
            ...prev,
            [parentId]: {
              ...current,
              children: childrenArr,
              highestPage: highestP,
              loadedPages: loaded,
              hasMoreDown: isLoadDown ? hasMoreDown : current.hasMoreDown,
              loading: false,
            },
          };
        });
      } catch (e) {
        if (!isMountedRef.current) return;
        setNodeChildren((prev) => ({
          ...prev,
          [parentId]: {
            ...(prev[parentId] || {}),
            loading: false,
            // Đánh dấu page lỗi và tắt load more để không retry
            loadedPages: new Set([...(prev[parentId]?.loadedPages || []), pageNum]),
            hasMoreDown: false,
          },
        }));
      } finally {
        activeChildRequestsRef.current.delete(key);
        if (isMountedRef.current) {
          if (showGlobalLoading) {
            setIsLoading(false);
          }
        }
      }
    },
    [fetchChildren, childrenLimit, nodeChildren, committedSearchText, advancedFilters, debouncedFilters, filter, selectedColumns, isTreeSearch]
  );

  const triggerLoadMore = useCallback((item) => {
    if (item.type === "parent-down") {
      if (hasMoreParents && !isParentLoading) {
        hasScrolledRef.current = false;
        loadDataMainRef.current?.(currentPage + 1, false, mainLimit);
      }
    } else if (item.type === "child-down") {
      const nodeData = nodeChildren[item.parentId];
      if (nodeData?.hasMoreDown && !nodeData?.loading) {
        const next = (nodeData?.highestPage || 1) + 1;
        hasScrolledRef.current = false;
        loadChildren(item.parentId, next, true);
      }
    }
  }, [hasMoreParents, isParentLoading, currentPage, mainLimit, nodeChildren, loadChildren]);

  const onIntersectionChange = useCallback((item, isIntersecting) => {
    if (isIntersecting) {
      intersectingSentinelsRef.current.set(item.id, item);
      if (hasScrolledRef.current) {
        triggerLoadMore(item);
      }
    } else {
      intersectingSentinelsRef.current.delete(item.id);
    }
  }, [triggerLoadMore]);

  useEffect(() => {
    if (renderMode !== "permissionMatrix") return;
    const container = tableContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      hasScrolledRef.current = true;
      if (intersectingSentinelsRef.current.size > 0) {
        intersectingSentinelsRef.current.forEach((item) => {
          triggerLoadMore(item);
        });
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
    };
  }, [renderMode, triggerLoadMore]);

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = data.map((n) => n[rowKey] || n._id || n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const getDescendantIds = useCallback(
    (parentId) => {
      let descendants = [];
      const children = nodeChildren[parentId]?.children || [];
      children.forEach((child) => {
        const childId = child[rowKey] || child._id || child.id;
        descendants.push(childId);
        descendants = [...descendants, ...getDescendantIds(childId)];
      });
      return descendants;
    },
    [nodeChildren, rowKey]
  );

  const handleOpenMenu = useCallback((event, rowId) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuAnchorPosition({
      top: Math.round(rect.bottom),
      left: Math.round(rect.right),
    });
    setOpenMenuRowId(rowId);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuAnchorPosition(null);
    setOpenMenuRowId(null);
  }, []);

  const handleClickCheckbox = useCallback(
    (event, id) => {
      event.stopPropagation();
      const selectedIndex = selected.indexOf(id);
      const isSelecting = selectedIndex === -1;
      const descendants = getDescendantIds(id);
      const idsToToggle = [id, ...descendants];
      let newSelected;

      if (isSelecting) {
        const toAdd = idsToToggle.filter(
          (itemId) => !selected.includes(itemId)
        );
        newSelected = [...selected, ...toAdd];
      } else {
        newSelected = selected.filter(
          (itemId) => !idsToToggle.includes(itemId)
        );
      }
      setSelected(newSelected);

      if (onSelectRow) {
        const rows = data.filter((item) => {
          const itemId = item[rowKey] || item._id || item.id;
          return newSelected.includes(itemId);
        });
        onSelectRow(rows, isSelecting);
      }
    },
    [data, onSelectRow, rowKey, getDescendantIds, selected, setSelected]
  );

  const handleCheckboxClick = useCallback(
    (event) => {
      const rowId = event.currentTarget.dataset.rowId;
      handleClickCheckbox(event, rowId);
    },
    [handleClickCheckbox]
  );

  const searchTree = useMemo(() => {
    if (!committedSearchText) return [];
    const map = {};
    const tree = [];
    data.forEach((item) => {
      const id = item[rowKey] || item._id || item.id;
      if (id) {
        map[id] = { ...item, children: [] };
      }
    });
    data.forEach((item) => {
      const id = item[rowKey] || item._id || item.id;
      if (!id) return;
      const parentVal = item.parent?._id || item.parent?.id || item.parent || item.parentId;
      if (parentVal && map[parentVal]) {
        map[parentVal].children.push(map[id]);
      } else {
        tree.push(map[id]);
      }
    });
    return tree;
  }, [data, rowKey, committedSearchText]);

  const rootRows = useMemo(() => {
    if (committedSearchText) return searchTree;
    const roots = data.filter((item) => !item.parent);
    const orphanRoots = data.filter((item) => {
      if (!item.parent) return false;
      return !data.some((d) => {
        const parentId = d[rowKey] || d._id || d.id;
        return parentId === item.parent;
      });
    });
    return [...roots, ...orphanRoots];
  }, [data, rowKey, committedSearchText, searchTree]);

  const flatRows = useMemo(() => {
    const rows = [];

    const walk = (inputRows, level = 0, visited = new Set(), parentRow = null) => {
      inputRows.forEach((row) => {
        const id = row[rowKey] || row._id || row.id;
        if (visited.has(id)) return; // cycle detection: bỏ qua node đã xử lý
        visited.add(id);
        const nodeData = nodeChildren[id] || {};
        const isExpanded = committedSearchText ? true : !!expanded[id];

        rows.push({ type: "data", id, row, level, nodeData, isExpanded, parentRow });

        if (isExpanded) {
          const childrenRows = (committedSearchText && Array.isArray(row.children))
            ? row.children
            : (nodeData.children || []);
          walk(childrenRows, level + 1, visited, row);

          if (!committedSearchText && nodeData.hasMoreDown) {
            rows.push({ type: "child-down", id: `child-down-${id}`, parentId: id });
          }
        }
      });
    };

    walk(rootRows, 0);

    if (hasMoreParents) {
      rows.push({ type: "parent-down", id: "parent-down" });
    }

    return rows;
  }, [rootRows, rowKey, nodeChildren, expanded, hasMoreParents, committedSearchText]);

  // Tải thêm cho permissionMatrix đã được xử lý thông qua SentinelRow và IntersectionObserver

  const getVirtualRowHeight = useCallback(
    (index) => {
      const row = flatRows[index];
      if (!row || row.type === "data") return VIRTUAL_ROW_HEIGHT;
      return VIRTUAL_SENTINEL_ROW_HEIGHT;
    },
    [flatRows]
  );

  const handleVirtualRowsRendered = useCallback(
    ({ startIndex = 0, stopIndex, endIndex }) => {
      const visibleEndIndex = typeof stopIndex === "number" ? stopIndex : endIndex;
      if (typeof visibleEndIndex !== "number") return;

      for (let i = startIndex; i <= visibleEndIndex; i += 1) {
        const item = flatRows[i];
        if (!item) continue;

        if (item.type === "parent-down" && hasMoreParents && !isParentLoading) {
          loadDataMainRef.current?.(currentPage + 1, false, mainLimit);
        }

        if (item.type === "child-down") {
          const nodeData = nodeChildren[item.parentId];
          const next = (nodeData?.highestPage || 1) + 1;
          loadChildren(item.parentId, next, true);
        }
      }
    },
    [
      flatRows,
      hasMoreParents,
      isParentLoading,
      currentPage,
      mainLimit,
      nodeChildren,
      loadChildren,
    ]
  );

  const handleClickAway = useCallback(() => setOpenFilter(false), []);
  const handleToggleFilter = useCallback(() => {
    if (!openFilter && tuneContainerRef.current) {
      const rect = tuneContainerRef.current.getBoundingClientRect();
      setFilterBoxAnchor({
        top: rect.bottom + 5,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenFilter((prev) => !prev);
  }, [openFilter]);

  useEffect(() => {
    if (!openFilter) return undefined;
    const handleDocClick = (e) => {
      if (
        tuneContainerRef.current?.contains(e.target) ||
        filterBoxRef.current?.contains(e.target)
      ) return;
      setOpenFilter(false);
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [openFilter]);

  const handleToggleColumn = (columnName) => () => {
    setTempSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((val) => val !== columnName)
        : [...prev, columnName]
    );
  };

  const handleSearchButtonClick = useCallback(() => {
    handleSearchClick(inputValue);
  }, [inputValue, handleSearchClick]);

  const handleClearSearchInput = useCallback(() => {
    setIsUserTyping(false);
    setInputValue("");
    setCommittedSearchText("");
  }, []);

  // General debounce search input (500ms)
  useEffect(() => {
    if (!isUserTyping || disableSearch) return;

    const timeoutId = setTimeout(() => {
      setCommittedSearchText(inputValue.trim());
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputValue, isUserTyping, disableSearch]);

  // Hỗ trợ nhấn Enter để tìm kiếm
  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      handleSearchClick(inputValue);
    }
  }, [inputValue, handleSearchClick]);

  const handleClickDelete = () => {
    onDelete(selected);
  };

  const handlePopoverOptionClick = useCallback((onClick, rowId) => {
    onClick(rowId);
  }, []);

  const handleSelectAllColumns = (e) => {
    if (e.target.checked) {
      setTempSelectedColumns(filter?.map((col) => col.name) || []);
    } else {
      setTempSelectedColumns([]);
    }
  };

  const handleApplyFilter = () => {
    setSelectedColumns(tempSelectedColumns);
    handleSearchButtonClick();
    handleClickAway();
  };

  const handleOpenAdvancedFilter = useCallback(() => {
    setOpenAdvancedFilter(true);
  }, []);

  const handleCloseAdvancedFilter = useCallback(() => {
    setOpenAdvancedFilter(false);
  }, []);

  const handleApplyAdvancedFilter = useCallback(() => {
    if (advancedFilterSelection) setSelectedColumns([advancedFilterSelection]);
    else setSelectedColumns([]);
    setOpenAdvancedFilter(false);
  }, [advancedFilterSelection]);

  // Stable callback cho CustomInput select trong dialog "Bộ lọc nâng cao"
  const onAdvancedFilterChange = useCallback((e) => {
    const val = e?.target?.value;
    setAdvancedFilterSelection(val);
  }, []);

  const handleToggleFilterAdvanced = useCallback(() => {
    setOpenFilterAdvanced((prev) => !prev);
  }, []);

  const handleCloseFilter = useCallback(() => {
    setOpenFilterAdvanced(false);
  }, []);

  const handleApplyFilterClick = useCallback(
    (filters) => {
      setAdvancedFilters(filters);
      handleCloseFilter();
      // Gọi callback nếu có
      if (onApplyAdvancedFilter) {
        onApplyAdvancedFilter(filters);
      }
    },
    [handleCloseFilter, onApplyAdvancedFilter]
  );

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const triggerReload = useCallback(() => {
    setData([]);
    setLoadedPages(new Set());
    setCurrentPage(0);
    setNodeChildren({});
    setExpanded({});
    setHasMoreParents(false);
    isFetchingRef.current = false;
    loadDataMainRef.current?.(1, true, mainLimit);
  }, [mainLimit]);

  const context = useMemo(() => ({
    filters: externalFilters,
    setFilters: setExternalFilters,
    reload: triggerReload,
    loading: isParentLoading,
    page: currentPage,
    limit: mainLimit,
  }), [externalFilters, triggerReload, isParentLoading, currentPage, mainLimit]);

  const contextValue = useMemo(() => ({
    virtualScrollbarWidth,
    rowColGroupEl,
    totalColumns,
    isParentLoading,
    nodeChildren,
    rowKey,
    selected,
    openMenuRowId,
    menuAnchorPosition,
    expanded,
    loadChildren,
    toggleExpand,
    handleOpenMenu,
    handleCloseMenu,
    handlePopoverOptionClick,
    onEdit,
    onView,
    onDelete,
    optionMore,
    columns,
    disableCheckbox,
    disableAction,
    disableEdit,
    disableDetail,
    disableDelete,
    disableMore,
    theme,
    renderMode,
    isSmallScreen,
    mergeColumns,
    disableIcon,
    handleCheckboxClick,
    styleLeftColumnFirst,
    onPermissionMatrixRowClick,
    permissionMatrixUserTasks,
    permissionMatrixExpandedRows,
    permissionMatrixLoadingRows,
    onPermissionMatrixToggleTasks,
  }), [
    virtualScrollbarWidth,
    rowColGroupEl,
    totalColumns,
    isParentLoading,
    nodeChildren,
    rowKey,
    selected,
    openMenuRowId,
    menuAnchorPosition,
    expanded,
    loadChildren,
    toggleExpand,
    handleOpenMenu,
    handleCloseMenu,
    handlePopoverOptionClick,
    onEdit,
    onView,
    onDelete,
    optionMore,
    columns,
    disableCheckbox,
    disableAction,
    disableEdit,
    disableDetail,
    disableDelete,
    disableMore,
    theme,
    renderMode,
    isSmallScreen,
    mergeColumns,
    disableIcon,
    handleCheckboxClick,
    styleLeftColumnFirst,
    onPermissionMatrixRowClick,
    permissionMatrixUserTasks,
    permissionMatrixExpandedRows,
    permissionMatrixLoadingRows,
    onPermissionMatrixToggleTasks,
  ]);

  return (
    <StyleBoxTittle>
      {!noneTitle && currentPageTitle && (
        <StyleTittleBox>
          <StyleTittleTyprography variant="h5">
            {currentPageTitle}
          </StyleTittleTyprography>
        </StyleTittleBox>
      )}

      <StyledPaper autoHeight={autoHeight} styledMaxHeight={styledMaxHeight || unsetStyledMaxHeight || 140} noPadding={noPadding}>
        <StyledToolbarLoadmore pdBottom={pdBottom}>
          <ToolbarContent>
            {filterMore && filterMore(context)}
            {!disableSearch && (
              <>
                <SearchBarWrapper $isTreeSearch={isTreeSearch}>
                  <UnifiedSearchGroup $isTreeSearch={isTreeSearch}>
                    {/* Bộ lọc trigger trái — dùng renderFilterContent (render prop) */}
                    {renderFilterContent && (
                      <ClickAwayListener onClickAway={handleCloseFilter}>
                        <FilterTriggerBox>
                          <FilterTrigger onClick={handleToggleFilterAdvanced}>
                            <FilterAlt />
                            <span>Bộ lọc</span>
                          </FilterTrigger>
                          {openFilterAdvanced && (
                            <FilterDropdownContainer onClick={handleStopPropagation}>
                              {renderFilterContent({
                                onClose: handleCloseFilter,
                                onApply: handleApplyFilterClick,
                                filters: advancedFilters,
                              })}
                            </FilterDropdownContainer>
                          )}
                        </FilterTriggerBox>
                      </ClickAwayListener>
                    )}

                    {/* Bộ lọc trigger trái — dùng FilterDropdown (backward compat) */}
                    {canShowAdvancedFilterPopup && !renderFilterContent && (
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
                            onAdvancedFieldChange={onAdvancedFieldChange}
                            {...restOptionsProps}
                          />
                        </SearchFilterPopupAnchor>
                      </ClickAwayListener>
                    )}

                    {/* Input tìm kiếm */}
                    <UnifiedInput
                      placeholder="Tìm kiếm..."
                      value={inputValue}
                      onChange={handleSearchFilter}
                      onKeyDown={handleSearchKeyDown}
                      autoComplete="off"
                      InputProps={{
                        endAdornment: (
                          <SearchAdornmentStackLoadmore>
                            {inputValue && (
                              <ClearIconButton
                                type="button"
                                onClick={handleClearSearchInput}
                                title="Xóa tìm kiếm"
                              >
                                <Close />
                              </ClearIconButton>
                            )}

                            {canShowSearchFilterPopup && (
                              <TuneTriggerContainer ref={tuneContainerRef}>
                                <TuneIconBox
                                  onClick={handleToggleFilter}
                                  title="Lọc tìm kiếm"
                                >
                                  <Tune />
                                </TuneIconBox>
                              </TuneTriggerContainer>
                            )}
                          </SearchAdornmentStackLoadmore>
                        ),
                      }}
                    />
                  </UnifiedSearchGroup>

                  {!autoFilter && (
                    <UnifiedSearchButtonLoadmore onClick={handleSearchButtonClick}>
                      <Tooltip title="Tìm kiếm">
                        <Search />
                      </Tooltip>
                    </UnifiedSearchButtonLoadmore>
                  )}
                </SearchBarWrapper>
                {canShowSearchFilterPopup && openFilter && createPortal(
                  <FilterBoxFixed
                    ref={filterBoxRef}
                    popupTop={filterBoxAnchor.top}
                    popupRight={filterBoxAnchor.right}
                  >
                    <StyleBoxActionDropDown>
                      <span>Lọc tìm kiếm</span>
                      <Search />
                    </StyleBoxActionDropDown>
                    <StyleActionCheckBox>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={tempSelectedColumns.length === filter?.length}
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
                  </FilterBoxFixed>,
                  document.body
                )}
              </>
            )}
            {canShowAdvancedFilterDialog && (
              <StyledButton
                variant="contained"
                onClick={handleOpenAdvancedFilter}
              >
                <Tooltip title="Bộ lọc">
                  <Dehaze />
                </Tooltip>
              </StyledButton>
            )}

            <ActionsBox>
              {selected.length > 0 && !disableCheckbox && !disableDelete && (
                <DeleteSelectedButton onClick={handleClickDelete}>
                  <Tooltip title="Xóa">
                    <DeleteOutline />
                  </Tooltip>
                </DeleteSelectedButton>
              )}
            </ActionsBox>
          </ToolbarContent>

          <ActionsContainer>
            <ActionsBox>
              {!disableAdd && (
                <AddButton onClick={onAdd}>
                  <Tooltip title="Thêm mới">
                    <Add />
                  </Tooltip>
                </AddButton>
              )}
              {!disableSynchronize && (
                <SynchronizeButton>
                  <Tooltip title="Đồng bộ">
                    <LoopOutlined />
                  </Tooltip>
                </SynchronizeButton>
              )}
            </ActionsBox>
          </ActionsContainer>
				</StyledToolbarLoadmore>

				<div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
					<StyledTableContainer ref={tableContainerRef}>
						{/* {isLoading && (
							<StyledLoadingPopupSignDigital>
								<CircularProgress />
							</StyledLoadingPopupSignDigital>
						)} */}
              <StyledTable
                styleTableLayout="fixed"
                styleBorderCollapse="collapse"
                styleMinWidth={renderMode === "permissionMatrix" ? permissionMatrixColumnLayout.tableMinWidth : undefined}
              >
							{headerColGroupEl}
							{!disableHeaderTable && (
								<StyledTableHead ref={tableHeadRef}>
									<StyledTableRow>
										{!disableCheckbox && (
											<CheckboxHeaderCell>
												{!disableHeaderTable && (
													<Checkbox
														indeterminate={
															selected.length > 0 && selected.length < data.length
														}
														checked={
															data.length > 0 && selected.length === data.length
														}
														onChange={handleSelectAllClick}
													/>
												)}
											</CheckboxHeaderCell>
										)}

										{/* Header cell cho cột expand button */}
										{!mergeColumns && <StyledTableCell styleWidth={60} />}

										{columns?.map((column, index) => {
											const isFirst = index === 0;
											const headerTitle = column.isRole ? (getPermissionLabel(column.name || column.row) || column.name) : column.name;
											const permissionWidth = permissionMatrixColumnLayout.columnWidths[index];
											const columnWidth = renderMode === "permissionMatrix" ? permissionWidth?.width : (isSmallScreen && column.mobileWidth ? column.mobileWidth : column.width);
											const columnMinWidth = renderMode === "permissionMatrix" ? permissionWidth?.minWidth : undefined;
											return (
												<StyledTableCell
													key={column.row}
													ref={renderMode === "permissionMatrix" && isFirst ? permissionMatrixStickyHeaderCellRef : undefined}
													styleWidth={columnWidth}
													styleMinWidth={columnMinWidth}
													stylePosition={renderMode === "permissionMatrix" && isFirst ? "sticky" : undefined}
													styleLeft={renderMode === "permissionMatrix" && isFirst ? (styleLeftColumnFirst !== undefined ? styleLeftColumnFirst : 0) : undefined}
													styleZIndex={renderMode === "permissionMatrix" && isFirst ? 1005 : undefined}
													styleBgColor={renderMode === "permissionMatrix" && isFirst ? (theme.palette.mode === "dark" ? "#1e293b" : "#f9fafb") : undefined}
													styleBoxShadow={renderMode === "permissionMatrix" && isFirst ? "2px 0 5px rgba(0,0,0,0.1)" : undefined}
												>
													<HeaderCellContainer align={column.isRole ? "center" : "left"}>
														{renderMode === "permissionMatrix" ? (
															<EllipsisCell align={column.isRole ? "center" : "left"}>
																{headerTitle}
															</EllipsisCell>
														) : (
															headerTitle
														)}
													</HeaderCellContainer>
												</StyledTableCell>
											);
										})}


										{!disableAction && (
											<StyledTableCellActions index={0}>
												{!isSmallScreen && <span>Hành động</span>}
											</StyledTableCellActions>
										)}
									</StyledTableRow>
								</StyledTableHead>
							)}
							<TableBody>
								{flatRows.length === 0 && isParentLoading ? (
									<StyledTableRow>
										<StyledTableCell
											colSpan={totalColumns}
											align="center"
											styleTextAlign
											styleOverflow={renderMode === "permissionMatrix" ? "visible" : undefined}
										>
											{renderMode === "permissionMatrix" ? (
												<CenteredPermissionMatrixLoading viewportWidth={tableViewportWidth} />
											) : (
												<CircularProgress size={20} />
											)}
										</StyledTableCell>
									</StyledTableRow>
								) : flatRows.length === 0 ? (
									<StyledTableRow>
										<StyledTableCell colSpan={totalColumns} align="center" styleTextAlign>
											Không có dữ liệu
										</StyledTableCell>
									</StyledTableRow>
								) : renderMode === "permissionMatrix" ? (
									// === RENDER TRỰC TIẾP CHO PERMISSION MATRIX ===
									// Các hàng được render thẳng vào tbody của StyledTable (không qua react-window).
									// Điều này cho phép dùng position:sticky; left:0 thuần CSS trên Compositor Thread,
									// loại bỏ hoàn toàn frame-delay của các cách tiếp cận JS transform.
									flatRows.map((item) => {
										if (item.type !== "data") {
											return (
												<SentinelRow
													key={item.id}
													item={item}
													totalColumns={totalColumns}
													isParentLoading={isParentLoading}
													nodeChildren={nodeChildren}
													onIntersectionChange={onIntersectionChange}
													viewportWidth={tableViewportWidth}
												/>
											);
										}
										const { row, level, isExpanded } = item;
										const rowId = row[rowKey] || row.processKey || row.id || row._id || row.name;
										const isSelected = selected.indexOf(rowId) !== -1;
										const isStickyTreeParent = stickyTreeParent && level === 0;
										const stickyTreeParentTopValue = isStickyTreeParent ? `${stickyTreeParentTop}px` : undefined;
										const stickyTreeParentCellBg = theme.palette.mode === "dark" ? "#111827" : "#FFFFFF";
										const stickyTreeParentBorderColor = theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6";
										const stickyTreeParentCellShadow = [
										  `inset 0 -1px 0 ${stickyTreeParentBorderColor}`,
										  theme.palette.mode === "dark" ? "0 2px 8px rgba(0,0,0,0.35)" : "0 2px 8px rgba(15,23,42,0.12)",
										].join(", ");
										const stickyTreeParentFirstCellShadow = [
										  `inset 0 -1px 0 ${stickyTreeParentBorderColor}`,
										  theme.palette.mode === "dark" ? "2px 2px 8px rgba(0,0,0,0.35)" : "2px 2px 8px rgba(15,23,42,0.14)",
										].join(", ");
										const onToggleExpand = async (event) => {
											event?.stopPropagation();
											if (!expanded[rowId] && !nodeChildren[rowId]) {
												await loadChildren(rowId, 1, true);
											}
											toggleExpand(rowId);
										};
                    const handleRowClick = () => {
                      if (renderMode === "permissionMatrix") {
                        onPermissionMatrixRowClick?.(row, { level, rowId });
                      }
                    };
										return (
                      <Fade key={rowId} in appear={level > 0} timeout={level > 0 ? 180 : 0}>
											<StyledTableRow
												key={rowId}
												selected={isSelected}
												onClick={handleRowClick}
											>
												{columns?.map((column, columnIndex) => {
													const permissionWidth = permissionMatrixColumnLayout.columnWidths[columnIndex];
													const columnWidth = permissionWidth?.width || column.width;
													const columnMinWidth = permissionWidth?.minWidth;
													if (column.isTree) {
														const isParent = level === 0;
														return (
															<StyledTableCell
																key={`${rowId}-${column.row}`}
																styleWidth={columnWidth}
																styleMinWidth={columnMinWidth}
																stylePosition="sticky"
																styleLeftColumnFirst={styleLeftColumnFirst}
																styleZIndex={isStickyTreeParent ? 1001 : 5}
																styleTop={stickyTreeParentTopValue}
																styleOverflow="hidden"
																styleBgColor={isStickyTreeParent ? stickyTreeParentCellBg : (theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff")}
																styleBoxShadow={isStickyTreeParent ? stickyTreeParentFirstCellShadow : "2px 0 5px rgba(0,0,0,0.05)"}
															>
																<div
																	style={{
																		display: "flex",
																		alignItems: "center",
																		gap: "8px",
																		width: "100%",
																		minWidth: 0,
																		overflow: "hidden",
																		paddingLeft: `${level * 24 + 10}px`,
																	}}
																>
																	{isParent ? (
																		<TreeTableWithIconToggleButton size="small" onClick={onToggleExpand}>
																			{nodeChildren[rowId]?.loading && !nodeChildren[rowId]?.children?.length ? (
																				<CircularProgress size={16} />
																			) : isExpanded ? (
																				<KeyboardArrowUpIcon />
																			) : (
																				<KeyboardArrowDownIcon />
																			)}
																		</TreeTableWithIconToggleButton>
																	) : (
																		<div style={{ width: "22px", flexShrink: 0 }} />
																	)}
																	<EllipsisCell>{row.processKeyName || row.name || ""}</EllipsisCell>
																</div>
															</StyledTableCell>
														);
													}
                          if (column.isRole) {
                            const isFeature = level > 0;
                            const processKey = getPermissionMatrixProcessKey(row);
                            const roleTasks = !isFeature ? getPermissionMatrixRoleTasks(permissionMatrixUserTasks, row, column) : [];
                            const isTasksExpanded = Boolean(permissionMatrixExpandedRows?.[processKey]);
                            const isTasksLoading = Boolean(permissionMatrixLoadingRows?.[processKey]);
                            const hasRole = (() => {
                              if (!isFeature) return false;
                              let checked = false;
                              if (Array.isArray(row.roles)) {
                                const matchedRole = row.roles.find((r) => {
                                  const colKey = String(column.row || "").toLowerCase();
                                  const rCode = String(r.roleCode || "").toLowerCase();
                                  const rName = String(r.name || "").toLowerCase();
                                  return colKey === rCode || colKey === rName;
                                });
                                if (matchedRole) {
                                  checked = Array.isArray(matchedRole.permissions) && matchedRole.permissions.includes(row.code);
                                }
                              }
                              return checked;
                            })();
                            return (
                              <StyledTableCell
                                key={`${rowId}-${column.row}`}
                                styleWidth={columnWidth}
                                styleMinWidth={columnMinWidth}
                                align="center"
                                stylePosition={isStickyTreeParent ? "sticky" : undefined}
                                styleTop={stickyTreeParentTopValue}
                                styleZIndex={isStickyTreeParent ? 1000 : undefined}
                                styleBgColor={isStickyTreeParent ? stickyTreeParentCellBg : undefined}
                                styleBoxShadow={isStickyTreeParent ? stickyTreeParentCellShadow : undefined}
                                styleHeight={!isFeature ? "auto" : undefined}
                                styleOverflow={!isFeature ? "visible" : undefined}
                                styleVerticalAlign={!isFeature ? "top" : undefined}
                                stylePadding={!isFeature ? "6px 10px" : undefined}
                              >
                                {isFeature ? (
                                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                    <Checkbox checked={hasRole} disabled size="small" />
                                  </div>
                                ) : (
                                  <PermissionMatrixUserTaskCell
                                    tasks={roleTasks}
                                    expanded={isTasksExpanded}
                                    loading={isTasksLoading}
                                    onToggle={processKey ? () => onPermissionMatrixToggleTasks?.(processKey) : undefined}
                                  />
                                )}
                              </StyledTableCell>
                            );
                          }

													const rawValue = column.accessor ? column.accessor(row) : row[column?.row];
													return (
														<StyledTableCell
														  key={`${rowId}-${column.row}`}
														  styleWidth={columnWidth}
														  styleMinWidth={columnMinWidth}
														  stylePosition={isStickyTreeParent ? "sticky" : undefined}
														  styleTop={stickyTreeParentTopValue}
														  styleZIndex={isStickyTreeParent ? 1000 : undefined}
														  styleBgColor={isStickyTreeParent ? stickyTreeParentCellBg : undefined}
														  styleBoxShadow={isStickyTreeParent ? stickyTreeParentCellShadow : undefined}
														>
															<EllipsisCell>{rawValue}</EllipsisCell>
														</StyledTableCell>
													);
												})}
											</StyledTableRow>
                      </Fade>
										);
									})
								) : (
									<StyledTableRow disableHover>
										<StyledTableCellLoadMore colSpan={totalColumns}>
											<TableContext.Provider value={contextValue}>
												{autoHeight ? (
													<div
														ref={virtualListWrapperRef}
														className="custom-table-tree-virtual-list-wrapper auto-height"
														style={virtualListHeight ? { height: virtualListHeight } : undefined}
													>
														<List
															key={`list-auto-${committedSearchText}-${JSON.stringify(debouncedFilters || {})}-${JSON.stringify(advancedFilters || {})}`}
															rowCount={flatRows.length}
															rowHeight={getVirtualRowHeight}
															rowComponent={VirtualRow}
															rowProps={{ flatRows }}
															onRowsRendered={handleVirtualRowsRendered}
															// eslint-disable-next-line react/forbid-component-props
															height={virtualListHeight || 320}
															// eslint-disable-next-line react/forbid-component-props
															width="100%"
														/>
													</div>
												) : (
													<div
														ref={virtualListWrapperRef}
														className="custom-table-tree-virtual-list-wrapper"
														style={virtualListHeight ? { height: virtualListHeight } : undefined}
													>
														<List
															key={`list-normal-${committedSearchText}-${JSON.stringify(debouncedFilters || {})}-${JSON.stringify(advancedFilters || {})}`}
															rowCount={flatRows.length}
															rowHeight={getVirtualRowHeight}
															rowComponent={VirtualRow}
															rowProps={{ flatRows }}
															onRowsRendered={handleVirtualRowsRendered}
															// eslint-disable-next-line react/forbid-component-props
															height={virtualListHeight || 580}
															// eslint-disable-next-line react/forbid-component-props
															width="100%"
														/>
													</div>
												)}
											</TableContext.Provider>
										</StyledTableCellLoadMore>
									</StyledTableRow>
								)}
							</TableBody>
						</StyledTable>
					</StyledTableContainer>
					{renderMode === "permissionMatrix" && (
						<>
							{canScrollLeft && (
								<StyledScrollButton
									direction="left"
									leftOffset={permissionMatrixScrollLeftButtonOffset}
									size="small"
									onClick={handleScrollLeftClick}
								>
									<ChevronLeft />
								</StyledScrollButton>
							)}
							{canScrollRight && (
								<StyledScrollButton
									direction="right"
									size="small"
									onClick={handleScrollRightClick}
								>
									<ChevronRight />
								</StyledScrollButton>
							)}
						</>
					)}
				</div>

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
      </StyledPaper>
    </StyleBoxTittle>
  );
};

CustomTableTreeLoadmore.propTypes = {
  children: PropTypes.node,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  filter: PropTypes.string,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      row: PropTypes.string.isRequired,
    })
  ),
  fetchData: PropTypes.func,
  fetchChildren: PropTypes.func,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onView: PropTypes.func,
  optionMore: PropTypes.func,

  disableCheckbox: PropTypes.bool,
  disableHeaderTable: PropTypes.bool,
  disableEdit: PropTypes.bool,
  disableDetail: PropTypes.bool,
  disableDelete: PropTypes.bool,
  disableMore: PropTypes.bool,
  disableAdd: PropTypes.bool,
  disableSynchronize: PropTypes.bool,
  reload: PropTypes.bool,
  disableAction: PropTypes.bool,
  disablePagination: PropTypes.bool,
  onSelectRow: PropTypes.func,
  disableSearch: PropTypes.bool,
  autoFilter: PropTypes.bool,
  noneTitle: PropTypes.bool,
  disableIcon: PropTypes.bool,
  enableSearchFilterPopup: PropTypes.bool,
  enableAdvancedFilterPopup: PropTypes.bool,
  enableAdvancedFilterDialog: PropTypes.bool,
  renderFilterContent: PropTypes.func,
  mergeColumns: PropTypes.bool,
  virtualListHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isTreeSearch: PropTypes.bool,
  renderMode: PropTypes.string,
  filterMore: PropTypes.func,
  initialFilters: PropTypes.object,
  stickyTreeParent: PropTypes.bool,
  onPermissionMatrixRowClick: PropTypes.func,
  permissionMatrixUserTasks: PropTypes.object,
  permissionMatrixExpandedRows: PropTypes.object,
  permissionMatrixLoadingRows: PropTypes.object,
  onPermissionMatrixToggleTasks: PropTypes.func,
};

export default CustomTableTreeLoadmore;
