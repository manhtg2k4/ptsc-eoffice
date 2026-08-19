import React from "react";
import { Controller, useWatch } from "react-hook-form";
import { Box, Collapse, Grid, Typography, styled, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import LanguageIcon from "@mui/icons-material/Language";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
// import axiosInstance from "@utils/axiosInstance";
// import { API_ADD_MEETING_SCHEDULE } from "@EnvironmentFile/constants/urlConfig";
// import { useToast } from "@components/common/ToastProvider";
import { 
  StyledHeaderContent,
  StyledDivider 
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
  RegisterRoomContainer,
  RegisterRoomHeader,
  // RegisterRoomTitle,
  RegisterRoomContent,
  FormItem,
  FormLabel,
  StyledRadioGroup,
  StyledFormControlLabel,
  RegisterButton,
  SectionContainer,
  SectionHeader,
  // SectionTitle,
  RoomCardsRow,
  SelectedRoomCard,
  RoomCardTitle,
  RoomCardSub,
  RoomCardCapacity,
  RoomCardDivider,
  RoomCardFooter,
  StatusBadge,
  AssignmentText,
  MainLayout,
  LeftPanel,
  RightPanel,
  AttendanceHeader,
  AttendanceStats,
  SeatingHeader,
  SeatingTitle,
  SeatingStats,
  SeatingArea, // Giữ lại container ngoài
  // SeatList,
  SeatItem,
  LegendContainer,
  LegendItem,
  AccordionItem,
  AccordionHeaderTitle,
  ParticipantRole,
  ParticipantSubRole,
  SeatLabel,
  SeatText,
  LegendBox,
  LegendText,
  LegendList,
  StyledRadio,
  AttendanceTitle,
  LegendCaption,
  EditIconButton,
  StyledExpandLessIcon,
  StyledExpandMoreIcon,
  AccordionHeader,
  ParticipantCard,
  AttendanceHeaderInfo,
  AddParticipantLink,
  // EditSeatsLink,
  BoardSectionLabel,
  BoardCard,
  BoardLabel,
  BoardName,
  EmptyBoardName,
  BoardTitle,
  EmptyStateWrapper,
  AccordionHeaderCaption,
  ParticipantName,
  UnassignButton,
  SeatMemberName,
  SeatMemberPosition,
  SeatMemberRole,
  StyledPersonAddIcon,
  TaskIconsContainer,
  TooltipContent,
  TaskDocName,
  AccordionContentWrapper,
  AccordionHeaderInner,
  TaskIconsWrapper,
  StyledInsertDriveFileIcon,
  RegisterFormItemWrapper,
  StyledTaskActionLink,
  StyledSmallAddIcon,
  StyledTaskRemainingCountLabel,
  TaskDivider,
  AssignedBadge,
  AssignedCountLabel,
  FlexRowBetween,
  TaskExpandToggleLabel,
  GuestCount,
  UnassignedText,
  OnlineMeetingPlaceholder,
  OnlineMeetingText,
} from "@pages/MeetingCalendar/componentStyle/RegisterForMeetingRooms.style"; // Đảm bảo đường dẫn đúng

import ButtonOutline from "@components/CustomButtonOutline";
import { LightTooltip } from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
import MeetingRoomSelection from "./MeetingRoomSelection";
import AssignSeatModal from "./AssignSeatModal";
import SeatingDiagramModal from "./SeatingDiagramModal";
import AddGuestModal from "./AddGuestModal";
import { SkyBox, SkyTypography, SkyMenu, SkyMenuItem, SkyListItemIcon, SkyListItemText, SkyFlexGap8, SkyMenuIcon, SkyEditIcon, SkyDeleteIcon } from "@styles/SkyStyles";
import { CustomDialog } from "@components/CustomDialog";

const ClickableParticipantName = styled(ParticipantName, {
  shouldForwardProp: (prop) => prop !== "$isView",
})(({ $isView }) => ({
  cursor: !$isView ? 'pointer' : 'default',
}));

const ClickableIconWrapper = styled(SkyFlexGap8)({
  cursor: 'pointer',
});

const OnlineMeetingLinkFormItem = styled(FormItem, {
  shouldForwardProp: (prop) => prop !== "$forceFullWidth",
})(({ $forceFullWidth }) =>
  $forceFullWidth
    ? {
        width: "100%",
        alignItems: "stretch",
      }
    : {}
);

const OnlineMeetingLinkFieldWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$forceFullWidth",
})(({ $forceFullWidth }) =>
  $forceFullWidth
    ? {
        width: "100%",
      }
    : {}
);


// --- NEW/UPDATED STYLED COMPONENTS FOR LAYOUT LOGIC ---

