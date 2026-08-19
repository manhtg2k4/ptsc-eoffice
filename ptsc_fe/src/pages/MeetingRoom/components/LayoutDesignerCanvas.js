import React, { useState, useMemo, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  IconButton,
  TextField,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ChairIcon from '@mui/icons-material/Chair';
import TableBarIcon from '@mui/icons-material/TableBar';
import TvIcon from '@mui/icons-material/Tv';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import WindowIcon from '@mui/icons-material/Window';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { useToast } from "@components/common/ToastProvider";
import {
  DndContext,
  useDraggable,
  useDroppable,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from '@dnd-kit/core';

// --- ENUM CONSTANTS DECLARATIONS ---
const LayoutItemType = {
  TABLE: 'TABLE',
  CHAIR: 'CHAIR',
  TV: 'TV',
  PROJECTOR: 'PROJECTOR',
  DOOR: 'DOOR',
  WINDOW: 'WINDOW',
  OTHER: 'OTHER'
};

const TableSubType = {
  RECTANGULAR: 'RECTANGULAR',
  ROUND: 'ROUND',
  SQUARE: 'SQUARE',
  U_SHAPE: 'U_SHAPE',
  OVAL: 'OVAL'
};

// --- STYLED COMPONENTS ---
const CanvasWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f8fafc',
  height: '700px',
  overflow: 'hidden',
}));

const ToolSidebar = styled('div')(({ theme }) => ({
  width: '240px',
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(2),
  overflowX: 'hidden',
  overflowY: 'auto',
  gap: theme.spacing(2),
}));

const DesignerArea = styled('div')(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
}));

const PropertiesSidebar = styled('div')(({ theme }) => ({
  width: '260px',
  borderLeft: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  overflowX: 'hidden',
  overflowY: 'auto',
}));

const CanvasContainer = styled('div')(() => ({
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
  height: '100%',
}));

const GridCanvas = styled('div', {
  shouldForwardProp: (prop) => prop !== '$rows' && prop !== '$cols',
})(({ $rows, $cols }) => ({
  display: 'grid',
  gridTemplateRows: `repeat(${$rows}, 65px)`,
  gridTemplateColumns: `repeat(${$cols}, 65px)`,
  gap: '4px',
  backgroundColor: '#e2e8f0',
  padding: '12px',
  borderRadius: '8px',
  border: '2px solid #cbd5e1',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
  position: 'relative',
  userSelect: 'none',
}));

const CanvasHeaderToolbar = styled('div')(({ theme }) => ({
  height: '52px',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 2),
}));

const GridCell = styled('div', {
  shouldForwardProp: (prop) => prop !== '$row' && prop !== '$col' && prop !== '$isOver',
})(({ $row, $col, $isOver }) => ({
  gridRow: $row + 1,
  gridColumn: $col + 1,
  backgroundColor: $isOver ? '#bae6fd' : '#f8fafc',
  borderRadius: '4px',
  border: $isOver ? '1px solid #0284c7' : '1px dashed #cbd5e1',
  transition: 'all 0.15s ease-in-out',
  cursor: 'pointer',
  position: 'relative',
  zIndex: 1,
  '&:hover': {
    backgroundColor: '#bae6fd',
    borderColor: '#38bdf8',
  },
}));

const ItemBlock = styled('div', {
  shouldForwardProp: (prop) =>
    !['$rotation', '$isSelected', '$itemType', '$subType', '$rowSpan', '$colSpan'].includes(prop),
})(({ theme, $rotation, $isSelected, $itemType, $subType, $rowSpan, $colSpan }) => {
  let bgColor = '#fff';
  let border = `1px solid ${theme.palette.divider}`;
  let color = theme.palette.text.primary;
  let borderRadius = '4px';

  let jpContent = 'center';
  let pt = '0px';
  let clipPathStyle = undefined;

  // Specific styles by itemType & subType
  if ($itemType === LayoutItemType.TABLE) {
    bgColor = theme.palette.mode === 'dark' ? '#b45309' : '#f59e0b'; 
    border = '1px solid #d97706';
    color = '#fff';
    if ($subType === TableSubType.ROUND || $subType === TableSubType.OVAL) {
      borderRadius = '50%';
    } else {
      borderRadius = '8px';
    }

    if ($subType === TableSubType.U_SHAPE) {
      const rows = $rowSpan || 3;
      const cols = $colSpan || 5;
      const S = `${100 / cols}%`;
      const C = `${100 / rows}%`;
      clipPathStyle = `polygon(0% 100%, 0% 0%, 100% 0%, 100% 100%, calc(100% - ${S}) 100%, calc(100% - ${S}) ${C}, ${S} ${C}, ${S} 100%)`;
      jpContent = 'flex-start';
      pt = '8px';
    }
  } else if ($itemType === LayoutItemType.CHAIR) {
    bgColor = theme.palette.primary.main; 
    border = `1px solid ${theme.palette.primary.dark}`;
    color = '#fff';
    borderRadius = '6px';
  } else if ($itemType === LayoutItemType.TV) {
    bgColor = '#1e293b'; 
    border = '1px solid #0f172a';
    color = '#fff';
  } else if ($itemType === LayoutItemType.PROJECTOR) {
    bgColor = '#cbd5e1'; 
    border = '1px solid #94a3b8';
    color = '#0f172a';
  } else if ($itemType === LayoutItemType.DOOR) {
    bgColor = '#e2e8f0';
    border = '2px solid #64748b';
    color = '#475569';
  } else if ($itemType === LayoutItemType.WINDOW) {
    bgColor = '#e0f2fe'; 
    border = '2px solid #38bdf8';
    color = '#0369a1';
  }

  return {
    width: '100%',
    height: '100%',
    pointerEvents: 'auto',
    backgroundColor: bgColor,
    border: $isSelected ? `3px solid #2563eb` : border,
    color,
    borderRadius,
    transform: `rotate(${$rotation}deg)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: jpContent,
    paddingTop: pt,
    clipPath: clipPathStyle,
    boxShadow: $isSelected ? '0 10px 15px -3px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'border 0.15s ease-in-out, transform 0.15s ease-in-out, clip-path 0.15s ease-in-out',
    '&:hover': {
      filter: 'brightness(0.95)',
    },
    '& svg': {
      fontSize: '20px',
      marginBottom: '4px',
    }
  };
});

const ToolButton = styled('button', {
  shouldForwardProp: (prop) => prop !== '$active' && prop !== '$isVip',
})(({ theme, $active, $isVip }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
  textTransform: 'none',
  border: `1px solid ${$active ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: '4px',
  backgroundColor: $active ? theme.palette.primary.light + '20' : 'transparent',
  color: $isVip ? '#dc2626' : ($active ? theme.palette.primary.main : theme.palette.text.secondary),
  cursor: 'grab',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
  width: '100%',
  '&:hover': {
    backgroundColor: $active ? theme.palette.primary.light + '30' : theme.palette.action.hover,
  },
  '& svg': {
    fontSize: '20px',
  }
}));

const OutlinedButton = styled('button', {
  shouldForwardProp: (prop) => prop !== '$fullWidth',
})(({ theme, $fullWidth }) => ({
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '4px',
  padding: '6px 16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  width: $fullWidth ? '100%' : 'auto',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '& svg': {
    fontSize: '18px',
  }
}));

