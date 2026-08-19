import React from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TableBarIcon from '@mui/icons-material/TableBar';
import TvIcon from '@mui/icons-material/Tv';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import WindowIcon from '@mui/icons-material/Window';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import {
  SeatingArea,
  SeatItem,
  SeatLabel,
  SeatMemberName,
  SeatMemberPosition,
  SeatMemberRole,
  LegendContainer,
  LegendList,
  LegendItem,
  LegendBox,
  LegendText,
  StyledPersonAddIcon,
  SeatText
} from "@pages/MeetingCalendar/componentStyle/RegisterForMeetingRooms.style";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

const StyledSeatItem = styled(SeatItem)(({ assigned }) => ({
  cursor: 'default',
  '&:hover': {
    backgroundColor: assigned ? undefined : 'white',
  },
}));

const ModalWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: "#fff",
}));

const DiagramContainer = styled(Box)(({ theme }) => ({
  border: '1px solid #e2e8f0',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  position: 'relative',
}));

const DiagramHeader = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: '1px solid #f1f3f5',
  backgroundColor: '#fff',
}));

const DiagramTitle = styled(SkyTypography)({
  fontSize: '15px',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
});

const StyledSeatingArea = styled(SeatingArea)(({ theme }) => ({
  backgroundColor: '#ced4da',
  padding: theme.spacing(4),
  width: '100%',
  height: '100%',
  overflow: 'hidden',
}));

const StyledLegendContainer = styled(LegendContainer)(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(3),
  backgroundColor: '#fff',
}));

const LegendTitle = styled(SkyTypography)({
  fontSize: '12px',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
});

const ModalSeat = React.memo(({ seatLabel, assignedInfo }) => {
  return (
    <StyledSeatItem 
      assigned={!!assignedInfo} 
      itemType={assignedInfo?.types}
    >
      <SeatLabel assigned={!!assignedInfo}>{seatLabel}</SeatLabel>
      {assignedInfo ? (
        <>
          <SeatMemberName variant="body2">{assignedInfo.title || assignedInfo.name}</SeatMemberName>
          {assignedInfo.types !== 'organization_unit' && (
            <SeatMemberPosition variant="caption">
              {assignedInfo.position || assignedInfo.parentName || '---'}
            </SeatMemberPosition>
          )}
          <SeatMemberRole variant="body2">
            {assignedInfo.roles?.chair ? "Chủ trì" : assignedInfo.roles?.secretary ? "Thư ký" : (assignedInfo.types === 'guest' ? "Khách mời" : "Tham dự")}
          </SeatMemberRole>
        </>
      ) : (
        <>
          <StyledPersonAddIcon />
          <SeatText>Trống</SeatText>
        </>
      )}
    </StyledSeatItem>
  );
});
ModalSeat.displayName = "ModalSeat";

// Helper function to generate row labels (A, B, C...)
const getRowLabel = (index) => {
    const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return labels[index] || String.fromCharCode(65 + index);
};