const SeatGrid = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== '$cols',
})(({ $cols }) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${$cols}, 180px)`, // Fixed width to ensure alignment across rows
    gap: '15px',
    width: 'fit-content',
    paddingBottom: '10px',
}));

const RowLabel = styled(SkyTypography)(({ theme }) => ({
    fontWeight: 'bold',
    color: theme.palette.text.primary,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
}));

const CustomText = styled(SkyTypography)(({ theme }) => ({
    fontWeight: 'bold',
    color: theme.palette.text.primary,
}));

const ViewModeRoomContainer = styled(Grid)(({ theme }) => ({
  display: "flex", 
  gap: theme.spacing(1),
}));

const ViewModeRoomLabel = styled(CustomText)(() => ({
  whiteSpace: "nowrap",
}));

const ViewModeRoomList = styled(Typography)(() => ({
  wordBreak: "break-word",
}));

const RowContainer = styled(SkyBox)({
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
    overflow: 'visible', // Không cho scroll riêng từng hàng
});

// --- Seating Chart Container Components ---
const SeatingChartWrapper = styled(SkyBox)(() => ({
  width: "100%",
}));

const RightPanelWrapper = styled(SkyBox)(() => ({
  width: "100%",
  maxHeight: "700px",
  overflowX: "auto",
  overflowY: "auto",

  /* ===== Chrome / Edge / Safari ===== */
  "&::-webkit-scrollbar": {
    width: 1,   // dọc: siêu mỏng
    height: 1,  // ngang: siêu mỏng
  },

  "&::-webkit-scrollbar-track": {
    background: "transparent",
  },

  /* Mặc định: gần như vô hình */
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,0.08)", // trong suốt mạnh
    borderRadius: 8,
  },

  /* Hover: chỉ rõ hơn 1 chút */
  "&:hover::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  /* ===== Firefox ===== */
  scrollbarWidth: "thin",
  scrollbarColor: "rgb(0 0 0 / 0%) transparent",
}));

const SeatingChartInner = styled(SkyBox)(() => ({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 'max-content',
}));

const NewLayoutGrid = styled(SkyBox, {
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

const NonChairBlock = styled(SkyBox, {
  shouldForwardProp: (prop) => !['$itemType', '$subType', '$row', '$col', '$rowSpan', '$colSpan'].includes(prop),
})(({ theme, $itemType, $subType, $row, $col, $rowSpan, $colSpan }) => {
  let bgColor = '#e2e8f0';
  let border = '1px solid #cbd5e1';
  let color = '#334155';
  let borderRadius = '6px';

  if ($itemType === 'TABLE') {
    bgColor = theme.palette.mode === 'dark' ? '#b45309' : '#f59e0b';
    border = '1px solid #d97706';
    color = '#ffffff';
    borderRadius = ($subType === 'ROUND' || $subType === 'OVAL') ? '50%' : '8px';
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    padding: '8px',
    textAlign: 'center',
  };
});

const ZoomControls = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(0.5, 1.5),
    borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    width: 'fit-content',
    border: `1px solid ${theme.palette.divider}`,
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    zIndex: 100,
}));

const ZoomButton = styled(IconButton)(({ theme }) => ({
    padding: 4,
    color: theme.palette.primary.main,
    '&:hover': {
        backgroundColor: theme.palette.primary.light,
        color: '#fff',
    },
}));

const ChartContainer = styled(SkyBox)(() => ({
    position: 'relative',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
}));

const ZoomIconText = styled(Typography)(() => ({
    fontWeight: 'bold',
    fontSize: '18px',
    width: '20px',
    textAlign: 'center',
}));

const ZoomValueText = styled(Typography)(() => ({
    variant: 'caption',
    minWidth: '40px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '0.75rem',
}));

const ZoomDivider = styled(Box)(({ theme }) => ({
    width: '1px',
    height: '16px',
    backgroundColor: theme.palette.divider,
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
}));

const ResetActionText = styled(Typography)(() => ({
    variant: 'caption',
    fontWeight: 'bold',
    fontSize: '0.75rem',
}));

const ZoomToolbar = React.memo(({ zoomIn, zoomOut, resetTransform, scale }) => {
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
      <ZoomButton size="small" onClick={handleZoomOut} title="Thu nhỏ">
        <ZoomIconText>-</ZoomIconText>
      </ZoomButton>
      <ZoomValueText>
        {Math.round((scale || 1) * 100)}%
      </ZoomValueText>
      <ZoomButton size="small" onClick={handleZoomIn} title="Phóng to">
        <ZoomIconText>+</ZoomIconText>
      </ZoomButton>
      <ZoomDivider />
      <ZoomButton size="small" onClick={handleReset} title="Mặc định">
        <ResetActionText>Reset</ResetActionText>
      </ZoomButton>
    </ZoomControls>
  );
});

ZoomToolbar.displayName = "ZoomToolbar";

const DeleteActionWrapper = styled(Box)(() => ({
  position: "absolute", 
  top: "5px", 
  right: "5px", 
  zIndex: 10
}));

const RelativeSelectedRoomCard = styled(SelectedRoomCard)(() => ({
  position: 'relative',
}));

// --- HELPER FUNCTIONS ---
const getRowLabel = (index) => {
    const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return labels[index] || String.fromCharCode(65 + index);
};

const TaskIcons = ({ tasks, onAdd, isView, onEdit, onDelete, isProcessingAction, hideAdd }) => {
  const displayTasks = tasks || [];
  const hasTasks = displayTasks.length > 0;
  const [contextMenu, setContextMenu] = React.useState(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = React.useState(null);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleStopPropagation = React.useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleAddClick = React.useCallback((e) => {
    e.stopPropagation();
    onAdd?.();
  }, [onAdd]);

  const handleToggleExpand = React.useCallback((e) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  const handleOpenMenu = React.useCallback((e, taskIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTaskIndex(taskIndex);
    setContextMenu(
      contextMenu === null
        ? { mouseX: e.clientX + 2, mouseY: e.clientY - 6 }
        : null
    );
  }, [contextMenu]);

  const handleIconClick = React.useCallback((e) => {
    if (isView) return;
    const taskIndex = e.currentTarget.dataset.index;
    if (taskIndex !== undefined) {
      handleOpenMenu(e, parseInt(taskIndex, 10));
    }
  }, [isView, handleOpenMenu]);

  const handleCloseContextMenu = React.useCallback(() => {
    setContextMenu(null);
    setSelectedTaskIndex(null);
  }, []);

  const handleEdit = React.useCallback(() => {
    if (selectedTaskIndex !== null && onEdit) {
      onEdit(tasks[selectedTaskIndex], selectedTaskIndex);
    }
    handleCloseContextMenu();
  }, [selectedTaskIndex, tasks, onEdit, handleCloseContextMenu]);

  const handleDelete = React.useCallback(() => {
    if (selectedTaskIndex !== null && onDelete) {
      onDelete(selectedTaskIndex);
    }
    handleCloseContextMenu();
  }, [selectedTaskIndex, onDelete, handleCloseContextMenu]);

  if (!hasTasks) {
    if (isView || isProcessingAction || hideAdd) return null;
    return (
      <StyledTaskActionLink onClick={handleAddClick}>
        +Chuẩn bị tài liệu
      </StyledTaskActionLink>
    );
  }

  const tasksToShow = isExpanded ? displayTasks : displayTasks.slice(0, 3);

  return (
    <>
      <TaskIconsContainer onClick={handleStopPropagation}>
         {!isView && !isProcessingAction && (
           <StyledTaskActionLink onClick={onAdd}>
              <StyledSmallAddIcon />
           </StyledTaskActionLink>
         )}
         {!isView && !isProcessingAction && hasTasks && <TaskDivider />}
         {tasksToShow.map((task, idx) => (
           <LightTooltip
              key={idx}
              title={
                <TooltipContent>
                   <TaskDocName variant="body2">Tài liệu : {task.documentName}</TaskDocName>
                   <Typography variant="body2">Thời hạn : {dayjs(task.deadline).format("HH:mm - DD/MM/YYYY")}</Typography>
                   {task.content && <Typography variant="body2">Nội dung : {task.content}</Typography>}
                 </TooltipContent>
              }
              arrow
              placement="top"
           >
              <StyledInsertDriveFileIcon
                data-index={idx}
                $isView={isView}
                onClick={handleIconClick}
              >
                 <InsertDriveFileIcon />
              </StyledInsertDriveFileIcon>
           </LightTooltip>
         ))}
         {displayTasks.length > 3 && !isExpanded && (
           <StyledTaskRemainingCountLabel 
             variant="caption" 
             onClick={handleToggleExpand}
           >
             +{displayTasks.length - 3}
           </StyledTaskRemainingCountLabel>
         )}
         {isExpanded && displayTasks.length > 3 && (
           <TaskExpandToggleLabel 
             variant="caption" 
             onClick={handleToggleExpand}
           >
             (ẩn)
           </TaskExpandToggleLabel>
         )}
      </TaskIconsContainer>
      
      {/* Context Menu */}
      <SkyMenu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <SkyMenuItem onClick={handleEdit}>
          <SkyListItemIcon>
            <EditIcon />
          </SkyListItemIcon>
          <SkyListItemText>Chỉnh sửa</SkyListItemText>
        </SkyMenuItem>
        <SkyMenuItem onClick={handleDelete}>
          <SkyListItemIcon>
            <DeleteIcon  />
          </SkyListItemIcon>
          <SkyListItemText>Xoá</SkyListItemText>
        </SkyMenuItem>
      </SkyMenu>
    </>
  );
};

const SeatBadge = ({ assigned, count }) => {
  if (count !== undefined) {
    if (count === 0) return null;
    return (
      <AssignedCountLabel variant="caption">
        Vị trí đã gán : {count}
      </AssignedCountLabel>
    );
  }
  if (!assigned) return null;
  return <AssignedBadge>Đã gán vị trí</AssignedBadge>;
};

const GuestMemberItem = React.memo(({ guest, index, onEdit, onDelete, isView }) => {
  const [contextMenu, setContextMenu] = React.useState(null);

  const handleOpenMenu = React.useCallback((e) => {
    if (isView) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? { mouseX: e.clientX + 2, mouseY: e.clientY - 6 }
        : null
    );
  }, [contextMenu, isView]);

  const handleCloseContextMenu = React.useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleEdit = React.useCallback(() => {
    onEdit(index);
    handleCloseContextMenu();
  }, [index, onEdit, handleCloseContextMenu]);

  const handleDelete = React.useCallback(() => {
    onDelete(index);
    handleCloseContextMenu();
  }, [index, onDelete, handleCloseContextMenu]);

  return (
    <>
      <ParticipantCard onContextMenu={handleOpenMenu}>
        <FlexRowBetween>
          <ClickableParticipantName 
            onClick={handleEdit}
            $isView={isView}
          >
            {guest.title || guest.name || guest.guestName}
          </ClickableParticipantName>
          <SeatBadge assigned={!!guest.seatNumber} />
        </FlexRowBetween>
        <ParticipantRole>{guest.position || guest.guestTitle || "---"}</ParticipantRole>
        <FlexRowBetween>
          <ParticipantSubRole>Tham dự</ParticipantSubRole>
          {!isView && (
            <ClickableIconWrapper onClick={handleOpenMenu}>
              <SkyMenuIcon />
            </ClickableIconWrapper>
          )}
        </FlexRowBetween>
      </ParticipantCard>

      <SkyMenu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <SkyMenuItem onClick={handleEdit}>
          <SkyListItemIcon>
            <SkyEditIcon/>
          </SkyListItemIcon>
          <SkyListItemText>Chỉnh sửa</SkyListItemText>
        </SkyMenuItem>
        <SkyMenuItem onClick={handleDelete}>
          <SkyListItemIcon>
            <SkyDeleteIcon />
          </SkyListItemIcon>
          <SkyListItemText>Xoá</SkyListItemText>
        </SkyMenuItem>
      </SkyMenu>
    </>
  );
});
GuestMemberItem.displayName = "GuestMemberItem";

const AttendanceItem = React.memo(({ item, expandedSections, onToggle, onAddTask, onEditTask, onDeleteTask, isView, isProcessingAction, onAddGuest, onEditGuest, onDeleteGuest }) => {
  const isExpanded = expandedSections.includes(item.id);
  const handleToggle = React.useCallback(() => onToggle(item.id), [item.id, onToggle]);

  const handleStopPropagation = React.useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleAddTaskClick = React.useCallback(() => {
    onAddTask(item, "UNIT");
  }, [item, onAddTask]);

  const handleEditTask = React.useCallback((task, taskIndex) => {
    onEditTask?.(item, task, taskIndex, "UNIT");
  }, [item, onEditTask]);

  const handleDeleteTask = React.useCallback((taskIndex) => {
    // Need a global task index or filter tasks first
    // For simplicity, we'll implement filtering in onEditTask/onDeleteTask
    onDeleteTask?.(item, taskIndex, "UNIT");
  }, [item, onDeleteTask]);

  const handleAddGuestClick = React.useCallback((e) => {
    e.stopPropagation();
    onAddGuest?.();
  }, [onAddGuest]);

  return (
    <AccordionItem>
      <AccordionHeader expanded={isExpanded} onClick={handleToggle}>
        <AccordionContentWrapper>
          <AccordionHeaderInner>
            <AccordionHeaderTitle isExpanded={isExpanded}>
               {item.name}
            </AccordionHeaderTitle>
          </AccordionHeaderInner>
          <FlexRowBetween>
            {item.isGuestGroup ? (
              <Box>
                <AccordionHeaderCaption variant="caption" >
                  Tham dự
                </AccordionHeaderCaption>
                <GuestCount>
                  Người tham gia : {item.members?.length || 0}
                </GuestCount>
              </Box>
            ) : (
                <Box>
                    <AccordionHeaderCaption variant="caption">
                        Tham dự {item.members?.length > 0 ? `(${item.members.length})` : ""}
                    </AccordionHeaderCaption>
                    {(!item.members || item.members.length === 0) && (
                        <Box>
                            <UnassignedText variant="caption">
                                Chưa gán người tham gia
                            </UnassignedText>
                        </Box>
                    )}
                </Box>
            )}
            <TaskIconsWrapper onClick={handleStopPropagation}>
               {item.isGuestGroup ? (
                 (!isView && !isProcessingAction) && (
                   <AddParticipantLink onClick={handleAddGuestClick}>
                     + Thêm khách mời
                   </AddParticipantLink>
                 )
               ) : (
                 item._originalUnit && (
                   <TaskIcons 
                     tasks={(item.tasks || []).filter(t => !t.attachableRole || (t.attachableRole !== 'CHAIRMAN' && t.attachableRole !== 'SECRETARY'))} 
                     onAdd={handleAddTaskClick} 
                     onEdit={handleEditTask}
                     onDelete={handleDeleteTask}
                     isView={isView}
                     isProcessingAction={isProcessingAction}
                     hideAdd={item.isRoomSelected === false}
                   />
                 )
               )}
            </TaskIconsWrapper>
          </FlexRowBetween>
          {item.assignedCount > 0 && (
            <Box mt={0.5}>
              <SeatBadge count={item.assignedCount} />
            </Box>
          )}
        </AccordionContentWrapper>
        {item.members && item.members.length > 0 ? (
          isExpanded ? <StyledExpandLessIcon /> : <StyledExpandMoreIcon />
        ) : null}
      </AccordionHeader>
      <Collapse in={isExpanded}>
        <Box pb={1}>
          {item.members?.map((m, idx) => (
            item.isGuestGroup ? (
              <GuestMemberItem 
                key={m.id || idx}
                guest={m}
                index={idx}
                onEdit={onEditGuest}
                onDelete={onDeleteGuest}
                isView={isView}
              />
            ) : (
              <ParticipantCard key={m.id || idx}>
                 <FlexRowBetween>
                   <ParticipantName>{m.title || m.name}</ParticipantName>
                   <SeatBadge assigned={!!m.seatNumber} />
                 </FlexRowBetween>
                 <ParticipantRole>{m.position || m.parentName || "---"}</ParticipantRole>
                 <FlexRowBetween>
                   <ParticipantSubRole>Tham dự</ParticipantSubRole>
                   <TaskMemberIcons m={m} onAddTask={onAddTask} onEditTask={onEditTask} onDeleteTask={onDeleteTask} isView={isView} isProcessingAction={isProcessingAction} />
                 </FlexRowBetween>
              </ParticipantCard>
            )
          ))}
        </Box>
      </Collapse>
    </AccordionItem>
  );
});

const TaskMemberIcons = React.memo(({ m, onAddTask, onEditTask, onDeleteTask, isView, isProcessingAction }) => {
  const handleAdd = React.useCallback(() => onAddTask(m, "PARTICIPANT"), [m, onAddTask]);
  const handleEdit = React.useCallback((task, taskIndex) => onEditTask?.(m, task, taskIndex, "PARTICIPANT"), [m, onEditTask]);
  const handleDelete = React.useCallback((taskIndex) => onDeleteTask?.(m, taskIndex, "PARTICIPANT"), [m, onDeleteTask]);
  
  const filteredTasks = (m.tasks || []).filter(t => t.attachableRole === "PARTICIPANT" || t.attachableType === "PARTICIPANT" || (!t.attachableRole && !t.attachableType));

  return <TaskIcons tasks={filteredTasks} onAdd={handleAdd} onEdit={handleEdit} onDelete={handleDelete} isView={isView} isProcessingAction={isProcessingAction} />;
});

const ChairmanTaskIcons = React.memo(({ chairman, onOpenPrepareDocs, onEditTask, onDeleteTask, isView, isProcessingAction }) => {
  const handleAdd = React.useCallback(() => onOpenPrepareDocs?.(chairman, null, null, "CHAIRMAN"), [chairman, onOpenPrepareDocs]);
  const handleEdit = React.useCallback((task, taskIndex) => onEditTask?.(chairman, task, taskIndex, "CHAIRMAN"), [chairman, onEditTask]);
  const handleDelete = React.useCallback((taskIndex) => onDeleteTask?.(chairman, taskIndex, "CHAIRMAN"), [chairman, onDeleteTask]);
  
  const filteredTasks = (chairman.tasks || []).filter(t => t.attachableRole === "CHAIRMAN");
  
  return <TaskIcons tasks={filteredTasks} onAdd={handleAdd} onEdit={handleEdit} onDelete={handleDelete} isView={isView} isProcessingAction={isProcessingAction} />;
});

const SecretaryTaskIcons = React.memo(({ secretary, onOpenPrepareDocs, onEditTask, onDeleteTask, isView, isProcessingAction }) => {
  const handleAdd = React.useCallback(() => onOpenPrepareDocs?.(secretary, null, null, "SECRETARY"), [secretary, onOpenPrepareDocs]);
  const handleEdit = React.useCallback((task, taskIndex) => onEditTask?.(secretary, task, taskIndex, "SECRETARY"), [secretary, onEditTask]);
  const handleDelete = React.useCallback((taskIndex) => onDeleteTask?.(secretary, taskIndex, "SECRETARY"), [secretary, onDeleteTask]);
  
  const filteredTasks = (secretary?.tasks || []).filter(t => t.attachableRole === "SECRETARY");
  
  return <TaskIcons tasks={filteredTasks} onAdd={handleAdd} onEdit={handleEdit} onDelete={handleDelete} isView={isView} isProcessingAction={isProcessingAction} />;
});

AttendanceItem.displayName = "AttendanceItem";

// --- SEAT COMPONENT ---
const Seat = React.memo(({ seatLabel, assignedInfo, onClick, onUnassign, isEditingSeats }) => {
  const handleClick = React.useCallback(() => {
    if (!isEditingSeats) return;
    if (assignedInfo) return;
    onClick(seatLabel);
  }, [onClick, seatLabel, assignedInfo, isEditingSeats]);

  const handleUnassignClick = React.useCallback((e) => {
    e.stopPropagation();
    if (!isEditingSeats) return;
    onUnassign(seatLabel);
  }, [onUnassign, seatLabel, isEditingSeats]);

  return (
    <SeatItem 
      onClick={handleClick} 
      assigned={!!assignedInfo} 
      itemType={assignedInfo?.types}
      disabled={!isEditingSeats && !assignedInfo}
      // style={{ minHeight: '80px' }} // Ensure visual consistency in grid
    >
      <SeatLabel assigned={!!assignedInfo}>{seatLabel}</SeatLabel>
      {assignedInfo ? (
        <>
          {isEditingSeats && (
            <UnassignButton size="small" onClick={handleUnassignClick}>
              <CloseIcon />
            </UnassignButton>
          )}
          <LightTooltip title={assignedInfo.title || assignedInfo.name} arrow placement="top">
            <SeatMemberName variant="body2">{assignedInfo.title || assignedInfo.name}</SeatMemberName>
          </LightTooltip>
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
    </SeatItem>
  );
});
Seat.displayName = "Seat";

// --- SEATING CHART COMPONENT ---
const SeatingChart = React.memo(({ room, onSeatClick, seatMapping, onUnassign, isEditingSeats }) => {
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
      <SeatingChartWrapper>
        <SeatingChartInner>
          <NewLayoutGrid $rows={rows} $cols={cols}>
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
                    <Seat
                      seatLabel={seatLabel}
                      assignedInfo={seatMapping[seatLabel]}
                      onClick={onSeatClick}
                      onUnassign={onUnassign}
                      isEditingSeats={isEditingSeats}
                    />
                  </div>
                );
              }

              return (
                <NonChairBlock
                  key={item.id}
                  $itemType={item.itemType}
                  $subType={item.subType}
                  $row={item.row}
                  $col={item.col}
                  $rowSpan={rowSpan}
                  $colSpan={colSpan}
                >
                  {item.label || (item.itemType === 'TABLE' ? 'BÀN HỌP' : item.itemType)}
                </NonChairBlock>
              );
            })}
          </NewLayoutGrid>
        </SeatingChartInner>
      </SeatingChartWrapper>
    );
  }

  // --- Logic cũ (Fallback cho phòng họp chưa thiết kế sơ đồ mới) ---
  const { layoutType, layoutRows, layoutSeats, layoutBlocks, capacity, layoutColWing, layoutRowBottom } = room || {};
  const type = layoutType || 'theater';
  const isUShape = type === 'u_shape';
  
  // Convention: layoutRows = Columns (Width), layoutSeats = Rows (Depth)
  const rawCols = parseInt(layoutRows || 10, 10);
  const rawRows = parseInt(layoutSeats || 5, 10);
  const numBlocks = parseInt(layoutBlocks || 1, 10);

  const isFallback = !layoutRows || !layoutSeats;
  const effectiveNumRows = isFallback ? Math.ceil((capacity || 25) / 5) : (layoutType === 'u_shape' ? rawRows + 1 : rawRows);
  const effectiveNumCols = isFallback ? 5 : rawCols;
  
  const colWing = parseInt(layoutColWing || 1, 10);
  const rowBottom = parseInt(layoutRowBottom || 1, 10);
  
  // Logic Grid
  const supportsBlocks = ['theater', 'classroom', 'doi_xung', 'hoi_truong', 'theater_block'].includes(type);
  const totalColsInGrid = isUShape ? effectiveNumCols : (supportsBlocks && numBlocks > 1 ? effectiveNumCols + (numBlocks - 1) : effectiveNumCols);
  const seatsPerBlock = Math.ceil(effectiveNumCols / numBlocks);

  return (
      <SeatingChartWrapper>
        <SeatingChartInner>
        {Array.from({ length: effectiveNumRows }).map((_, rowIndex) => {
          const rowChar = (layoutType === 'u_shape' && rowIndex === 0) ? "" : getRowLabel(layoutType === 'u_shape' ? rowIndex - 1 : rowIndex);
          let currentSeatIndexInRow = 0;

          return (
            <RowContainer key={`row-${rowChar}`}>
              <RowLabel>{rowChar}</RowLabel>
              <SeatGrid $cols={totalColsInGrid}>
                {Array.from({ length: totalColsInGrid }).map((__, colIndex) => {
                   const colLabel = colIndex + 1;
                   const isGap = numBlocks > 1 && supportsBlocks && colIndex > 0 && (colIndex + 1) % (seatsPerBlock + 1) === 0;

                   if (isGap) return <SkyBox key={`gap-${rowChar}-${colLabel}`} />;

                   let shouldRenderSeat = true;

                   // Logic ẩn ghế theo Layout Type (Copy từ file RoomLayoutSection)
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
                      <Seat
                        key={seatLabel}
                        seatLabel={seatLabel}
                        assignedInfo={seatMapping[seatLabel]}
                        onClick={onSeatClick}
                        onUnassign={onUnassign}
                        isEditingSeats={isEditingSeats}
                      />
                   );
                })}
              </SeatGrid>
            </RowContainer>
          );
        })}
      </SeatingChartInner>
    </SeatingChartWrapper>
  );
});

SeatingChart.displayName = "SeatingChart";

const RoomCardItem = React.memo(({ room, active, onSelect, assignedCount, isSeatAssignment, onClear }) => {
  const handleSelect = React.useCallback(() => onSelect(room.id), [room.id, onSelect]);
  const handleClear = React.useCallback((e) => {
      e.stopPropagation();
      onClear(room.id);
  }, [room.id, onClear]);
  // Use layout calculated capacity if available, else fallback
  const capacity = room.capacity || 25;
  
  let status = "NOT_ASSIGNED";
  let statusLabel = "Chưa gán";
  
  if (active) {
    status = "ASSIGNING";
    statusLabel = "Đang gán";
  } else if (assignedCount > 0) {
    status = "ASSIGNED";
    statusLabel = "Đã gán";
  }

  return (
    <RelativeSelectedRoomCard
      active={active}
      onClick={handleSelect}
    >
      {isSeatAssignment && (
        <DeleteActionWrapper>
             <IconButton size="small" onClick={handleClear}>
                 <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.938 1.33984L16.7784 8.18022L10.8673 14.0913L10.6761 14.2825H14.1667V15.6992H4.7792L2.18245 13.1024C1.91934 12.8393 1.71063 12.527 1.56823 12.1832C1.42583 11.8394 1.35254 11.471 1.35254 11.0989C1.35254 10.7268 1.42583 10.3584 1.56823 10.0146C1.71063 9.67084 1.91934 9.35849 2.18245 9.09539L9.938 1.33984ZM4.09991 9.18109L3.18404 10.0977C2.91845 10.3633 2.76926 10.7236 2.76926 11.0993C2.76926 11.4749 2.91845 11.8352 3.18404 12.1008L5.3657 14.2825H8.6807L8.93995 14.0218L4.09991 9.18109Z" fill="#D60B0B"/>
                 </svg>
             </IconButton>
        </DeleteActionWrapper>
      )}
      <RoomCardTitle>{room.name}</RoomCardTitle>
      <RoomCardSub>Tòa nhà TC</RoomCardSub>
      <RoomCardCapacity variant="caption">Sức chứa: {capacity}</RoomCardCapacity>
      
      <RoomCardDivider />
      
      <RoomCardFooter>
        <StatusBadge status={status}>
          {statusLabel}
        </StatusBadge>
        <AssignmentText variant="caption">
          Gán : {assignedCount} / {capacity} vị trí
        </AssignmentText>
      </RoomCardFooter>
    </RelativeSelectedRoomCard>
  );
});

RoomCardItem.displayName = "RoomCardItem";

const RegisterForMeetingRooms = ({ control, errors, sharedComponents, selectedUnits = [], onOpenParticipatingUnits, isView = false, initialRooms = [], onRoomChange, onUpdateParticipants, onOpenPrepareDocs, isProcessing = false, isProcessingAction = false, userRoles = {}, leftPanelTitle = "DANH SÁCH THAM DỰ", meetingData, isPartnerMeeting, isSeatAssignment, hideSeatingDiagram = false, assignOnlyRoom, assignOnlySecretary, assignRoomAndSecretary, forceOnlineLinkFullWidth = false, topOnly = false, bottomOnly = false }) => {
  const { InputComponents } = sharedComponents;
  // const toast = useToast();
  const meetingMode = useWatch({ control, name: "meetingMode" });
  const meetingDate = useWatch({ control, name: "meetingDate" });
  const startTime = useWatch({ control, name: "startTime" });
  const endTime = useWatch({ control, name: "endTime" });

  const isLocked = React.useMemo(() => {
    return meetingData?.isMeetingApproved === true && meetingData?.isCancelled !== true;
  }, [meetingData]);

  const [openRoomSelection, setOpenRoomSelection] = React.useState(false);
  const [selectedRooms, setSelectedRooms] = React.useState(initialRooms);
  const [activeRoomId, setActiveRoomId] = React.useState(initialRooms.length > 0 ? initialRooms[0].id : null);
  const [expandedSections, setExpandedSections] = React.useState(["td"]);
  const [openAssignModal, setOpenAssignModal] = React.useState(false);
  const [selectedSeat, setSelectedSeat] = React.useState(null);
  const [seatMapping, setSeatMapping] = React.useState({}); // { seatLabel: memberObject }
  const [isEditingSeats, setIsEditingSeats] = React.useState(!isView);
  const [openSeatingDiagram, setOpenSeatingDiagram] = React.useState(false);
  const [scale, setScale] = React.useState(1.0);

  const handleTransform = React.useCallback((ref, state) => {
    setScale(state.scale);
  }, []);

  React.useEffect(() => {
    setScale(1.0);
  }, [activeRoomId]);

  // const [isSavingSeats, setIsSavingSeats] = React.useState(false);
  const [openAddGuest, setOpenAddGuest] = React.useState(false);
  const [editingGuestIndex, setEditingGuestIndex] = React.useState(null);
  
  // Dialog state for clearing assignments
  const [openClearConfirm, setOpenClearConfirm] = React.useState(false);
  const [roomToClear, setRoomToClear] = React.useState(null);

  // Get active room object to pass to SeatingChart
  const activeRoom = React.useMemo(() => 
    selectedRooms.find(r => r.id === activeRoomId), 
  [selectedRooms, activeRoomId]);

  const handleOpenSeatingDiagram = React.useCallback(() => {
    setOpenSeatingDiagram(true);
  }, []);
   const handleCloseSeatingDiagram = React.useCallback(() => {
    setOpenSeatingDiagram(false);
  }, []);
  
  const hasAnyRole = React.useMemo(() => 
    !!(userRoles?.isChairman || userRoles?.isSecretary || userRoles?.isParticipant || userRoles?.isParticipantInCurrentUnit || userRoles?.isMeetingApproved || userRoles?.isApproverListed || userRoles?.isCompanyUnitDetail),
  [userRoles]);

  React.useEffect(() => {
    setSelectedRooms(initialRooms || []);
    if (initialRooms && initialRooms.length > 0) {
      // setSelectedRooms(initialRooms);
      setActiveRoomId(initialRooms[0].id);
    } else {
      setActiveRoomId(null);
    }
  }, [initialRooms]);

  React.useEffect(() => {
    if (isSeatAssignment) {
      setIsEditingSeats(true);
    } else {
      setIsEditingSeats(!isView && !isProcessingAction);
    }
  }, [isView, isProcessingAction, isSeatAssignment]);

    React.useEffect(() => {
    const mapping = {};
    selectedUnits.forEach(u => {
      if (u.seatNumber && u.roomId === activeRoomId) {
        mapping[u.seatNumber] = u;
      }
      if (u.types === 'guest_group' && u.members) {
        u.members.forEach(m => {
          if (m.seatNumber && m.roomId === activeRoomId) {
            mapping[m.seatNumber] = m;
          }
        });
      }
    });
    setSeatMapping(mapping);
  }, [selectedUnits, activeRoomId]);

  const handleOpenSelection = React.useCallback(() => setOpenRoomSelection(true), []);
  const handleCloseSelection = React.useCallback(() => setOpenRoomSelection(false), []);

  const handleConfirmSelection = React.useCallback((rooms, timeData) => {
    setSelectedRooms(rooms);
    onRoomChange?.(rooms, timeData);
    if (rooms.length > 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [onRoomChange]);

  // const handleSaveSeatPositions = React.useCallback(async () => {
  //   if (!meetingId) {
  //     toast("Không tìm thấy ID cuộc họp", "error");
  //     return;
  //   }

  //   setIsSavingSeats(true);
  //   try {
  //     const unitMap = {};

  //     selectedUnits.forEach(item => {
  //       const isUnit = item.types === 'organization_unit';
  //       // Use id, _id or userId interchangeably
  //       const itemId = item.id || item._id || item.userId;
  //       const uId = isUnit ? itemId : (item.parent || item.unitId || item.receiverUnitId);
        
  //       if (!uId) return;

  //       if (!unitMap[uId]) {
  //         unitMap[uId] = { 
  //           unitId: uId, 
  //           participants: [],
  //           sittingPosition: [],
  //           tasks: []
  //         };
  //       }

  //       // Handle unit seat positions
  //       if (isUnit && item.seatNumber) {
  //         const rId = item.roomId || activeRoomId;
  //         if (rId) {
  //           let roomPos = unitMap[uId].sittingPosition.find(p => p.roomId === rId);
  //           if (!roomPos) {
  //             roomPos = { roomId: rId, seatNumber: [] };
  //             unitMap[uId].sittingPosition.push(roomPos);
  //           }
  //           if (!roomPos.seatNumber.includes(item.seatNumber)) {
  //             roomPos.seatNumber.push(item.seatNumber);
  //           }
  //         }
  //       }

  //       // Handle individual participants
  //       if (!isUnit && item.roles?.participant) {
  //           unitMap[uId].participants.push({
  //               userId: itemId,
  //               seatNumber: item.seatNumber || null,
  //               roomId: item.roomId || activeRoomId || null,
  //               tasks: (item.tasks || []).map(t => ({
  //                   attachableType: "PARTICIPANT",
  //                   content: t.content || "",
  //                   documentName: t.documentName || "",
  //                   deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
  //               }))
  //           });
  //       }

  //       // Handle unit tasks
  //       if (isUnit && item.tasks && item.tasks.length > 0 && unitMap[uId].tasks.length === 0) {
  //           unitMap[uId].tasks = item.tasks.map(t => ({
  //               attachableType: "UNIT",
  //               content: t.content || "",
  //               documentName: t.documentName || "",
  //               deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
  //           }));
  //       }
  //     });

  //     // Handle chairman and secretary
  //     const chairmanUser = selectedUnits.find(u => u.roles?.chair);
  //     const secretaryUser = selectedUnits.find(u => u.roles?.secretary);

  //     const mapRoleInfo = (user, roleStr) => {
  //       if (!user) return null;
  //       const uId = user.id || user._id || user.userId;
  //       return {
  //         userId: uId,
  //         tasks: (user.tasks || []).map(t => ({
  //           attachableType: "ROLE",
  //           attachableId: uId,
  //           attachableRole: roleStr,
  //           content: t.content || "",
  //           documentName: t.documentName || "",
  //           deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
  //         })),
  //         roomId: user.roomId || activeRoomId || null,
  //         seatNumber: user.seatNumber || null
  //       };
  //     };

  //     const payload = {
  //       roomIds: selectedRooms.map(r => r.id),
  //       units: Object.values(unitMap),
  //       chairman: mapRoleInfo(chairmanUser, "CHAIRMAN"),
  //       secretary: mapRoleInfo(secretaryUser, "SECRETARY"),
  //       guests: selectedUnits.find(u => u.types === 'guest_group')?.members?.map(m => ({
  //         guestName: m.name || m.title,
  //         guestTitle: m.position || "",
  //         seatNumber: m.seatNumber,
  //         roomId: m.roomId
  //       })) || [],
  //     };

  //     await axiosInstance.patch(`${API_ADD_MEETING_SCHEDULE}/${meetingId}`, payload);
      
  //     toast("Lưu vị trí chỗ ngồi thành công!", "success");
  //     setIsEditingSeats(false);
  //     onSuccess?.();
  //   } catch (error) {
  //     toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi lưu vị trí chỗ ngồi!", "error");
  //   } finally {
  //     setIsSavingSeats(false);
  //   }
  // }, [meetingId, selectedUnits, selectedRooms, activeRoomId, toast, onSuccess]);

  // const handleToggleEditSeats = React.useCallback(async () => {
  //   if (isEditingSeats) {
  //     // Save when switching from edit mode to view mode
  //     await handleSaveSeatPositions();
  //   } else {
  //     // Just toggle to edit mode
  //     setIsEditingSeats(true);
  //   }
  // }, [isEditingSeats, handleSaveSeatPositions]);

  const toggleSection = React.useCallback((id) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleSetActiveRoom = React.useCallback((id) => {
    setActiveRoomId(id);
  }, []);

  const handleSeatClick = React.useCallback((seatLabel) => {
    setSelectedSeat(seatLabel);
    setOpenAssignModal(true);
  }, []);

  const handleCloseAssignModal = React.useCallback(() => {
    setOpenAssignModal(false);
    setSelectedSeat(null);
  }, []);

  const handleAssignMember = React.useCallback((memberId) => {
    let member = selectedUnits.find(u => (u.id || u._id) === memberId);
    if (!member) {
      selectedUnits.forEach(u => {
        if (u.types === 'guest_group' && u.members) {
          const guest = u.members.find(m => (m.id || m._id) === memberId);
          if (guest) member = guest;
        }
      });
    }

    if (member && selectedSeat) {
      if (onUpdateParticipants) {
        let updatedList = selectedUnits.map(u => {
          let item = { ...u };
          // let changed = false;

          // Clear if this top-level unit/person was in the seat
          if (item.seatNumber === selectedSeat && item.roomId === activeRoomId) {
            delete item.seatNumber;
            delete item.roomId;
            // changed = true;
          }

          // Clear if any nested guest was in the seat
          if (item.types === 'guest_group' && item.members) {
            const newMembers = item.members.map(m => {
              if (m.seatNumber === selectedSeat && m.roomId === activeRoomId) {
                const updatedM = { ...m };
                delete updatedM.seatNumber;
                delete updatedM.roomId;
                return updatedM;
              }
              return m;
            });
            if (newMembers !== item.members) {
              item.members = newMembers;
              // changed = true;
            }
          }
          return item;
        });

        const isUnit = member.types === 'organization_unit';

        if (isUnit) {
          // Rule for Units: Find an entry for this unit that HAS NO SEAT yet
          const unassignedUnitIndex = updatedList.findIndex(u => 
            (u.id || u._id) === memberId && !u.seatNumber
          );

          if (unassignedUnitIndex !== -1) {
            // Use the unassigned entry
            updatedList[unassignedUnitIndex] = { 
              ...updatedList[unassignedUnitIndex], 
              seatNumber: selectedSeat, 
              roomId: activeRoomId 
            };
          } else {
            // All existing entries for this unit have seats, so CLONE one to create a new assignment
            const unitPrototype = updatedList.find(u => (u.id || u._id) === memberId);
            const newAssignment = { 
              ...unitPrototype, 
              seatNumber: selectedSeat, 
              roomId: activeRoomId 
            };
            delete newAssignment.tasks; 
            updatedList.push(newAssignment);
          }
        } else {
          // Rule for Individuals: Move the person (1 person = 1 seat)
          updatedList = updatedList.map(u => {
            if ((u.id || u._id) === memberId) {
              return { ...u, seatNumber: selectedSeat, roomId: activeRoomId };
            }
            if (u.types === 'guest_group' && u.members) {
               const guestIndex = u.members.findIndex(m => (m.id || m._id) === memberId);
               if (guestIndex !== -1) {
                 const newMembers = [...u.members];
                 newMembers[guestIndex] = { ...newMembers[guestIndex], seatNumber: selectedSeat, roomId: activeRoomId };
                 return { ...u, members: newMembers };
               }
            }
            return u;
          });
        }
        
        onUpdateParticipants(updatedList);
      }

      setSeatMapping(prev => ({
        ...prev,
        [selectedSeat]: member
      }));
    }
  }, [selectedSeat, selectedUnits, onUpdateParticipants, activeRoomId]);

  const handleUnassignMember = React.useCallback((seatLabel) => {
    setSeatMapping(prev => {
      const newMapping = { ...prev };
      delete newMapping[seatLabel];
      return newMapping;
    });
    if (onUpdateParticipants) {
      const updatedList = selectedUnits.map(u => {
        if (u.seatNumber === seatLabel && u.roomId === activeRoomId) {
          const updatedU = { ...u };
          delete updatedU.seatNumber;
          delete updatedU.roomId;
          return updatedU;
        }
        if (u.types === 'guest_group' && u.members) {
          const newMembers = u.members.map(m => {
            if (m.seatNumber === seatLabel && m.roomId === activeRoomId) {
              const updatedM = { ...m };
              delete updatedM.seatNumber;
              delete updatedM.roomId;
              return updatedM;
            }
            return m;
          });
          return { ...u, members: newMembers };
        }
        return u;
      });

      onUpdateParticipants(updatedList);
    }
  }, [selectedUnits, onUpdateParticipants, activeRoomId]);

  // CATEGORIZE SELECTED UNITS
  const chairman = React.useMemo(() => selectedUnits.find(u => u.roles?.chair && !u.isNotParticipant), [selectedUnits]);
  const secretary = React.useMemo(() => selectedUnits.find(u => u.roles?.secretary && !u.isNotParticipant), [selectedUnits]);
  
  const attendanceGroups = React.useMemo(() => {
    const groups = {};
    
    selectedUnits.forEach(item => {
      if (item.isNotParticipant === true) return;
      
      const isGuestGroup = item.types === 'guest_group';
      const isUnit = item.types === 'organization_unit';
      
      if (isGuestGroup) {
        groups['GUEST_GROUP'] = {
          id: 'GUEST_GROUP',
          name: 'Khách mời',
          members: (item.members || []).filter(m => !m.isNotParticipant),
          tasks: item.tasks || [],
          isUnit: true,
          isGuestGroup: true,
          _originalUnit: item,
          assignedCount: (item.members || []).filter(m => m.seatNumber && !m.isNotParticipant).length + (item.seatNumber ? 1 : 0)
        };
        return;
      }

      if (!item.roles?.participant) return;
      // Trình bày riêng cho Chairman/Secretary nếu là Cá nhân (User). 
      // Tuy nhiên nếu người dùng tích cả tham dự thì vẫn cho hiện ở mục Tham dự.
      if (item.types === 'user' && (item.roles?.chair || item.roles?.secretary) && !item.roles?.participant) return;

      const uId = isUnit ? (item.id || item._id) : (item.parent || 'other');
      const uName = isUnit ? (item.name || item.title) : (item.parentName || item.unitName || item.name || item.title || "Khác");
      
      if (!groups[uId]) {
        groups[uId] = { 
          id: uId, 
          name: uName, 
          members: [],
          tasks: isUnit ? (item.tasks || []) : [],
          isUnit: isUnit,
          isGuestGroup: false,
          _originalUnit: isUnit ? item : null,
          assignedCount: 0
        };
      }
      
      if (!isUnit) {
        groups[uId].members.push(item);
        if (item.seatNumber) {
           groups[uId].assignedCount++;
        }
      } else {
         // Update tasks if updated
         groups[uId].tasks = item.tasks || [];
         if (item.seatNumber) {
            groups[uId].assignedCount++;
         }
         groups[uId]._originalUnit = item;
         groups[uId].isUnit = true;
      }
    });

    if (isPartnerMeeting && !groups['GUEST_GROUP']) {
       groups['GUEST_GROUP'] = {
          id: 'GUEST_GROUP',
          name: 'Khách mời',
          members: [],
          tasks: [],
          isUnit: true,
          isGuestGroup: true,
          _originalUnit: { id: 'GUEST_GROUP', name: 'Khách mời', types: 'guest_group', roles: { participant: true } },
          assignedCount: 0
       };
    }

    // Sort to ensure Khách mời is at top if it exists
    return Object.values(groups).sort((a, b) => {
       if (a.id === 'GUEST_GROUP') return -1;
       if (b.id === 'GUEST_GROUP') return 1;
       return 0;
    });
  }, [selectedUnits, isPartnerMeeting]);

  const handleOpenPrepareDocs = React.useCallback((assignee) => {
    if (assignee._originalUnit) {
      onOpenPrepareDocs?.(assignee._originalUnit);
    } else {
      onOpenPrepareDocs?.(assignee);
    }
  }, [onOpenPrepareDocs]);

  const handleEditTask = React.useCallback((assignee, task, taskIndex) => {
    // Truyền dữ liệu tài liệu + index để component cha biết đang sửa cái nào
    const assigneeToEdit = assignee._originalUnit || assignee;
    onOpenPrepareDocs?.(assigneeToEdit, task, taskIndex);
  }, [onOpenPrepareDocs]);

  const handleDeleteTask = React.useCallback((assignee, taskIndex) => {
    if (!onUpdateParticipants) return;
    
    const assigneeToUpdate = assignee._originalUnit || assignee;
    const assigneeId = assigneeToUpdate.id || assigneeToUpdate._id;
    
    const updatedUnits = selectedUnits.map(u => {
      const uId = u.id || u._id;
      if (uId === assigneeId) {
        const updatedTasks = [...(u.tasks || [])];
        updatedTasks.splice(taskIndex, 1);
        return { ...u, tasks: updatedTasks };
      }
      return u;
    });
    
    onUpdateParticipants(updatedUnits);
  }, [selectedUnits, onUpdateParticipants]);

  const handleOpenAddGuest = React.useCallback(() => {
    setEditingGuestIndex(null);
    setOpenAddGuest(true);
  }, []);

  const handleCloseAddGuest = React.useCallback(() => {
    setOpenAddGuest(false);
    setEditingGuestIndex(null);
  }, []);

  const handleSaveGuest = React.useCallback((guestData) => {
    if (!onUpdateParticipants) return;
    
    let updatedUnits = [...selectedUnits];
    if (editingGuestIndex !== null) {
      // Find the unit with type 'guest' and update the member at index
      const guestUnitIndex = updatedUnits.findIndex(u => u.types === 'guest_group');
      if (guestUnitIndex !== -1) {
        const guestMembers = [...(updatedUnits[guestUnitIndex].members || [])];
        guestMembers[editingGuestIndex] = {
           ...guestMembers[editingGuestIndex],
           ...guestData,
           name: guestData.guestName,
           title: guestData.guestName,
           position: guestData.guestTitle,
        };
        updatedUnits[guestUnitIndex] = {
          ...updatedUnits[guestUnitIndex],
          members: guestMembers
        };
      }
    } else {
      // Add new guest
      let guestUnitIndex = updatedUnits.findIndex(u => u.types === 'guest_group');
      if (guestUnitIndex === -1) {
        // Create virtual unit for guests
        const newGuestUnit = {
          id: 'GUEST_GROUP',
          name: 'Khách mời',
          types: 'guest_group',
          roles: { participant: true },
          members: []
        };
        updatedUnits.push(newGuestUnit);
        guestUnitIndex = updatedUnits.length - 1;
      }
      
      const guestMembers = [...(updatedUnits[guestUnitIndex].members || [])];
      guestMembers.push({
        id: `guest-${Date.now()}`,
        name: guestData.guestName,
        title: guestData.guestName,
        position: guestData.guestTitle,
        guestName: guestData.guestName,
        guestTitle: guestData.guestTitle,
        types: 'guest',
        roles: { participant: true },
        parent: 'GUEST_GROUP',
        parentName: 'Khách mời'
      });
      
      updatedUnits[guestUnitIndex] = {
        ...updatedUnits[guestUnitIndex],
        members: guestMembers
      };
    }
    
    onUpdateParticipants(updatedUnits);
  }, [selectedUnits, onUpdateParticipants, editingGuestIndex]);

  const handleDeleteGuest = React.useCallback((index) => {
    if (!onUpdateParticipants) return;
    const updatedUnits = [...selectedUnits];
    const guestUnitIndex = updatedUnits.findIndex(u => u.types === 'guest_group');
    if (guestUnitIndex !== -1) {
      const guestMembers = [...updatedUnits[guestUnitIndex].members];
      guestMembers.splice(index, 1);
      updatedUnits[guestUnitIndex] = { ...updatedUnits[guestUnitIndex], members: guestMembers };
      onUpdateParticipants(updatedUnits);
    }
  }, [selectedUnits, onUpdateParticipants]);

  const handleEditGuest = React.useCallback((index) => {
    setEditingGuestIndex(index);
    setOpenAddGuest(true);
  }, []);

  const stats = React.useMemo(() => {
    const unitCount = attendanceGroups.length;
    const individualCount = selectedUnits.reduce((acc, u) => {
      if (u.types === 'guest_group') {
        return acc + (u.members?.length || 0);
      }
      if (u.roles?.participant && u.types !== 'organization_unit') {
        return acc + 1;
      }
      return acc;
    }, 0);
    return { unitCount, individualCount };
  }, [attendanceGroups, selectedUnits]);

  const handleOpenClearConfirm = React.useCallback((roomId) => {
    setRoomToClear(roomId);
    setOpenClearConfirm(true);
  }, []);

  const handleCloseClearConfirm = React.useCallback(() => {
    setOpenClearConfirm(false);
    setRoomToClear(null);
  }, []);

  const handleClearRoomAssignments = React.useCallback(() => {
    if (!roomToClear) return;
    
    // Clear assignments for this room
    const updatedList = selectedUnits.map(u => {
        let item = { ...u };
        if (item.roomId === roomToClear) {
            delete item.seatNumber;
            delete item.roomId;
        }
        if (item.types === 'guest_group' && item.members) {
          item.members = item.members.map(m => {
            if (m.roomId === roomToClear) {
              const updatedM = { ...m };
              delete updatedM.seatNumber;
              delete updatedM.roomId;
              return updatedM;
            }
            return m;
          });
        }
        return item;
    });
    
    onUpdateParticipants?.(updatedList);
    handleCloseClearConfirm();
  }, [roomToClear, selectedUnits, onUpdateParticipants, handleCloseClearConfirm]);

  return (
    <Box>
      {(!bottomOnly) && (
      <RegisterRoomContainer>
        <RegisterRoomHeader>
          <StyledHeaderContent variant="h6">{isProcessing ? "Thông tin phòng họp" : "Đăng ký phòng họp"}</StyledHeaderContent>
          {selectedRooms.length > 0 && (isView || isProcessingAction) && (hasAnyRole || meetingData?.proceesMeeting || meetingData?.isSeatAssignmentList ) && !hideSeatingDiagram && (meetingData?.meetingMode === "OFFLINE" || meetingData?.meetingMode === "HYBRID") && (
            <ButtonOutline 
              onClick={handleOpenSeatingDiagram}
            >
              Xem sơ đồ vị trí ngồi
            </ButtonOutline>
          )}
        </RegisterRoomHeader>

        <RegisterRoomContent>
          {/* Top Form Section */}
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <FormItem horizontal>
                <FormLabel>
                  Hình thức họp <span className="required">*</span>
                </FormLabel>
                <Controller
                  name="meetingMode"
                  control={control}
                  render={({ field }) => (
                    <StyledRadioGroup {...field} disabled={isView || isProcessingAction || isLocked}>
                      <StyledFormControlLabel value="OFFLINE" control={<StyledRadio />} label="Trực tiếp" disabled={isView || isProcessingAction || isLocked} />
                      <StyledFormControlLabel value="ONLINE" control={<StyledRadio />} label="Trực tuyến" disabled={isView || isProcessingAction || isLocked} />
                      <StyledFormControlLabel value="HYBRID" control={<StyledRadio />} label="Trực tiếp + Trực tuyến" disabled={isView || isProcessingAction || isLocked} />
                      <StyledFormControlLabel value="OUTSIDETHECOMPANY" control={<StyledRadio />} label="Ngoài Tân Cảng" disabled={isView || isProcessingAction || isLocked} />
                    </StyledRadioGroup>
                  )}
                />
              </FormItem>
            </Grid>
            {(meetingMode === "ONLINE" || meetingMode === "HYBRID") && (
              <Grid item xs={12}>
                <OnlineMeetingLinkFormItem $forceFullWidth={forceOnlineLinkFullWidth}>
              
                  <Controller
                    name="onlineMeeting.meetingLink"
                    control={control}
                    render={({ field }) => (
                      <OnlineMeetingLinkFieldWrapper $forceFullWidth={forceOnlineLinkFullWidth}>
                        <InputComponents
                          label="Link họp online"
                          {...field}
                          fullWidth
                          placeholder="Nhập link họp online (Zoom, MS Teams, Google meet...)"
                          error={!!errors?.onlineMeeting?.meetingLink}
                          helperText={errors?.onlineMeeting?.meetingLink?.message}
                          // required={meetingMode === "ONLINE"}
                          disabled={isView || isProcessingAction}
                        />
                      </OnlineMeetingLinkFieldWrapper>
                    )}
                  />
                </OnlineMeetingLinkFormItem>
              </Grid>
            )}
            {meetingMode === "OUTSIDETHECOMPANY" && (
              <Grid item xs={12}>
                <OnlineMeetingLinkFormItem $forceFullWidth={forceOnlineLinkFullWidth}>
                  <Controller
                    name="location"
                    control={control}
                    defaultValue={meetingData?.location || ""}
                    render={({ field }) => (
                      <OnlineMeetingLinkFieldWrapper $forceFullWidth={forceOnlineLinkFullWidth}>
                        <InputComponents
                          label="Địa điểm"
                          {...field}
                          fullWidth
                          placeholder="Nhập địa điểm cuộc họp"
                          error={!!errors?.location}
                          helperText={errors?.location?.message}
                          required
                          disabled={isView || isProcessingAction}
                        />
                      </OnlineMeetingLinkFieldWrapper>
                    )}
                  />
                </OnlineMeetingLinkFormItem>
              </Grid>
            )}
            {/* show view room when isView */}
            {isView && meetingMode !== "OUTSIDETHECOMPANY" && (
              <ViewModeRoomContainer item xs={12}>
                <ViewModeRoomLabel>
                  Phòng họp:
                </ViewModeRoomLabel>
                <ViewModeRoomList>
                  {meetingData && meetingData?.roomIds?.map((v) => v.name).join(", ") || ""}
                </ViewModeRoomList>
              </ViewModeRoomContainer>
            )}
          </Grid>

          {/* Initial Button if no rooms */}
          {!isView && !isProcessingAction && !isLocked && selectedRooms.length === 0 && meetingMode !== "ONLINE" && meetingMode !== "OUTSIDETHECOMPANY" && (
            <RegisterFormItemWrapper>
              <RegisterButton variant="contained" startIcon={<AddIcon />} onClick={handleOpenSelection}>
                Đăng ký phòng họp
              </RegisterButton>
            </RegisterFormItemWrapper>
          )}
        </RegisterRoomContent>
      </RegisterRoomContainer>
      )}
      
      {/* Detailed View if rooms selected - Hidden if in processing and not confirmed */}
      {(!topOnly) && (selectedRooms.length > 0 || ((meetingMode === "ONLINE" || meetingMode === "OUTSIDETHECOMPANY") && !isProcessing)) && !(isProcessing && !isProcessingAction) && (
        <>
          {/* Room List Section */}
          {!(hasAnyRole || meetingData?.proceesMeeting) && meetingMode !== "ONLINE" && meetingMode !== "OUTSIDETHECOMPANY" && (
            <SectionContainer>
              <SectionHeader>
                <StyledHeaderContent variant="h6">Danh sách phòng họp</StyledHeaderContent>
                  {/* {isView && !isSeatAssignment && (
                  <EditSeatsLink onClick={handleToggleEditSeats} disabled={isSavingSeats}>
                    <EditIcon /> {isEditingSeats ? (isSavingSeats ? "Đang lưu..." : "Lưu vị trí") : "Sửa vị trí ngồi"}
                  </EditSeatsLink>
                )} */}
                {((!isView && !isProcessingAction && !isLocked) || isSeatAssignment) && (
                  <EditIconButton onClick={handleOpenSelection}>
                    <EditIcon /> {"Chỉnh sửa"}
                  </EditIconButton>
                )}
              </SectionHeader>
              <StyledDivider />
              <RoomCardsRow>
                {selectedRooms.map((room) => {
                  const assignedCount = selectedUnits.filter(u => u.roomId === room.id && u.seatNumber).length;
                  return (
                    <RoomCardItem
                      key={room.id}
                      room={room}
                      active={activeRoomId === room.id}
                      onSelect={handleSetActiveRoom}
                      assignedCount={assignedCount}
                      isSeatAssignment={isSeatAssignment}
                      onClear={handleOpenClearConfirm}
                    />
                  );
                })}
              </RoomCardsRow>
            </SectionContainer>
          )}

          {/* Main Layout: Attendance vs Seating */}
          {!(hasAnyRole || meetingData?.proceesMeeting) && (
            <MainLayout container spacing={2}>
              {/* Left Panel: Attendance List */}
              <Grid item xs={12} lg={3}>
                <LeftPanel>
                  <AttendanceHeader>
                    <AttendanceHeaderInfo>
                      <AttendanceTitle>{leftPanelTitle}</AttendanceTitle>
                      {selectedUnits.length > 0 ? (
                        <AttendanceStats>
                          Đơn vị phòng ban : {stats.unitCount} | Cá nhân : {stats.individualCount}
                        </AttendanceStats>
                      ) : (
                        <AttendanceStats>Chưa gán đơn vị tham gia</AttendanceStats>
                      )}
                    </AttendanceHeaderInfo>
                      {!isView && (
                        selectedUnits.length > 0 ? (
                          <AddParticipantLink onClick={onOpenParticipatingUnits}>
                             <EditIcon /> Chỉnh sửa
                          </AddParticipantLink>
                        ) : (
                          <AddParticipantLink onClick={onOpenParticipatingUnits}>
                            <AddIcon /> {isPartnerMeeting ? "Đơn vị nội bộ tham gia" : "Thêm đơn vị tham gia"}
                          </AddParticipantLink>
                        )
                      )}
                    </AttendanceHeader>
                  
                  <RightPanelWrapper>
                    {selectedUnits.length > 0 || isPartnerMeeting ? (
                      <>
                        {/* BAN ĐIỀU HÀNH */}
                        {(!isProcessingAction || assignOnlySecretary || assignRoomAndSecretary) && (
                          <>
                            {/* BAN ĐIỀU HÀNH LABEL */}
                            {(assignOnlySecretary || assignRoomAndSecretary || (!assignOnlyRoom && !assignOnlySecretary && !assignRoomAndSecretary)) && (
                                <BoardSectionLabel>BAN ĐIỀU HÀNH</BoardSectionLabel>
                            )}

                            {/* CHỦ TRÌ */}
                            {!assignOnlySecretary && !assignRoomAndSecretary && !assignOnlyRoom && (
                                chairman ? (
                                    <BoardCard type="chair">
                                      <FlexRowBetween>
                                        <BoardName>{chairman.title || chairman.name}</BoardName>
                                        <SeatBadge assigned={!!chairman.seatNumber} />
                                      </FlexRowBetween>
                                      <BoardTitle>{"Chức danh"}</BoardTitle>
                                      <FlexRowBetween>
                                          <BoardLabel>Chủ trì cuộc họp</BoardLabel>
                                          <ChairmanTaskIcons 
                                            chairman={chairman} 
                                            onOpenPrepareDocs={onOpenPrepareDocs} 
                                            onEditTask={handleEditTask}
                                            onDeleteTask={handleDeleteTask}
                                            isView={isView} 
                                            isProcessingAction={isProcessingAction}
                                          />
                                      </FlexRowBetween>
                                    </BoardCard>
                                  ) : (
                                    <BoardCard type="chair">
                                      <BoardLabel>Chủ trì cuộc họp</BoardLabel>
                                      <EmptyBoardName>Chưa chọn chủ trì</EmptyBoardName>
                                    </BoardCard>
                                  )
                            )}

                            {/* THƯ KÝ */}
                            {(assignOnlySecretary || assignRoomAndSecretary || (!assignOnlyRoom && !assignOnlySecretary && !assignRoomAndSecretary)) && (
                                secretary ? (
                                    <BoardCard type="secretary">
                                      <FlexRowBetween>
                                        <BoardName>{secretary.title || secretary.name}</BoardName>
                                        <SeatBadge assigned={!!secretary.seatNumber} />
                                      </FlexRowBetween>
                                      <BoardTitle>{"Chức danh"}</BoardTitle>
                                      <FlexRowBetween>
                                          <BoardLabel>Thư ký cuộc họp</BoardLabel>
                                          <SecretaryTaskIcons 
                                            secretary={secretary} 
                                            onOpenPrepareDocs={onOpenPrepareDocs} 
                                            onEditTask={handleEditTask}
                                            onDeleteTask={handleDeleteTask}
                                            isView={isView} 
                                            isProcessingAction={isProcessingAction}
                                          />
                                      </FlexRowBetween>
                                    </BoardCard>
                                  ) : (
                                    <BoardCard type="secretary">
                                      <BoardLabel>Thư ký cuộc họp</BoardLabel>
                                      <EmptyBoardName>Chưa chọn thư ký</EmptyBoardName>
                                    </BoardCard>
                                  )
                            )}
                          </>
                        )}

                        {/* THAM DỰ */}
                        {!assignOnlySecretary && (
                            <>
                                <BoardSectionLabel mt={1.5}>THAM DỰ</BoardSectionLabel>
                                {attendanceGroups.map((group) => (
                                <AttendanceItem 
                                    key={group.id} 
                                    item={group} 
                                    expandedSections={expandedSections} 
                                    onToggle={toggleSection}
                                    onAddTask={handleOpenPrepareDocs}
                                    onEditTask={handleEditTask}
                                    onDeleteTask={handleDeleteTask}
                                    isView={isView}
                                    isProcessingAction={isProcessingAction}
                                    onAddGuest={handleOpenAddGuest}
                                    onEditGuest={handleEditGuest}
                                    onDeleteGuest={handleDeleteGuest}
                                />
                                ))}
                            </>
                        )}
                      </>
                    ) : (
                      <EmptyStateWrapper>
                        Chưa có đơn vị tham gia
                      </EmptyStateWrapper>
                    )}
                  </RightPanelWrapper>
                </LeftPanel>
              </Grid>
              
              {/* Clear Assignments Confirmation Dialog */}


              {/* Right Panel: Seating Chart */}
              <Grid item xs={12} lg={9}>
                <RightPanel>
                  {meetingMode === "ONLINE" ? (
                    <>
                      <SeatingHeader>
                        <SeatingTitle>
                          CUỘC HỌP ONLINE
                        </SeatingTitle>
                      </SeatingHeader>
                      <OnlineMeetingPlaceholder>
                        <OnlineMeetingText>
                          <LanguageIcon /> Họp trực tuyến – không áp dụng sơ đồ chỗ ngồi
                        </OnlineMeetingText>
                      </OnlineMeetingPlaceholder>
                    </>
                  ) : meetingMode === "OUTSIDETHECOMPANY" ? (
                    <>
                      <SeatingHeader>
                        <SeatingTitle>
                          HỌP NGOÀI TÂN CẢNG
                        </SeatingTitle>
                      </SeatingHeader>
                      <OnlineMeetingPlaceholder>
                        <OnlineMeetingText>
                          <LanguageIcon /> Họp ngoài Tân Cảng – không áp dụng sơ đồ chỗ ngồi
                        </OnlineMeetingText>
                      </OnlineMeetingPlaceholder>
                    </>
                  ) : (
                    <>
                      <SeatingHeader>
                        <SeatingTitle>
                          {activeRoom?.name?.toUpperCase()}
                        </SeatingTitle>
                        <SeatingStats>
                          Đã gán : {Object.keys(seatMapping).length} / {activeRoom?.capacity || 0} vị trí
                        </SeatingStats>
                      </SeatingHeader>

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
                          <ChartContainer>
                            <SeatingArea>
                              <TransformComponent
                                wrapperStyle={{ width: '100%', height: '100%' }}
                                contentStyle={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <SeatingChart 
                                  room={activeRoom}
                                  onSeatClick={handleSeatClick}
                                  seatMapping={seatMapping}
                                  onUnassign={handleUnassignMember}
                                  isEditingSeats={isEditingSeats}
                                />
                              </TransformComponent>
                            </SeatingArea>

                            <ZoomToolbar
                              zoomIn={zoomIn}
                              zoomOut={zoomOut}
                              resetTransform={resetTransform}
                              scale={scale}
                            />
                          </ChartContainer>
                        )}
                      </TransformWrapper>

                      <LegendContainer>
                        <LegendList>
                          <LegendItem>
                            <LegendBox variant="empty" />
                            <LegendText>Vị trí còn trống</LegendText>
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
                        <LegendCaption>
                          TÂN CẢNG SÀI GÒN
                        </LegendCaption>
                      </LegendContainer>
                    </>
                  )}
                </RightPanel>
              </Grid>
            </MainLayout>
          )}
        </>
      )}

      {/* Clear Assignments Confirmation Dialog */}
      <CustomDialog
        open={openClearConfirm}
        onClose={handleCloseClearConfirm}
        onSave={handleClearRoomAssignments}
        title="Xác nhận gỡ toàn bộ"
        titleButton="Xác nhận"
      >
        <SkyBox>
            <SkyTypography>
                 Tác vụ sẽ gỡ toàn bộ vị trí chỗ ngồi mà bạn đã gán
            </SkyTypography>
        </SkyBox>
      </CustomDialog>

      <MeetingRoomSelection
        open={openRoomSelection}
        onClose={handleCloseSelection}
        onConfirm={handleConfirmSelection}
        initialSelected={selectedRooms}
        sharedComponents={sharedComponents}
        meetingDate={meetingDate}
        startTime={startTime}
        endTime={endTime}
      />

      <AssignSeatModal
        open={openAssignModal}
        onClose={handleCloseAssignModal}
        seatLabel={selectedSeat}
        roomName={activeRoom?.name}
        attendanceData={selectedUnits}
        onAssign={handleAssignMember}
        seatMapping={seatMapping}
        sharedComponents={sharedComponents}
      />
      <SeatingDiagramModal
        open={openSeatingDiagram}
        onClose={handleCloseSeatingDiagram}
        rooms={selectedRooms}
        activeRoomId={activeRoomId}
        selectedUnits={selectedUnits}
        sharedComponents={sharedComponents}
      />
      <AddGuestModal
        open={openAddGuest}
        onClose={handleCloseAddGuest}
        onSave={handleSaveGuest}
        initialData={editingGuestIndex !== null ? selectedUnits.find(u => u.types === 'guest_group')?.members[editingGuestIndex] : null}
        sharedComponents={sharedComponents}
      />
    </Box>
  );
};

export default RegisterForMeetingRooms;