const ErrorButton = styled('button', {
  shouldForwardProp: (prop) => prop !== '$fullWidth',
})(({ $fullWidth }) => ({
  backgroundColor: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  width: $fullWidth ? '100%' : 'auto',
  '&:hover': {
    backgroundColor: '#b91c1c',
  },
  '& svg': {
    fontSize: '18px',
  }
}));

const RotateButton = styled('button')(({ theme }) => ({
  backgroundColor: 'transparent',
  color: theme.palette.primary.main,
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: '4px',
  padding: '6px 16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  width: '100%',
  '&:hover': {
    backgroundColor: theme.palette.primary.light + '10',
  },
  '& svg': {
    fontSize: '18px',
  }
}));

const RedClearIcon = styled(ClearAllIcon)(() => ({
  color: '#dc2626',
  fontSize: '18px',
}));

const SidebarHeader = styled('span')(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  fontSize: '0.85rem',
}));

const SidebarCategory = styled('span')(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontWeight: 'bold',
  color: theme.palette.text.secondary,
  fontSize: '0.75rem',
}));

const PropertiesHeader = styled('span')(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  fontSize: '0.85rem',
}));

const PropertyLabel = styled('span')(({ theme }) => ({
  fontWeight: 'medium',
  fontSize: '0.85rem',
  color: theme.palette.text.primary,
}));

const PropertyValueBold = styled('span')(() => ({
  fontWeight: 'bold',
}));

const ItemLabelText = styled('span')(() => ({
  fontSize: '9px',
  fontWeight: 'bold',
  pointerEvents: 'none',
  lineHeight: 1,
}));

const CellCoordText = styled('div')(() => ({
  position: 'absolute',
  top: '2px',
  left: '4px',
  fontSize: '9px',
  color: '#94a3b8',
}));