// Styled components for grid layout matching RegisterForMeetingRooms
const SeatGrid = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== '$cols',
})(({ $cols }) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${$cols}, 180px)`,
    gap: '15px',
    width: 'fit-content',
    paddingBottom: '10px',
}));

const RowContainer = styled(SkyBox)({
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
    overflow: 'visible',
});

const StyledRowLabel = styled(SkyTypography)(({ theme }) => ({
    fontWeight: 'bold',
    color: theme.palette.text.primary,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    flexShrink: 0,
}));

const ScrollableChartContainer = styled(SkyBox)({
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
});

const ChartContentWrapper = styled(Box)(() => ({
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
  minWidth: 'max-content',
}));

// Navigation and Zoom Components
const NavigationButton = styled(SkyBox)(({ theme, disabled }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0 : 0.7,
  transition: 'opacity 0.3s, background-color 0.3s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1.5),
  borderRadius: '50%',
  backgroundColor: 'transparent', 
  '&:hover': {
      backgroundColor: disabled ? 'transparent' : 'rgba(0, 0, 0, 0.04)',
      opacity: disabled ? 0 : 1,
  }
}));

const PrevButton = styled(NavigationButton)(() => ({
  left: 0,
}));

const NextButton = styled(NavigationButton)(() => ({
  right: 0,
}));

const PaginationContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
}));

const PaginationDot = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  width: active ? '24px' : '8px',
  height: '8px',
  borderRadius: '4px',
  backgroundColor: active ? theme.palette.primary.main : '#cbd5e1',
  transition: 'all 0.3s ease',
}));

const RelativeDiagramHeader = styled(DiagramHeader)({
    position: 'relative',
});

const ZoomControls = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  position: 'absolute',
  right: theme.spacing(2),
  top: '50%',
  transform: 'translateY(-50%)',
}));

const ZoomValueText = styled(SkyTypography)({
    minWidth: 24, 
    textAlign: 'center',
});

const ZoomButton = styled(SkyBox)(({ theme }) => ({
  cursor: 'pointer',
  padding: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  border: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
  '&:hover': {
      backgroundColor: '#f1f5f9',
      color: theme.palette.text.primary,
  }
}));

const ModalZoomToolbar = React.memo(({ zoomIn, zoomOut, resetTransform, scale }) => {
  const handleZoomOut = React.useCallback(() => {
    zoomOut(0.1);
  }, [zoomOut]);

  const handleZoomIn = React.useCallback(() => {
    zoomIn(0.1);
  }, [zoomIn]);

  const handleReset = React.useCallback(() => {
    resetTransform();
  }, [resetTransform]);

  return (
    <ZoomControls>
      <ZoomButton onClick={handleZoomOut}>
        <RemoveIcon />
      </ZoomButton>
      <ZoomValueText variant="caption">
        {Math.round((scale || 1) * 100)}%
      </ZoomValueText>
      <ZoomButton onClick={handleZoomIn}>
        <AddIcon />
      </ZoomButton>
      <ZoomButton onClick={handleReset}>
        <RestartAltIcon />
      </ZoomButton>
    </ZoomControls>
  );
});
ModalZoomToolbar.displayName = "ModalZoomToolbar";

const ModalNewLayoutGrid = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$rows' && prop !== '$cols',
})(({ $rows, $cols }) => ({
  display: 'grid',
  gridTemplateRows: `repeat(${$rows}, minmax(80px, auto))`,
  gridTemplateColumns: `repeat(${$cols}, minmax(110px, auto))`,
  gap: '8px',
  backgroundColor: '#f8fafc',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  position: 'relative',
  userSelect: 'none',
}));

const ModalNonChairBlock = styled(Box, {
  shouldForwardProp: (prop) => !['$itemType', '$subType', '$row', '$col', '$rowSpan', '$colSpan', '$rotation'].includes(prop),
})(({ theme, $itemType, $subType, $row, $col, $rowSpan, $colSpan, $rotation }) => {
  let bgColor = '#e2e8f0';
  let border = '1px solid #cbd5e1';
  let color = '#334155';
  let borderRadius = '6px';
  let jpContent = 'center';
  let pt = '0px';
  let clipPathStyle = undefined;

  if ($itemType === 'TABLE') {
    bgColor = theme.palette.mode === 'dark' ? '#b45309' : '#f59e0b';
    border = '1px solid #d97706';
    color = '#ffffff';
    borderRadius = ($subType === 'ROUND' || $subType === 'OVAL') ? '50%' : '8px';

    if ($subType === 'U_SHAPE') {
      const rows = $rowSpan || 3;
      const cols = $colSpan || 5;
      const S = `${100 / cols}%`;
      const C = `${100 / rows}%`;
      clipPathStyle = `polygon(0% 100%, 0% 0%, 100% 0%, 100% 100%, calc(100% - ${S}) 100%, calc(100% - ${S}) ${C}, ${S} ${C}, ${S} 100%)`;
      jpContent = 'flex-start';
      pt = '8px';
    }
  } else if ($itemType === 'TV') {
    bgColor = '#1e293b';
    border = '1px solid #0f172a';
    color = '#ffffff';
  } else if ($itemType === 'PROJECTOR') {
    bgColor = '#cbd5e1';
    border = '1px solid #94a3b8';
    color = '#0f172a';
  } else if ($itemType === 'DOOR') {
    bgColor = '#e2e8f0';
    border = '2px solid #64748b';
    color = '#475569';
  } else if ($itemType === 'WINDOW') {
    bgColor = '#e0f2fe';
    border = '2px solid #38bdf8';
    color = '#0369a1';
  }

  return {
    gridRow: `${$row + 1} / span ${$rowSpan || 1}`,
    gridColumn: `${$col + 1} / span ${$colSpan || 1}`,
    backgroundColor: bgColor,
    border,
    color,
    borderRadius,
    transform: $rotation ? `rotate(${$rotation}deg)` : undefined,
    clipPath: clipPathStyle,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: jpContent,
    paddingTop: pt,
    fontWeight: 'bold',
    fontSize: '0.85rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    padding: clipPathStyle ? undefined : '8px',
    textAlign: 'center',
    '& svg': {
      fontSize: '20px',
      marginBottom: '4px',
    },
  };
});

const SeatingChartPreview = React.memo(({ room, seatMapping }) => {
  const rawItems = room?.layoutItems || room?.layoutConfig;
  const layoutItems = React.useMemo(() => {
    if (Array.isArray(rawItems)) return rawItems;
    if (typeof rawItems === 'string') {
      try { return JSON.parse(rawItems); } catch (e) { return []; }
    }
    return [];
  }, [rawItems]);

  const hasNewDesign = layoutItems.length > 0;

  if (hasNewDesign) {
    const rows = parseInt(room?.layoutRows || 8, 10);
    const cols = parseInt(room?.layoutCols || 10, 10);

    return (
      <ScrollableChartContainer>
        <ChartContentWrapper>
          <ModalNewLayoutGrid $rows={rows} $cols={cols}>
            {layoutItems.map((item) => {
              const rowSpan = item.rowSpan || 1;
              const colSpan = item.colSpan || 1;

              if (item.itemType === 'CHAIR') {
                const seatLabel = item.seatNumber || item.label || 'CHAIR';
                return (
                  <div
                    key={item.id}
                    style={{
                      gridRow: `${item.row + 1} / span ${rowSpan}`,
                      gridColumn: `${item.col + 1} / span ${colSpan}`,
                      display: 'flex',
                    }}
                  >
                    <ModalSeat
                      seatLabel={seatLabel}
                      assignedInfo={seatMapping[seatLabel]}
                    />
                  </div>
                );
              }

              return (
                <ModalNonChairBlock
                  key={item.id}
                  $itemType={item.itemType}
                  $subType={item.subType}
                  $row={item.row}
                  $col={item.col}
                  $rowSpan={rowSpan}
                  $colSpan={colSpan}
                  $rotation={item.rotation || 0}
                >
                  {item.itemType === 'TABLE' && <TableBarIcon />}
                  {item.itemType === 'TV' && <TvIcon />}
                  {item.itemType === 'PROJECTOR' && <ScreenShareIcon />}
                  {item.itemType === 'DOOR' && <MeetingRoomIcon />}
                  {item.itemType === 'WINDOW' && <WindowIcon />}
                  {item.label || (item.itemType === 'TABLE' ? 'BÀN HỌP' : item.itemType)}
                </ModalNonChairBlock>
              );
            })}
          </ModalNewLayoutGrid>
        </ChartContentWrapper>
      </ScrollableChartContainer>
    );
  }

  // --- Logic cũ (Fallback cho phòng họp chưa thiết kế sơ đồ mới) ---
  const { layoutType, layoutRows, layoutSeats, layoutBlocks, capacity, layoutColWing, layoutRowBottom } = room || {};
  const type = layoutType || 'theater';
  const isUShape = type === 'u_shape';
  
  const rawCols = parseInt(layoutRows || 10, 10);
  const rawRows = parseInt(layoutSeats || 5, 10);
  const numBlocks = parseInt(layoutBlocks || 1, 10);

  const isFallback = !layoutRows || !layoutSeats;
  const effectiveNumRows = isFallback ? Math.ceil((capacity || 25) / 5) : (layoutType === 'u_shape' ? rawRows + 1 : rawRows);
  const effectiveNumCols = isFallback ? 5 : rawCols;
  
  const colWing = parseInt(layoutColWing || 1, 10);
  const rowBottom = parseInt(layoutRowBottom || 1, 10);

  const supportsBlocks = ['theater', 'classroom', 'doi_xung', 'hoi_truong', 'theater_block'].includes(type);
  const totalColsInGrid = isUShape ? effectiveNumCols : (supportsBlocks && numBlocks > 1 ? effectiveNumCols + (numBlocks - 1) : effectiveNumCols);
  const seatsPerBlock = Math.ceil(effectiveNumCols / numBlocks);

  return (
    <ScrollableChartContainer>
      <ChartContentWrapper>
      {Array.from({ length: effectiveNumRows }).map((_, rowIndex) => {
        const rowChar = (layoutType === 'u_shape' && rowIndex === 0) ? "" : getRowLabel(layoutType === 'u_shape' ? rowIndex - 1 : rowIndex);
        let currentSeatIndexInRow = 0;

        return (
            <RowContainer key={`row-${rowChar}`}>
              <StyledRowLabel>{rowChar}</StyledRowLabel>
              <SeatGrid $cols={totalColsInGrid}>
                {Array.from({ length: totalColsInGrid }).map((__, colIndex) => {
                   const colLabel = colIndex + 1;
                   const isGap = numBlocks > 1 && supportsBlocks && colIndex > 0 && (colIndex + 1) % (seatsPerBlock + 1) === 0;

                    if (isGap) return <SkyBox key={`gap-${rowChar}-${colLabel}`} />;

                    let shouldRenderSeat = true;

                    if (type === 'u_shape') {
                        const isTopEdgeGap = rowIndex === 0;
                        const isWing = colIndex < colWing || colIndex >= totalColsInGrid - colWing;
                        const isBottom = rowIndex >= effectiveNumRows - rowBottom;
                        if (isTopEdgeGap || (!isWing && !isBottom)) shouldRenderSeat = false;
                    } else if (type === 'h_shape') {
                        const isLeftEdge = colIndex === 0;
                        const isRightEdge = colIndex === totalColsInGrid - 1;
                        const isMiddleRow = rowIndex === Math.floor(effectiveNumRows / 2);
                        if (!isLeftEdge && !isRightEdge && !isMiddleRow) shouldRenderSeat = false;
                    } else if (type === 'meeting_table') {
                        const isTopRow = rowIndex === 0;
                        const isBottomRow = rowIndex === effectiveNumRows - 1;
                        const isLeftCol = colIndex === 0;
                        const isRightCol = colIndex === totalColsInGrid - 1;
                        const isMiddleCol = colIndex === Math.floor(totalColsInGrid / 2);

                        if (isTopRow || isBottomRow) {
                            if (!isMiddleCol) shouldRenderSeat = false;
                        } else {
                            if (!isLeftCol && !isRightCol) shouldRenderSeat = false;
                        }
                    } else if (type === 'o_shape' || type === 'boardroom') {
                        const isInner = rowIndex > 0 && rowIndex < effectiveNumRows - 1 && colIndex > 0 && colIndex < totalColsInGrid - 1;
                        if (isInner) shouldRenderSeat = false;
                    } else if (type === 'l_shape') {
                        const isLeftEdge = colIndex === 0;
                        const isBottomEdge = rowIndex === effectiveNumRows - 1;
                        if (!isLeftEdge && !isBottomEdge) shouldRenderSeat = false;
                    } else if (type === 't_shape') {
                        const isTopEdge = rowIndex === 0;
                        const isMiddleCol = colIndex === Math.floor(totalColsInGrid / 2);
                        if (!isTopEdge && !isMiddleCol) shouldRenderSeat = false;
                    } else if (type === 'e_shape') {
                        const isLeftEdge = colIndex === 0;
                        const isTopEdge = rowIndex === 0;
                        const isBottomEdge = rowIndex === effectiveNumRows - 1;
                        const isMiddleRow = rowIndex === Math.floor(effectiveNumRows / 2);
                        if (!isLeftEdge && !isTopEdge && !isBottomEdge && !isMiddleRow) shouldRenderSeat = false;
                    } else if (type === 'u_shape_double') {
                         const isLeftLeg = colIndex < 2;
                         const isRightLeg = colIndex >= totalColsInGrid - 2;
                         const isBottomRows = rowIndex >= effectiveNumRows - 2;
                         if (!isLeftLeg && !isRightLeg && !isBottomRows) shouldRenderSeat = false;
                    } else if (type === 'theater_block') {
                         shouldRenderSeat = true;
                    }

                    if (!shouldRenderSeat) return <SkyBox key={`empty-${rowChar}-${colLabel}`} />;

                    currentSeatIndexInRow += 1;
                    const seatLabel = `${rowChar}-${currentSeatIndexInRow}`;

                    return (
                       <ModalSeat
                         key={seatLabel}
                         seatLabel={seatLabel}
                         assignedInfo={seatMapping[seatLabel]}
                       />
                    );
                })}
              </SeatGrid>
            </RowContainer>
        );
      })}
      </ChartContentWrapper>
    </ScrollableChartContainer>
  );
});
SeatingChartPreview.displayName = "SeatingChartPreview";

const SeatingDiagramModal = ({ open, onClose, rooms = [], activeRoomId, selectedUnits = [], sharedComponents }) => {
  const { Dialog } = sharedComponents;
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [scale, setScale] = React.useState(1.0);

  const handleTransform = React.useCallback((ref, state) => {
    setScale(state.scale);
  }, []);

  React.useEffect(() => {
    if (open) {
      setScale(1.0);
    }
  }, [open, currentIndex]);

  React.useEffect(() => {
    if (open && activeRoomId) {
      const idx = rooms.findIndex(r => r.id === activeRoomId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      } else {
        setCurrentIndex(0);
      }
    } else if (open) {
      setCurrentIndex(0);
    }
  }, [open, rooms, activeRoomId]);

  const currentRoom = React.useMemo(() => rooms[currentIndex] || {}, [rooms, currentIndex]);

  const currentSeatMapping = React.useMemo(() => {
    const mapping = {};
    if (!currentRoom.id) return mapping;
    
    selectedUnits.forEach(u => {
        if (u.seatNumber && u.roomId === currentRoom.id) {
            mapping[u.seatNumber] = u;
        }
        if (u.types === 'guest_group' && Array.isArray(u.members)) {
          u.members.forEach(m => {
            if (m.seatNumber && m.roomId === currentRoom.id) {
              mapping[m.seatNumber] = m;
            }
          });
        }
    });
    return mapping;
  }, [selectedUnits, currentRoom.id]);

  const handleNext = () => {
    if (currentIndex < rooms.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      title="Sơ đồ vị trí ngồi"
      size="lg"
      hideFooter
    >
      <ModalWrapper>
        <DiagramContainer>
          {rooms.length > 1 && (
             <>
               <PrevButton 
                 onClick={handlePrev} 
                 disabled={currentIndex === 0}
               >
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
               </PrevButton>
               <NextButton 
                 onClick={handleNext} 
                 disabled={currentIndex === rooms.length - 1}
               >
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
               </NextButton>
             </>
          )}

          <TransformWrapper
            initialScale={1}
            minScale={0.3}
            maxScale={2}
            centerOnInit
            smooth={false}
            panning={{ disabled: false }}
            wheel={{ step: 0.03 }}
            onTransform={handleTransform}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <RelativeDiagramHeader>
                  <DiagramTitle>
                    {currentRoom.name?.toUpperCase() || "TÊN PHÒNG HỌP"} - TÒA NHÀ TÂN CẢNG
                  </DiagramTitle>
                  
                  <ModalZoomToolbar
                    zoomIn={zoomIn}
                    zoomOut={zoomOut}
                    resetTransform={resetTransform}
                    scale={scale}
                  />
                </RelativeDiagramHeader>

                <StyledSeatingArea>
                  <TransformComponent
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <SeatingChartPreview 
                      room={currentRoom} 
                      seatMapping={currentSeatMapping}
                    />
                  </TransformComponent>
                </StyledSeatingArea>
              </>
            )}
          </TransformWrapper>

          <StyledLegendContainer>
             <LegendList>
               <LegendItem>
                 <LegendBox variant="empty" />
                 <LegendText>Vị trí còn trống</LegendText>
               </LegendItem>
               <LegendItem>
                 <LegendBox variant="unit" />
                 <LegendText>Đơn vị tham gia</LegendText>
               </LegendItem>
               <LegendItem>
                 <LegendBox variant="person" />
                 <LegendText>Người tham gia nội bộ</LegendText>
               </LegendItem>
               <LegendItem>
                 <LegendBox variant="success" />
                 <LegendText>Khách mời tham gia</LegendText>
               </LegendItem>
             </LegendList>
             <LegendTitle>
               TÂN CẢNG SÀI GÒN
             </LegendTitle>
          </StyledLegendContainer>
            {rooms.length > 1 && (
                <PaginationContainer>
                    {rooms.map((r, idx) => (
                        <PaginationDot key={r.id || idx} active={idx === currentIndex} />
                    ))}
                </PaginationContainer>
            )}
        </DiagramContainer>
      </ModalWrapper>
    </Dialog>
  );
};

export default SeatingDiagramModal;