const getRowLabel = (n) => {
  let label = '';
  while (n > 0) {
    n--;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
};

const getOccupiedBounds = (item) => {
  const rowSpan = item.rowSpan || 1;
  const colSpan = item.colSpan || 1;
  const rotation = item.rotation || 0;

  if (rotation % 180 === 90) {
    const newRow = Math.round(item.row + (rowSpan - colSpan) / 2);
    const newCol = Math.round(item.col + (colSpan - rowSpan) / 2);
    return {
      rowStart: newRow,
      rowEnd: newRow + colSpan - 1,
      colStart: newCol,
      colEnd: newCol + rowSpan - 1,
      rowSpan: colSpan,
      colSpan: rowSpan
    };
  }

  return {
    rowStart: item.row,
    rowEnd: item.row + rowSpan - 1,
    colStart: item.col,
    colEnd: item.col + colSpan - 1,
    rowSpan: rowSpan,
    colSpan: colSpan
  };
};

const isCellOccupiedByItem = (item, r, c) => {
  const bounds = getOccupiedBounds(item);

  // 1. Check if the cell is within the item's bounding box
  const insideBoundingBox = r >= bounds.rowStart && r <= bounds.rowEnd && c >= bounds.colStart && c <= bounds.colEnd;
  if (!insideBoundingBox) return false;

  // 2. Special hollow check for U-shape table
  if (item.itemType === 'TABLE' && item.subType === 'U_SHAPE') {
    const rotation = item.rotation || 0;
    const localR = r - bounds.rowStart; // 0 to bounds.rowSpan - 1
    const localC = c - bounds.colStart; // 0 to bounds.colSpan - 1

    if (rotation === 0) {
      // Open at bottom. Solid parts: top row (localR = 0), left col (localC = 0), right col (localC = colSpan - 1)
      const isHollow = localR > 0 && localC > 0 && localC < bounds.colSpan - 1;
      return !isHollow;
    } else if (rotation === 90) {
      // Open at left. Solid parts: right col (localC = colSpan - 1), top row (localR = 0), bottom row (localR = rowSpan - 1)
      const isHollow = localC < bounds.colSpan - 1 && localR > 0 && localR < bounds.rowSpan - 1;
      return !isHollow;
    } else if (rotation === 180) {
      // Open at top. Solid parts: bottom row (localR = rowSpan - 1), left col (localC = 0), right col (localC = colSpan - 1)
      const isHollow = localR < bounds.rowSpan - 1 && localC > 0 && localC < bounds.colSpan - 1;
      return !isHollow;
    } else if (rotation === 270) {
      // Open at right. Solid parts: left col (localC = 0), top row (localR = 0), bottom row (localR = rowSpan - 1)
      const isHollow = localC > 0 && localR > 0 && localR < bounds.rowSpan - 1;
      return !isHollow;
    }
  }

  // Any other item is solid
  return true;
};

// --- MEMOIZED INNER SUB-COMPONENTS ---
const CellItem = React.memo(({ row, col, onCellClick }) => {
  const droppableResult = useDroppable({
    id: `cell-${row}-${col}`,
  });
  const isOver = droppableResult.isOver;
  const setNodeRef = droppableResult.setNodeRef;

  const handleClick = useCallback(() => {
    onCellClick(row, col);
  }, [row, col, onCellClick]);

  return (
    <GridCell
      ref={setNodeRef}
      $row={row}
      $col={col}
      $isOver={isOver}
      onClick={handleClick}
    >
      <CellCoordText>
        {getRowLabel(row + 1)}-{col + 1}
      </CellCoordText>
    </GridCell>
  );
});
CellItem.displayName = 'CellItem';

const PlacedItemBlock = React.memo(({ item, isSelected, onClick, readOnly }) => {
  const draggableResult = useDraggable({
    id: `item-${item.id}`,
    disabled: readOnly,
  });
  const setNodeRef = draggableResult.setNodeRef;
  const transform = draggableResult.transform;
  const isDragging = draggableResult.isDragging;
  const listeners = draggableResult.listeners;
  const attributes = draggableResult.attributes;

  // Merge @dnd-kit drag listeners with item selection handler
  // so both selection and drag activation fire on the same pointerdown
  const mergedListeners = useMemo(() => {
    if (readOnly || !listeners) return {};
    const result = { ...listeners };
    const dndPointerDown = listeners.onPointerDown;
    result.onPointerDown = (e) => {
      // Selection logic — left button only
      if (e.button === undefined || e.button === 0) {
        onClick(e, item.id);
      }
      // @dnd-kit drag sensor initialization
      if (dndPointerDown) {
        dndPointerDown(e);
      }
    };
    return result;
  }, [readOnly, listeners, onClick, item.id]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Handle CSS grid layout & drag translation in standard HTML wrapper div style
  // pointer-events: none lets events pass through the wrapper to items below (e.g. chairs inside U-shape)
  const wrapperStyle = useMemo(() => {
    const isTable = item.itemType === LayoutItemType.TABLE;
    const baseZIndex = isTable ? 20 : 10;
    const gridStyle = {
      gridRow: `${item.row + 1} / span ${item.rowSpan || 1}`,
      gridColumn: `${item.col + 1} / span ${item.colSpan || 1}`,
      position: 'relative',
      width: '100%',
      height: '100%',
      zIndex: isSelected ? 30 : baseZIndex,
      pointerEvents: 'none',
    };
    if (!transform) return gridStyle;
    return {
      ...gridStyle,
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      opacity: isDragging ? 0.6 : 1,
      zIndex: 1000,
      cursor: 'grabbing',
    };
  }, [item.row, item.rowSpan, item.col, item.colSpan, item.itemType, transform, isDragging, isSelected]);


  return (
    <div
      ref={setNodeRef}
      style={wrapperStyle}
    >
      <ItemBlock
        $rotation={item.rotation || 0}
        $isSelected={isSelected}
        $itemType={item.itemType}
        $subType={item.subType}
        $rowSpan={item.rowSpan || 1}
        $colSpan={item.colSpan || 1}

        {...(readOnly ? {} : mergedListeners)}
        {...(readOnly ? {} : attributes)}
        onClick={handleClick}
      >
        {item.itemType === LayoutItemType.CHAIR && <ChairIcon />}
        {item.itemType === LayoutItemType.TABLE && <TableBarIcon />}
        {item.itemType === LayoutItemType.TV && <TvIcon />}
        {item.itemType === LayoutItemType.DOOR && <MeetingRoomIcon />}
        {item.itemType === LayoutItemType.WINDOW && <WindowIcon />}
        {item.itemType === LayoutItemType.PROJECTOR && <ScreenShareIcon />}

        <ItemLabelText>
          {item.seatNumber || item.label || item.itemType}
        </ItemLabelText>
      </ItemBlock>
    </div>
  );
});
PlacedItemBlock.displayName = 'PlacedItemBlock';

const SidebarItem = React.memo(({ tool, subType, label, icon, activeTool, activeSubType, onToolClick }) => {
  const draggableResult = useDraggable({
    id: `tool-${tool}-${subType || 'default'}`,
  });
  const setNodeRef = draggableResult.setNodeRef;
  const isDragging = draggableResult.isDragging;
  const listeners = draggableResult.listeners;
  const attributes = draggableResult.attributes;

  const style = useMemo(() => {
    return {
      opacity: isDragging ? 0.4 : 1,
      cursor: isDragging ? 'grabbing' : 'grab',
    };
  }, [isDragging]);

  const isActive = activeTool === tool && activeSubType === subType;
  const isVip = subType === 'VIP';

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ToolButton
        $active={isActive}
        $isVip={isVip}
        data-tool={tool}
        data-subtype={subType}
        onClick={onToolClick}
      >
        {icon} {label}
      </ToolButton>
    </div>
  );
});
SidebarItem.displayName = 'SidebarItem';

export default function LayoutDesignerCanvas({
  layoutItems = [],
  onChange,
  layoutRows = 8,
  layoutCols = 10,
  capacity = 0,
  readOnly = false,
}) {
  const showToast = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  const [scale, setScale] = useState(1.0);
  const [activeDragId, setActiveDragId] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [activeTool, setActiveTool] = useState(null); 
  const [activeSubType, setActiveSubType] = useState(null);
  const [dupDirection, setDupDirection] = useState('RIGHT');
  const [dupCount, setDupCount] = useState(1);
  const transformRef = useRef(null);

  const handleDragStart = useCallback((event) => {
    setActiveDragId(event.active.id);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.zoomIn(0.1);
    }
  }, []);
  const handleZoomOut = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.zoomOut(0.1);
    }
  }, []);
  const handleResetZoom = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform();
    }
  }, []);





  const handleTransform = useCallback((ref, state) => {
    const currentScale = state?.scale ?? ref?.state?.scale ?? ref?.instance?.transformState?.scale ?? 1.0;
    setScale(currentScale);
  }, []);

  const setItemsList = useCallback((newItems) => {
    if (onChange) {
      onChange(newItems);
    }
  }, [onChange]);

  // Selected item reference
  const selectedItem = useMemo(() => {
    return layoutItems.find(item => item.id === selectedItemId);
  }, [layoutItems, selectedItemId]);

  // Check if target cells are already occupied by another item
  const checkOverlap = useCallback((r, c, rowSpan, colSpan, ignoreItemId = null, draggingItem = null) => {
    const rotation = draggingItem ? (draggingItem.rotation || 0) : 0;
    const bounds = getOccupiedBounds({
      row: r,
      col: c,
      rowSpan,
      colSpan,
      rotation
    });

    for (let row = bounds.rowStart; row <= bounds.rowEnd; row++) {
      for (let col = bounds.colStart; col <= bounds.colEnd; col++) {
        if (row < 0 || row >= layoutRows || col < 0 || col >= layoutCols) return true; // Out of bounds

        // If the dragging item itself is hollow at this cell, skip overlap check for this cell!
        if (draggingItem) {
          const tempMock = {
            ...draggingItem,
            row: r,
            col: c,
          };
          if (!isCellOccupiedByItem(tempMock, row, col)) {
            continue;
          }
        }

        const overlapItem = layoutItems.find(item => {
          if (item.id === ignoreItemId) return false;
          return isCellOccupiedByItem(item, row, col);
        });

        if (overlapItem) return true;
      }
    }
    return false;
  }, [layoutItems, layoutRows, layoutCols]);

  // Handle click-to-place fallback
  const handleCellClick = useCallback((r, c) => {
    if (readOnly || !activeTool || activeTool === 'SELECT') return;

    if (activeTool === LayoutItemType.CHAIR && capacity > 0) {
      const currentChairCount = layoutItems.filter(item => item.itemType === LayoutItemType.CHAIR).length;
      if (currentChairCount >= capacity) {
        showToast(`Số lượng ghế đã đạt sức chứa tối đa (${capacity} ghế)!`, 'warning');
        return;
      }
    }

    let rowSpan = 1;
    let colSpan = 1;

    if (activeTool === LayoutItemType.TABLE) {
      if (activeSubType === TableSubType.RECTANGULAR) {
        rowSpan = 2;
        colSpan = 4;
      } else if (activeSubType === TableSubType.ROUND || activeSubType === TableSubType.SQUARE) {
        rowSpan = 2;
        colSpan = 2;
      } else if (activeSubType === TableSubType.U_SHAPE) {
        rowSpan = 3;
        colSpan = 5;
      }
    }

    const mockItem = {
      itemType: activeTool,
      subType: activeSubType || undefined,
      rowSpan,
      colSpan,
      rotation: 0
    };

    if (checkOverlap(r, c, rowSpan, colSpan, null, mockItem)) {
      showToast('Vị trí đã bị chiếm dụng hoặc kích thước vượt quá giới hạn!', 'warning');
      return;
    }

    const newItem = {
      id: `${new Date().getTime()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      itemType: activeTool,
      subType: activeSubType || undefined,
      row: r,
      col: c,
      rowSpan,
      colSpan,
      rotation: 0,
      label: activeTool === LayoutItemType.CHAIR ? '' : undefined,
      properties: {},
    };

    const updated = [...layoutItems, newItem];
    setItemsList(updated);
    setSelectedItemId(newItem.id);
    // Removed setActiveTool('SELECT') to allow continuous placement
  }, [readOnly, activeTool, activeSubType, checkOverlap, layoutItems, setItemsList, showToast, capacity]);

  // Drag Drop End Handler
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over) return;

    const overId = over.id; // "cell-r-c"
    const activeId = active.id; // "tool-itemType-subType" or "item-itemId"

    const cellMatch = overId.match(/^cell-(\d+)-(\d+)$/);
    if (!cellMatch) return;
    const targetRow = parseInt(cellMatch[1], 10);
    const targetCol = parseInt(cellMatch[2], 10);

    if (activeId.startsWith('tool-')) {
      const toolMatch = activeId.match(/^tool-([A-Z_]+)(?:-([a-zA-Z_]+))?$/);
      if (!toolMatch) return;
      const itemType = toolMatch[1];
      const subType = toolMatch[2] === 'default' ? null : toolMatch[2];

      if (itemType === LayoutItemType.CHAIR && capacity > 0) {
        const currentChairCount = layoutItems.filter(item => item.itemType === LayoutItemType.CHAIR).length;
        if (currentChairCount >= capacity) {
          showToast(`Số lượng ghế đã đạt sức chứa tối đa (${capacity} ghế)!`, 'warning');
          return;
        }
      }

      let rowSpan = 1;
      let colSpan = 1;

      if (itemType === LayoutItemType.TABLE) {
        if (subType === TableSubType.RECTANGULAR) {
          rowSpan = 2;
          colSpan = 4;
        } else if (subType === TableSubType.ROUND || subType === TableSubType.SQUARE) {
          rowSpan = 2;
          colSpan = 2;
        } else if (subType === TableSubType.U_SHAPE) {
          rowSpan = 3;
          colSpan = 5;
        }
      }

      const mockItem = {
        itemType,
        subType: subType || undefined,
        rowSpan,
        colSpan,
        rotation: 0
      };

      if (checkOverlap(targetRow, targetCol, rowSpan, colSpan, null, mockItem)) {
        showToast('Vị trí đã bị chiếm dụng hoặc kích thước vượt quá giới hạn!', 'warning');
        return;
      }

      const newItem = {
        id: `${new Date().getTime()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        itemType,
        subType: subType || undefined,
        row: targetRow,
        col: targetCol,
        rowSpan,
        colSpan,
        rotation: 0,
        label: itemType === LayoutItemType.CHAIR ? '' : undefined,
        properties: {},
      };

      const updated = [...layoutItems, newItem];
      setItemsList(updated);
      setSelectedItemId(newItem.id);
    } else if (activeId.startsWith('item-')) {
      const itemId = activeId.substring(5);
      const item = layoutItems.find(i => i.id === itemId);
      if (!item) return;

      // If dropped at its current position, do nothing and skip overlap check
      if (item.row === targetRow && item.col === targetCol) {
        return;
      }

      const rowSpan = item.rowSpan || 1;
      const colSpan = item.colSpan || 1;

      if (checkOverlap(targetRow, targetCol, rowSpan, colSpan, item.id, item)) {
        showToast('Vị trí di chuyển đã bị chiếm dụng bởi vật thể khác!', 'warning');
        return;
      }

      const updated = layoutItems.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            row: targetRow,
            col: targetCol
          };
        }
        return i;
      });
      setItemsList(updated);
      setSelectedItemId(item.id);
    }
  }, [layoutItems, checkOverlap, setItemsList, showToast, capacity]);

  const handleDragEndWithOverlay = useCallback((event) => {
    setActiveDragId(null);
    handleDragEnd(event);
  }, [handleDragEnd]);



  // Click on existing item block
  const handleItemClick = useCallback((e, itemId) => {
    e.stopPropagation();
    if (readOnly) return;
    setSelectedItemId(itemId);
    setActiveTool('SELECT');
  }, [readOnly]);

  // Property Panel - Update item property
  const updateSelectedItem = useCallback((field, value) => {
    if (!selectedItemId) return;
    const updated = layoutItems.map(item => {
      if (item.id !== selectedItemId) return item;

      const tempItem = { ...item, [field]: value };

      if (field === 'rowSpan' || field === 'colSpan') {
        const val = parseInt(value, 10) || 1;
        const newRowSpan = field === 'rowSpan' ? val : (item.rowSpan || 1);
        const newColSpan = field === 'colSpan' ? val : (item.colSpan || 1);
        if (checkOverlap(item.row, item.col, newRowSpan, newColSpan, item.id, tempItem)) {
          showToast('Thay đổi kích thước bị đè lên vật thể khác!', 'warning');
          return item;
        }
        tempItem[field] = val;
      }

      if (field === 'rotation') {
        if (checkOverlap(item.row, item.col, item.rowSpan, item.colSpan, item.id, tempItem)) {
          showToast('Không có đủ không gian xung quanh để xoay vật thể!', 'warning');
          return item;
        }
      }

      return tempItem;
    });

    setItemsList(updated);
  }, [selectedItemId, layoutItems, checkOverlap, setItemsList, showToast]);

  // Property Panel - Update custom properties (JSON)
  const updateSelectedItemProperties = useCallback((key, value) => {
    if (!selectedItem) return;
    const props = { ...(selectedItem.properties || {}), [key]: value };
    updateSelectedItem('properties', props);
  }, [selectedItem, updateSelectedItem]);

  // Stable event handlers for controls to avoid inline arrow functions
  const handleSelectTool = useCallback(() => {
    setActiveTool('SELECT');
    setSelectedItemId(null);
  }, []);

  const handleToolClick = useCallback((e) => {
    const tool = e.currentTarget.getAttribute('data-tool');
    const subType = e.currentTarget.getAttribute('data-subtype');
    if (activeTool === tool && activeSubType === (subType || null)) {
      setActiveTool('SELECT');
      setActiveSubType(null);
    } else {
      setActiveTool(tool);
      setActiveSubType(subType || null);
    }
    setSelectedItemId(null);
  }, [activeTool, activeSubType]);

  const handleSeatNoChange = useCallback((e) => {
    const val = e.target.value;
    updateSelectedItem('seatNumber', val);
    updateSelectedItem('label', val); 
  }, [updateSelectedItem]);

  const handleLabelChange = useCallback((e) => {
    updateSelectedItem('label', e.target.value);
  }, [updateSelectedItem]);

  const handleRowSpanChange = useCallback((e) => {
    updateSelectedItem('rowSpan', e.target.value);
  }, [updateSelectedItem]);

  const handleColSpanChange = useCallback((e) => {
    updateSelectedItem('colSpan', e.target.value);
  }, [updateSelectedItem]);

  const handleColorChange = useCallback((e) => {
    updateSelectedItemProperties('backgroundColor', e.target.value);
  }, [updateSelectedItemProperties]);

  const handleDupDirectionChange = useCallback((e) => {
    setDupDirection(e.target.value);
  }, []);

  const handleDupCountChange = useCallback((e) => {
    const val = parseInt(e.target.value, 10);
    setDupCount(isNaN(val) || val < 1 ? 1 : val);
  }, []);



  const handleRotateClick = useCallback(() => {
    if (!selectedItem) return;
    updateSelectedItem('rotation', ((selectedItem.rotation || 0) + 90) % 360);
  }, [selectedItem, updateSelectedItem]);

  const deleteSelectedItem = useCallback(() => {
    if (!selectedItemId) return;
    const updated = layoutItems.filter(item => item.id !== selectedItemId);
    setItemsList(updated);
    setSelectedItemId(null);
    showToast('Đã xóa vật thể!', 'success');
  }, [selectedItemId, layoutItems, setItemsList, showToast]);

  const handleDuplicateSelectedItem = useCallback(() => {
    if (!selectedItem) return;

    const count = parseInt(dupCount, 10);
    if (isNaN(count) || count < 1) {
      showToast('Số lượng nhân bản phải lớn hơn 0!', 'warning');
      return;
    }

    if (selectedItem.itemType === LayoutItemType.CHAIR && capacity > 0) {
      const currentChairCount = layoutItems.filter(i => i.itemType === LayoutItemType.CHAIR).length;
      if (currentChairCount + count > capacity) {
        showToast(`Không thể nhân bản: Số lượng ghế sẽ vượt quá sức chứa tối đa (${capacity} ghế)!`, 'warning');
        return;
      }
    }

    const rowSpan = selectedItem.rowSpan || 1;
    const colSpan = selectedItem.colSpan || 1;
    const newItems = [];
    const tempItemsList = [...layoutItems];

    for (let i = 1; i <= count; i++) {
      let targetRow = selectedItem.row;
      let targetCol = selectedItem.col;

      if (dupDirection === 'RIGHT') {
        targetCol = selectedItem.col + i * colSpan;
      } else if (dupDirection === 'LEFT') {
        targetCol = selectedItem.col - i * colSpan;
      } else if (dupDirection === 'DOWN') {
        targetRow = selectedItem.row + i * rowSpan;
      } else if (dupDirection === 'UP') {
        targetRow = selectedItem.row - i * rowSpan;
      }

      // Check boundary
      if (targetRow < 0 || targetRow + rowSpan > layoutRows || targetCol < 0 || targetCol + colSpan > layoutCols) {
        showToast(`Không thể nhân bản: Vị trí thứ ${i} vượt quá giới hạn khung sơ đồ!`, 'warning');
        return;
      }

      // Check overlap
      let hasOverlap = false;
      for (let item of tempItemsList) {
        const itemRowSpan = item.rowSpan || 1;
        const itemColSpan = item.colSpan || 1;
        if (targetRow < item.row + itemRowSpan && targetRow + rowSpan > item.row &&
            targetCol < item.col + itemColSpan && targetCol + colSpan > item.col) {
          hasOverlap = true;
          break;
        }
      }

      if (hasOverlap) {
        showToast(`Không thể nhân bản: Vị trí thứ ${i} bị chiếm dụng bởi vật thể khác!`, 'warning');
        return;
      }

      const newItem = {
        ...selectedItem,
        id: `${selectedItem.itemType}-${new Date().getTime()}-${Math.random().toString(36).substring(2, 7)}`,
        row: targetRow,
        col: targetCol,
        seatNumber: '',
        label: selectedItem.label || '',
      };

      newItems.push(newItem);
      tempItemsList.push(newItem);
    }

    // Auto number chairs if item is chair
    let finalUpdated = tempItemsList;
    if (selectedItem.itemType === LayoutItemType.CHAIR) {
      const chairs = finalUpdated.filter(item => item.itemType === LayoutItemType.CHAIR);
      const chairsByRow = {};
      chairs.forEach(chair => {
        if (!chairsByRow[chair.row]) {
          chairsByRow[chair.row] = [];
        }
        chairsByRow[chair.row].push(chair);
      });

      finalUpdated = finalUpdated.map(item => {
        if (item.itemType !== LayoutItemType.CHAIR) return item;
        const rowChairs = chairsByRow[item.row];
        rowChairs.sort((a, b) => a.col - b.col);
        const index = rowChairs.findIndex(c => c.id === item.id);
        const rowLetter = getRowLabel(item.row + 1);
        const seatNo = `${rowLetter}-${index + 1}`;
        return {
          ...item,
          seatNumber: seatNo,
          label: seatNo,
        };
      });
    }

    setItemsList(finalUpdated);
    showToast(`Đã nhân bản thành công ${newItems.length} vật thể!`, 'success');
  }, [selectedItem, dupCount, dupDirection, capacity, layoutItems, layoutRows, layoutCols, setItemsList, showToast]);

  const clearLayout = useCallback(() => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ sơ đồ hiện tại?')) {
      setItemsList([]);
      setSelectedItemId(null);
    }
  }, [setItemsList]);

  // Generate Auto Seat Numbers
  const autoNumberSeats = useCallback(() => {
    const chairs = layoutItems.filter(item => item.itemType === LayoutItemType.CHAIR);
    if (chairs.length === 0) {
      showToast('Sơ đồ chưa có ghế nào để đánh số!', 'warning');
      return;
    }

    const chairsByRow = {};
    chairs.forEach(chair => {
      if (!chairsByRow[chair.row]) {
        chairsByRow[chair.row] = [];
      }
      chairsByRow[chair.row].push(chair);
    });

    const updated = layoutItems.map(item => {
      if (item.itemType !== LayoutItemType.CHAIR) return item;

      const rowChairs = chairsByRow[item.row];
      rowChairs.sort((a, b) => a.col - b.col);

      const index = rowChairs.findIndex(c => c.id === item.id);
      const rowLetter = getRowLabel(item.row + 1);
      const seatNo = `${rowLetter}-${index + 1}`;

      return {
        ...item,
        seatNumber: seatNo,
        label: seatNo,
      };
    });

    setItemsList(updated);
    showToast('Đã đánh số hiệu ghế tự động!', 'success');
  }, [layoutItems, setItemsList, showToast]);

  // Generate Quick Start Template Layout
  const generateTemplateLayout = useCallback(() => {
    if (layoutItems.length > 0 && !window.confirm('Hành động này sẽ ghi đè sơ đồ hiện tại. Tiếp tục?')) {
      return;
    }

    const templateItems = [];
    const middleCol = Math.floor(layoutCols / 2);
    const middleRow = Math.floor(layoutRows / 2);

    const tableId = `TABLE-${new Date().getTime()}`;
    templateItems.push({
      id: tableId,
      itemType: LayoutItemType.TABLE,
      subType: TableSubType.RECTANGULAR,
      row: Math.max(0, middleRow - 1),
      col: Math.max(0, middleCol - 2),
      rowSpan: 2,
      colSpan: 4,
      rotation: 0,
    });

    let chairIdx = 1;
    const tableRow = Math.max(0, middleRow - 1);
    const tableCol = Math.max(0, middleCol - 2);

    for (let c = tableCol; c < tableCol + 4; c++) {
      if (capacity > 0 && chairIdx > capacity) break;
      if (tableRow - 1 >= 0) {
        templateItems.push({
          id: `CHAIR-${chairIdx++}-${new Date().getTime()}`,
          itemType: LayoutItemType.CHAIR,
          row: tableRow - 1,
          col: c,
          rowSpan: 1,
          colSpan: 1,
          rotation: 180,
          seatNumber: '',
        });
      }
      if (capacity > 0 && chairIdx > capacity) break;
      if (tableRow + 2 < layoutRows) {
        templateItems.push({
          id: `CHAIR-${chairIdx++}-${new Date().getTime()}`,
          itemType: LayoutItemType.CHAIR,
          row: tableRow + 2,
          col: c,
          rowSpan: 1,
          colSpan: 1,
          rotation: 0,
          seatNumber: '',
        });
      }
    }

    for (let r = tableRow; r < tableRow + 2; r++) {
      if (capacity > 0 && chairIdx > capacity) break;
      if (tableCol - 1 >= 0) {
        templateItems.push({
          id: `CHAIR-${chairIdx++}-${new Date().getTime()}`,
          itemType: LayoutItemType.CHAIR,
          row: r,
          col: tableCol - 1,
          rowSpan: 1,
          colSpan: 1,
          rotation: 90,
          seatNumber: '',
        });
      }
      if (capacity > 0 && chairIdx > capacity) break;
      if (tableCol + 4 < layoutCols) {
        templateItems.push({
          id: `CHAIR-${chairIdx++}-${new Date().getTime()}`,
          itemType: LayoutItemType.CHAIR,
          row: r,
          col: tableCol + 4,
          rowSpan: 1,
          colSpan: 1,
          rotation: 270,
          seatNumber: '',
        });
      }
    }

    const chairs = templateItems.filter(item => item.itemType === LayoutItemType.CHAIR);
    const chairsByRow = {};
    chairs.forEach(chair => {
      if (!chairsByRow[chair.row]) {
        chairsByRow[chair.row] = [];
      }
      chairsByRow[chair.row].push(chair);
    });

    const numberedTemplate = templateItems.map(item => {
      if (item.itemType !== LayoutItemType.CHAIR) return item;
      const rowChairs = chairsByRow[item.row];
      rowChairs.sort((a, b) => a.col - b.col);
      const index = rowChairs.findIndex(c => c.id === item.id);
      const rowLetter = getRowLabel(item.row + 1);
      const seatNo = `${rowLetter}-${index + 1}`;
      return {
        ...item,
        seatNumber: seatNo,
        label: seatNo,
      };
    });

    setItemsList(numberedTemplate);
    showToast('Đã sinh sơ đồ mẫu cơ bản!', 'success');
  }, [capacity, layoutRows, layoutCols, layoutItems.length, setItemsList, showToast]);

  // Render all grid cells
  const gridCells = useMemo(() => {
    const cells = [];
    for (let r = 0; r < layoutRows; r++) {
      for (let c = 0; c < layoutCols; c++) {
        cells.push(
          <CellItem
            key={`cell-${r}-${c}`}
            row={r}
            col={c}
            onCellClick={handleCellClick}
          />
        );
      }
    }
    return cells;
  }, [layoutRows, layoutCols, handleCellClick]);

  const renderDragOverlayContent = useCallback(() => {
    if (!activeDragId || !activeDragId.startsWith('tool-')) return null;

    const toolMatch = activeDragId.match(/^tool-([A-Z_]+)(?:-([a-zA-Z_]+))?$/);
    if (!toolMatch) return null;
    const itemType = toolMatch[1];
    const subType = toolMatch[2] === 'default' ? null : toolMatch[2];

    let rowSpan = 1;
    let colSpan = 1;
    let bgColor = '#2563eb';
    let border = '1px solid #1d4ed8';
    let borderRadius = '6px';

    if (itemType === LayoutItemType.TABLE) {
      bgColor = '#f59e0b';
      border = '1px solid #d97706';
      borderRadius = (subType === TableSubType.ROUND || subType === TableSubType.OVAL) ? '50%' : '8px';
      if (subType === TableSubType.RECTANGULAR) {
        rowSpan = 2;
        colSpan = 4;
      } else if (subType === TableSubType.ROUND || subType === TableSubType.SQUARE) {
        rowSpan = 2;
        colSpan = 2;
      } else if (subType === TableSubType.U_SHAPE) {
        rowSpan = 3;
        colSpan = 5;
      }
    } else if (itemType === LayoutItemType.CHAIR) {
      bgColor = '#2563eb';
      border = '1px solid #1d4ed8';
      borderRadius = '6px';
    } else if (itemType === LayoutItemType.TV) {
      bgColor = '#1e293b';
      border = '1px solid #0f172a';
    } else if (itemType === LayoutItemType.PROJECTOR) {
      bgColor = '#cbd5e1';
      border = '1px solid #94a3b8';
    } else if (itemType === LayoutItemType.DOOR) {
      bgColor = '#e2e8f0';
      border = '2px solid #64748b';
    } else if (itemType === LayoutItemType.WINDOW) {
      bgColor = '#e0f2fe';
      border = '2px solid #38bdf8';
    }

    const cellSide = 65;
    const gap = 4;
    const width = colSpan * cellSide + (colSpan - 1) * gap;
    const height = rowSpan * cellSide + (rowSpan - 1) * gap;

    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: bgColor,
          border,
          borderRadius,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          opacity: 0.8,
          cursor: 'grabbing',
          pointerEvents: 'none',
        }}
      />
    );
  }, [activeDragId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndWithOverlay}
      onDragCancel={handleDragCancel}
    >
      <CanvasWrapper>
        {/* 1. LEFT TOOLBAR PANEL */}
        {!readOnly && (
          <ToolSidebar>
            <SidebarHeader>HỘP CÔNG CỤ</SidebarHeader>
            <hr style={{ width: '100%', margin: '4px 0', border: 0, borderTop: '1px solid #e2e8f0' }} />

            <ToolButton
              $active={activeTool === 'SELECT'}
              onClick={handleSelectTool}
            >
              <TouchAppIcon /> Select Pointer
            </ToolButton>

            <SidebarCategory>BÀN HỌP</SidebarCategory>
            <SidebarItem
              tool={LayoutItemType.TABLE}
              subType={TableSubType.RECTANGULAR}
              label="Bàn chữ nhật (2x4)"
              icon={<TableBarIcon />}
              activeTool={activeTool}
              activeSubType={activeSubType}
              onToolClick={handleToolClick}
            />
            <SidebarItem
              tool={LayoutItemType.TABLE}
              subType={TableSubType.ROUND}
              label="Bàn tròn (2x2)"
              icon={<TableBarIcon />}
              activeTool={activeTool}
              activeSubType={activeSubType}
              onToolClick={handleToolClick}
            />

            <SidebarItem
              tool={LayoutItemType.TABLE}
              subType={TableSubType.U_SHAPE}
              label="Bàn chữ U (3x5)"
              icon={<TableBarIcon />}
              activeTool={activeTool}
              activeSubType={activeSubType}
              onToolClick={handleToolClick}
            />

            <SidebarCategory>CHỖ NGỒI</SidebarCategory>
            <SidebarItem
              tool={LayoutItemType.CHAIR}
              label="Ghế ngồi"
              icon={<ChairIcon />}
              activeTool={activeTool}
              onToolClick={handleToolClick}
            />

            <SidebarCategory>THIẾT BỊ & HẠ TẦNG</SidebarCategory>
            <SidebarItem
              tool={LayoutItemType.TV}
              label="Tivi treo tường"
              icon={<TvIcon />}
              activeTool={activeTool}
              onToolClick={handleToolClick}
            />
            <SidebarItem
              tool={LayoutItemType.PROJECTOR}
              label="Màn chiếu"
              icon={<ScreenShareIcon />}
              activeTool={activeTool}
              onToolClick={handleToolClick}
            />
            <SidebarItem
              tool={LayoutItemType.DOOR}
              label="Cửa ra vào"
              icon={<MeetingRoomIcon />}
              activeTool={activeTool}
              onToolClick={handleToolClick}
            />
            <SidebarItem
              tool={LayoutItemType.WINDOW}
              label="Cửa sổ"
              icon={<WindowIcon />}
              activeTool={activeTool}
              onToolClick={handleToolClick}
            />
          </ToolSidebar>
        )}

        {/* 2. DESIGNER CANVAS WORKSPACE */}
        <DesignerArea>
          <CanvasHeaderToolbar>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Tooltip title="Thu nhỏ">
                <IconButton onClick={handleZoomOut} size="small"><RemoveIcon /></IconButton>
              </Tooltip>
              <span style={{ fontSize: '14px', fontWeight: 'bold', alignSelf: 'center' }}>
                {Math.round(scale * 100)}%
              </span>
              <Tooltip title="Phóng to">
                <IconButton onClick={handleZoomIn} size="small"><AddIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Đặt lại zoom">
                <IconButton onClick={handleResetZoom} size="small"><RestartAltIcon /></IconButton>
              </Tooltip>
            </div>

            {!readOnly && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <OutlinedButton onClick={generateTemplateLayout}>
                  <RestartAltIcon /> Sinh sơ đồ mẫu
                </OutlinedButton>
                <OutlinedButton onClick={autoNumberSeats}>
                  <AutoAwesomeIcon /> Đánh số ghế tự động
                </OutlinedButton>
                <OutlinedButton onClick={clearLayout}>
                  <RedClearIcon /> Xóa sơ đồ
                </OutlinedButton>
              </div>
            )}

            {readOnly && (
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Chế độ xem sơ đồ phòng họp
              </span>
            )}
          </CanvasHeaderToolbar>

          <CanvasContainer>
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              minScale={0.3}
              maxScale={2.0}
              centerOnInit
              smooth={false}
              panning={{ disabled: !readOnly }}
              wheel={{ step: 0.03 }}
              onTransform={handleTransform}
            >
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                }}
                contentStyle={{
                  padding: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GridCanvas $rows={layoutRows} $cols={layoutCols}>
                  {/* Grid cell placeholders behind */}
                  {gridCells}

                  {/* Placed Items on top */}
                  {layoutItems.map(item => (
                    <PlacedItemBlock
                      key={item.id}
                      item={item}
                      isSelected={item.id === selectedItemId}
                      onClick={handleItemClick}
                      readOnly={readOnly}
                    />
                  ))}
                </GridCanvas>
              </TransformComponent>
            </TransformWrapper>
          </CanvasContainer>
        </DesignerArea>

        {/* 3. RIGHT PROPERTIES PANEL */}
        {!readOnly && selectedItem && (
          <PropertiesSidebar>
            <PropertiesHeader>THUỘC TÍNH VẬT THỂ</PropertiesHeader>
            <hr style={{ width: '100%', margin: '4px 0', border: 0, borderTop: '1px solid #e2e8f0' }} />

            <PropertyLabel>
              Loại vật thể: <PropertyValueBold>{selectedItem.itemType}</PropertyValueBold>
            </PropertyLabel>

            {/* Seat Number Input for Chair */}
            {selectedItem.itemType === LayoutItemType.CHAIR && (
              <TextField
                label="Số hiệu ghế"
                variant="outlined"
                size="small"
                value={selectedItem.seatNumber || ''}
                onChange={handleSeatNoChange}
                fullWidth
              />
            )}

            {/* Generic Label Input */}
            {selectedItem.itemType !== LayoutItemType.CHAIR && (
              <TextField
                label="Nhãn hiển thị"
                variant="outlined"
                size="small"
                value={selectedItem.label || ''}
                onChange={handleLabelChange}
                fullWidth
              />
            )}

            <hr style={{ width: '100%', margin: '8px 0', border: 0, borderTop: '1px solid #e2e8f0' }} />

            {/* Size inputs */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <TextField
                label="Số dòng (Height)"
                type="number"
                variant="outlined"
                size="small"
                value={selectedItem.rowSpan || 1}
                onChange={handleRowSpanChange}
                InputProps={{ inputProps: { min: 1, max: layoutRows } }}
              />
              <TextField
                label="Số cột (Width)"
                type="number"
                variant="outlined"
                size="small"
                value={selectedItem.colSpan || 1}
                onChange={handleColSpanChange}
                InputProps={{ inputProps: { min: 1, max: layoutCols } }}
              />
            </div>

            {/* Rotate control */}
            <RotateButton onClick={handleRotateClick}>
              <RotateRightIcon /> Xoay vật thể (90°)
            </RotateButton>

            <hr style={{ width: '100%', margin: '8px 0', border: 0, borderTop: '1px solid #e2e8f0' }} />

            {/* DUPLICATE CONTROLS SECTION */}
            <PropertiesHeader>NHÂN BẢN VẬT THỂ</PropertiesHeader>

            <FormControl size="small" fullWidth>
              <InputLabel>Hướng nhân bản</InputLabel>
              <Select
                value={dupDirection}
                label="Hướng nhân bản"
                onChange={handleDupDirectionChange}
              >
                <MenuItem value="RIGHT">Sang phải</MenuItem>
                <MenuItem value="LEFT">Sang trái</MenuItem>
                <MenuItem value="DOWN">Xuống dưới</MenuItem>
                <MenuItem value="UP">Lên trên</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Số lượng nhân bản"
              type="number"
              variant="outlined"
              size="small"
              value={dupCount}
              onChange={handleDupCountChange}
              InputProps={{ inputProps: { min: 1, max: 50 } }}
              fullWidth
            />

            <OutlinedButton onClick={handleDuplicateSelectedItem} $fullWidth>
              <ContentCopyIcon /> Thực hiện nhân bản
            </OutlinedButton>



            {/* Background color settings in properties */}
            <TextField
              label="Mã màu nền CSS"
              variant="outlined"
              size="small"
              value={selectedItem.properties?.backgroundColor || ''}
              onChange={handleColorChange}
              placeholder="Ví dụ: #ff0000"
              fullWidth
            />

            <hr style={{ width: '100%', margin: '8px 0', border: 0, borderTop: '1px solid #e2e8f0' }} />

            {/* Delete action */}
            <ErrorButton onClick={deleteSelectedItem} $fullWidth>
              <DeleteIcon /> Xóa khỏi sơ đồ
            </ErrorButton>
          </PropertiesSidebar>
        )}
      </CanvasWrapper>
      <DragOverlay dropAnimation={null}>
        {renderDragOverlayContent()}
      </DragOverlay>
    </DndContext>
  );
}
