import React, { useEffect, useCallback, memo } from "react";
import {
    Box,
  // Grid,
  // Typography,
  // Tooltip,
  // styled,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";
import {  useForm } from "react-hook-form";
import { 
  StyledHeaderContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
  getCommentsByDocument,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { patchFileRecall } from "@redux/slices/UploadFile/UploadFileSlice";
// import CustomComment from "@components/CustomComment";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CustomStepper from "@components/CustomStepper/CustomSteppers";
import { apiUploadFile } from "@services/FileUpload/fileUpload";

// import {
//   StyleBoxComent,
//   StyledGridCustomComment,
// } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import FormButton from "@components/FormButton";
import { typeFlagMap } from "@components/FormButton/constant";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE, API_UPDATE_MEETING_STATUS, APP_BASE, API_MARK_IMPORTANT_DOCUMENT } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import { CustomDialog } from "@components/CustomDialog";
import {
 
  JobMainContent,
  
  // JobSectionTitle,
  StyledBoxContainerContent,
  // ParticipantHeader,
  ParticipantStats,
  StatItem,
  // BoardSection,
  // BoardGrid,
  // BoardCard,
  // BoardIconBox,
  // BoardInfo,
  // BoardLabel,
  // BoardName,
  // BoardTitle,
  // AttendanceSection,
  EmptyStateText,
  DepartmentAccordion,
  DepartmentHeader,
  DepartmentTitle,
  DepartmentName,
  ActionLink,
  DepartmentContent,
  ParticipantRow,
  DocumentBox,
  DocumentTitle,
  DocumentInfoRow,
  DocumentLabel,
  DocumentValue,
  // EditParticipantButton,
  SectionSubtitle,
  // StatDivider,
  ParticipantName,
  StyledAddIcon,
  DocumentHeaderBox,
  DocumentActionIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StatusBadge,
  ParticipantRowContent,
  GreyCaption,
  TaskTitle,
  // StatsSummary,
  StatText,
  DepartmentStats,
  ParticipantHeaderBox,
  // GreenButtonOutline,
  BlueButtonOutline,
  FlexCenterGap16,
  FlexGap8,
  // FlexGrowBox,
  // BoldSubtitle,
  GreyCaptionWithMargin,
  StyleBoxButton,
  BoxMarginTop2,
  FlexSpaceBetweenBox,
  FlexOneBox,
  StyledTableContainer,
  StyledHeaderCell,
  StyledHeaderCellWithWidth,
  ErrorIconButton,
  // NavigationContainer,
  // CompletionBox,
  // CenterActions,
  // StyledPrimaryButton,
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
import { useDispatch } from "react-redux";
// import PersonIcon from "@mui/icons-material/Person";

// import EditIcon from "@mui/icons-material/Edit";
// import AddIcon from "@mui/icons-material/Add";
// import DescriptionIcon from "@mui/icons-material/Description";
// import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import ParticipatingUnits from "./ParticipatingUnits";
import RegisterForMeetingRooms from "./RegisterForMeetingRooms";
import PrepareDocuments from "./PrepareDocuments";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
// import CheckIcon from "@mui/icons-material/Check";
// import { SkyBox } from "@styles/SkyStyles";
// import MeetingManagement from "./MeetingManagement";
// import MeetingConclusion from "./MeetingConclusion";
// import MeetingAttendance from "./MeetingAttendance";


// const BadgeContainer = styled(Box, {
//   shouldForwardProp: (prop) => prop !== '$isDone',
// })(({ theme, $isDone }) => {
//   const isDark = theme.palette.mode === 'dark';
//   return {
//     display: "inline-flex",
//     alignItems: "center",
//     backgroundColor: $isDone 
//       ? (isDark ? "rgba(76, 175, 80, 0.15)" : "#E8F5E9")
//       : (isDark ? "rgba(255, 152, 0, 0.15)" : "#FFF8E1"),
//     color: $isDone
//       ? (isDark ? "#81c784" : "#2E7D32")
//       : (isDark ? "#ffb74d" : "#F57C00"),
//     borderRadius: "24px",
//     padding: "4px 12px",
//     marginLeft: "16px",
//     cursor: "pointer",
//     height: "32px",
//     border: `1px solid ${
//       $isDone
//         ? (isDark ? "rgba(76, 175, 80, 0.3)" : "#C8E6C9")
//         : (isDark ? "rgba(255, 152, 0, 0.3)" : "#FFE0B2")
//     }`,
//   };
// });

// const HexagonIcon = styled(Box)(({ theme }) => ({
//   width: "24px",
//   height: "24px",
//   backgroundColor: theme.palette.mode === 'dark' ? "#f57c00" : "#FF9800",
//   color: "#fff",
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
//   marginRight: "12px",
//   minWidth: "24px",
// }));

// const CircleIcon = styled(Box)(({ theme }) => ({
//   width: "16px",
//   height: "16px",
//   backgroundColor: theme.palette.mode === 'dark' ? "#f57c00" : "#F57C00",
//   borderRadius: "50%",
//   color: "#fff",
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   marginRight: "8px",
// }));

// const TooltipRow = styled(Box)(() => ({
//   display: "flex",
//   alignItems: "center",
//   marginBottom: "12px",
//   "&:last-child": {
//     marginBottom: 0,
//   },
// }));

// const TitleWrapper = styled(Box)(() => ({
//   display: "flex", 
//   alignItems: "center"
// }));

// const StyledTooltipContent = styled(Box)(({ theme }) => ({
//   padding: theme.spacing(1),
// }));

// const StyledSmallPriorityHighIcon = styled(PriorityHighIcon)(() => ({
//   fontSize: 12,
// }));

// const StyledMediumPriorityHighIcon = styled(PriorityHighIcon)(() => ({
//   fontSize: 16,
// }));

// const StyledBadgeText = styled(Typography)(() => ({
//   fontWeight: 600, 
//   fontSize: "12px",
// }));

// const StyledTooltipText = styled(Typography)(() => ({
//   fontSize: "14px", 
//   whiteSpace: "nowrap",
// }));

// const StatusDoneIconBox = styled(Box)(() => ({
//   width: 24,
//   height: 24,
//   marginRight: "12px",
//   display: 'flex',
//   alignItems: 'center',
//   justifyContent: 'center',
// }));

// const StyledCheckIcon = styled(CheckIcon)(({ theme }) => ({
//   color: theme.palette.success.main,
//   fontSize: 22,
//   fontWeight: 'bold',
// }));

// const DoneIconWrapper = styled(SkyBox)(() => ({
//   display: 'flex',
//   alignItems: 'center',
//   marginRight: '8px',
// }));

// const SmallCheckIcon = styled(CheckIcon)(() => ({
//   fontSize: 18,
//   fontWeight: 'bold',
// }));

// const ProcessingStatusBadge = ({ status }) => {
//   const items = [
//     { key: 'acceptJoin', label: "Xác nhận tham gia" },
//     { key: 'assignParticipants', label: "Gán người tham dự" },
//     { key: 'prepareDocuments', label: "Chuẩn bị tài liệu họp" },
//   ];

//   const pendingCount = items.filter(item => !status?.[item.key]).length;
//   const isDone = pendingCount === 0;

//   return (
//     <Tooltip
//       title={
//         <StyledTooltipContent>
//           {items.map((item, index) => {
//             const itemDone = !!status?.[item.key];
//             return (
//               <TooltipRow key={index}>
//                 {itemDone ? (
//                   <StatusDoneIconBox>
//                     <StyledCheckIcon />
//                   </StatusDoneIconBox>
//                 ) : (
//                   <HexagonIcon>
//                     <StyledMediumPriorityHighIcon />
//                   </HexagonIcon>
//                 )}
//                 <StyledTooltipText
//                   variant="body1"
//                 >
//                   {item.label}
//                 </StyledTooltipText>
//               </TooltipRow>
//             );
//           })}
//         </StyledTooltipContent>
//       }
//       componentsProps={{
//         tooltip: {
//           sx: {
//             bgcolor: "background.paper",
//             color: "text.primary",
//             boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
//             maxWidth: "none",
//             border: "1px solid",
//             borderColor: "divider",
//           },
//         },
//       }}
//     >
//       <BadgeContainer
//      $isDone={isDone}
//       >
//         {isDone ? (
//           <DoneIconWrapper>
//             <SmallCheckIcon />
//           </DoneIconWrapper>
//         ) : (
//           <CircleIcon>
//             <StyledSmallPriorityHighIcon />
//           </CircleIcon>
//         )}
//         <StyledBadgeText
//           variant="caption"
//         >
//           {isDone ? "Hoàn thành xử lý" : `Có ${pendingCount} việc cần xử lý`}
//         </StyledBadgeText>
//       </BadgeContainer>
//     </Tooltip>
//   );
// };

const MemberItem = memo(({ member, onAddTaskToMember }) => {
  const handleAddTask = useCallback(() => {
    onAddTaskToMember(member);
  }, [member, onAddTaskToMember]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACCEPTED":
        return <StatusBadge variantType="success">Đã xác nhận tham gia</StatusBadge>;
      case "REJECTED":
        return <StatusBadge variantType="error">Xác nhận không tham gia</StatusBadge>;
      case "DELEGATED":
        return <StatusBadge variantType="warning">Được ủy quyền tham gia</StatusBadge>;
      default:
        return <GreyCaption variant="caption">Chưa xác nhận tham gia</GreyCaption>;
    }
  };

  return (
    <React.Fragment>
      <ParticipantRow>
        <ParticipantRowContent>
          <ParticipantName variant="body2">
            {member.title || member.name} {member.position ? `- ${member.position}` : ""}
            {member.delegateInfo && (
              <GreyCaptionWithMargin component="span" variant="caption">
                {` Được ủy quyền bởi ${member.delegateInfo}`}
              </GreyCaptionWithMargin>
            )}
          </ParticipantName>
          <FlexCenterGap16>
            {getStatusBadge(member.status)}
            <ActionLink onClick={handleAddTask}>
              <StyledAddIcon />
              Giao chuẩn bị tài liệu
            </ActionLink>
          </FlexCenterGap16>
        </ParticipantRowContent>
      </ParticipantRow>
      {/* ... tasks rendering remains same ... */}

      {/* Member Tasks */}
      {member.tasks?.map((task, tIdx) => (
        <DocumentBox key={`member-task-${tIdx}`} indented>
          <DocumentHeaderBox>
            <DocumentTitle>TÀI LIỆU CẦN CHUẨN BỊ</DocumentTitle>
          </DocumentHeaderBox>
          <DocumentInfoRow>
            <DocumentLabel>Tài liệu</DocumentLabel>
            <DocumentValue>: {task.documentName}</DocumentValue>
          </DocumentInfoRow>
          <DocumentInfoRow>
            <DocumentLabel>Thời hạn</DocumentLabel>
            <DocumentValue>: {dayjs(task.deadline).format("HH:mm - DD/MM/YYYY")}</DocumentValue>
          </DocumentInfoRow>
          {task.content && (
            <DocumentInfoRow>
              <DocumentLabel>Nội dung</DocumentLabel>
              <DocumentValue>: {task.content}</DocumentValue>
            </DocumentInfoRow>
          )}
        </DocumentBox>
      ))}
    </React.Fragment>
  );
});
MemberItem.displayName = "MemberItem";

// Component for file upload input
const FileUploadInput = memo(({ taskId, onFileSelect }) => {
  const handleChange = useCallback((e) => {
    onFileSelect(e, taskId);
  }, [taskId, onFileSelect]);

  return (
    <input
      type="file"
      hidden
      multiple
      onChange={handleChange}
    />
  );
});
FileUploadInput.displayName = "FileUploadInput";

// Component for file row in table
const FileRow = memo(({ fileItem, fileIndex, taskId, onToggleImportant, showRecall = false, onToggleRecall, onRemoveFile }) => {
  const handleToggle = useCallback(() => {
    onToggleImportant(taskId, fileIndex);
  }, [taskId, fileIndex, onToggleImportant]);

  const handleToggleRecall = useCallback(() => {
    onToggleRecall?.(taskId, fileIndex);
  }, [taskId, fileIndex, onToggleRecall]);

  const handleRemove = useCallback(() => {
    onRemoveFile(taskId, fileIndex);
  }, [taskId, fileIndex, onRemoveFile]);

  return (
    <TableRow>
      <TableCell>{fileIndex + 1}</TableCell>
      <TableCell>{fileItem.file.name}</TableCell>
      <TableCell align="center">
        <Checkbox 
          checked={fileItem.isImportant}
          onChange={handleToggle}
        />
      </TableCell>
      {showRecall && (
        <TableCell align="center">
          <Checkbox 
            checked={fileItem.isRecall || false}
            onChange={handleToggleRecall}
          />
        </TableCell>
      )}
      <TableCell align="center">
        <ErrorIconButton 
          size="small"
          onClick={handleRemove}
        >
          <DeleteIcon/>
        </ErrorIconButton>
      </TableCell>
    </TableRow>
  );
});
FileRow.displayName = "FileRow";


const AttendanceGroupItem = memo(({ 
  group, 
  groupId, 
  isExpanded, 
  onToggle, 
//   onAddTaskToGroup, 
  onAddTaskToMember 
}) => {
  const handleToggle = useCallback(() => {
    onToggle(groupId);
  }, [groupId, onToggle]);

//   const handleAddTask = useCallback((e) => {
//     onAddTaskToGroup(e, group);
//   }, [group, onAddTaskToGroup]);

  const confirmedCount = group.members.filter(m => m.status === "ACCEPTED").length;
  const rejectedCount = group.members.filter(m => m.status === "REJECTED").length;
  const totalCount = group.members.length;

  return (
    <DepartmentAccordion>
      <DepartmentHeader onClick={handleToggle}>
        <DepartmentTitle>
          <DepartmentName>{group.name}</DepartmentName>
          {totalCount > 0 ? (
            <DepartmentStats>
              <StatText colorType="green">Cá nhân xác nhận tham gia : {confirmedCount} / {totalCount}</StatText>
              {rejectedCount > 0 && <StatText colorType="red"> | Không tham gia : {rejectedCount}</StatText>}
            </DepartmentStats>
          ) : (
            <DepartmentStats>
               <StatText colorType="green">{group.status === 'ACCEPTED' ? 'Đã xác nhận tham gia' : 'Chưa xác nhận tham gia'}</StatText>
                <GreyCaptionWithMargin variant="caption">| Chưa gán người tham gia</GreyCaptionWithMargin>
            </DepartmentStats>
          )}
        </DepartmentTitle>
        {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </DepartmentHeader>
      {isExpanded && (
        <DepartmentContent>
          {/* Unit Level Tasks */}
          {group.tasks.length > 0 && (
            <>
              <SectionSubtitle variant="subtitle2" small greyText>
                TÀI LIỆU CẦN CHUẨN BỊ
              </SectionSubtitle>
              {group.tasks.map((task, tIdx) => (
                <DocumentBox key={`unit-task-${tIdx}`}>
                  <DocumentHeaderBox>
                    <DocumentTitle>TÀI LIỆU CẦN CHUẨN BỊ</DocumentTitle>
                    <DocumentActionIcon />
                  </DocumentHeaderBox>
                  <DocumentInfoRow>
                    <DocumentLabel>Tài liệu</DocumentLabel>
                    <DocumentValue>: {task.documentName}</DocumentValue>
                  </DocumentInfoRow>
                  <DocumentInfoRow>
                    <DocumentLabel>Thời hạn</DocumentLabel>
                    <DocumentValue>: {dayjs(task.deadline).format("HH:mm - DD/MM/YYYY")}</DocumentValue>
                  </DocumentInfoRow>
                  {task.content && (
                    <DocumentInfoRow>
                      <DocumentLabel>Nội dung</DocumentLabel>
                      <DocumentValue>: {task.content}</DocumentValue>
                    </DocumentInfoRow>
                  )}
                </DocumentBox>
              ))}
            </>
          )}

          {/* Member List */}
          {group.members.length > 0 && (
            <>
              <SectionSubtitle variant="subtitle2" small greyText>
                NGƯỜI THAM GIA
              </SectionSubtitle>
              {group.members.map((member, mIdx) => (
                <MemberItem 
                  key={mIdx} 
                  member={member} 
                  onAddTaskToMember={onAddTaskToMember} 
                />
              ))}
            </>
          )}
        </DepartmentContent>
      )}
    </DepartmentAccordion>
  );
});
AttendanceGroupItem.displayName = "AttendanceGroupItem";


const ActionButton = memo(({ action, onClick, disabled }) => {
  const handleClick = useCallback(() => {
    onClick(action);
  }, [action, onClick]);

  return (
    <BlueButtonOutline
      onClick={handleClick}
      disabled={disabled}
      variant="outlined"
    >
      {action.label}
    </BlueButtonOutline>
  );
});
ActionButton.displayName = "ActionButton";


const HandleMeetingSchedules = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  // title = "Xử lý lịch họp",
  meetingId,
  ishandlermeeting = false,
  // isparticipant = false,
  listparammeeting,
  actionCode
}) => {
  const {
    BaseSwipper,
    // InputComponents,
    // ButtonOutline,
    // AsyncAutoCompleted,
    // DateTimePicker,
    ButtonOutline
    // CustomTabsWithBadge,
  } = sharedComponents;

  // 1. All State and Hook declarations first
  const [taskFiles, setTaskFiles] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [meetingData, setMeetingData] = React.useState(null);
  const [openParticipatingUnits, setOpenParticipatingUnits] = React.useState(false);
  const [selectedUnits, setSelectedUnits] = React.useState([]);
  const [openPrepareDocs, setOpenPrepareDocs] = React.useState(false);
  const [docAssignee, setDocAssignee] = React.useState(null);
  const [workItem, setWorkItem] = React.useState(null);
  const [isTasksExpanded, setIsTasksExpanded] = React.useState(true);
  const [meetingTasks, setMeetingTasks] = React.useState([]);
  const [availableActions, setAvailableActions] = React.useState([]);
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [editingTask, setEditingTask] = React.useState(null); 
  const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
  const [fileToDelete, setFileToDelete] = React.useState(null);
  const [openClearConfirm, setOpenClearConfirm] = React.useState(false);
  
  const toast = useToast();
  const dispatch = useDispatch();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    context: { meetingMode: "HYBRID" }, 
    defaultValues: {
      title: "",
      meetingType: "",
      priority: "",
      meetingDate: null,
      startTime: null,
      endTime: null,  
      meetingMode: "HYBRID",
      content: "",
      directCommand: "",
      onlineMeeting: {
        platform: "ZOOM",
        meetingLink: "",
        passcode: "",
      },
      recurrence: {
        type: "",
        interval: 1,
        form: "finity",
        daysOfMonth: [],
        startDate: null,
        endDate: null,
        monthInQuarter: [],
        endMonth: "",
        endYear: "",
      },
    },
  });

  // 2. Business Logic Callbacks (Reconstruction and Fetching)
  const reconstructSelectedUnits = useCallback((data) => {
    const units = [];
    const isProcessing = data.proceesMeeting || data.processMeeting;

    const chairInfo = (data.chairman && data.chairman.length > 0) ? data.chairman[0] : null;
    const secInfo = (data.secretary && data.secretary.length > 0) ? data.secretary[0] : null;

    const targetChairId = (chairInfo?.userId || data.chairmanId || "").toString().trim();
    const targetSecId = (secInfo?.userId || data.secretaryId || "").toString().trim();

    if (isProcessing && data.peopleInRoom) {
      const pInRoom = data.peopleInRoom;
      const peopleData = Array.isArray(pInRoom) ? pInRoom : (pInRoom.unitId ? [pInRoom] : Object.values(pInRoom).filter(v => v && typeof v === 'object' && v.unitId));
      
      peopleData.forEach(u => {
        const unitId = u.unitId;
        const unitName = u.unitName || unitId;
        
        const unitPrototype = {
          id: unitId,
          _id: unitId,
          userId: unitId,
          unitId: unitId,
          name: unitName,
          title: unitName,
          types: 'organization_unit',
          roles: { participant: true },
          tasks: u.tasks || [],
          isConfirmed: u.isUnitConfirmed !== undefined ? u.isUnitConfirmed : u.isConfirmed,
          status: u.isUnitConfirmed === true ? 'ACCEPTED' : (u.isUnitConfirmed === false ? 'REJECTED' : (u.status || u.unitState)),
          _originalUnit: u
        };
        units.push(unitPrototype);

        if (Array.isArray(u.members)) {
          u.members.forEach(p => {
            const pId = (p.userId || p.id || "").toString().trim();
            const isChair = pId === targetChairId;
            const isSec = pId === targetSecId;
            const roleInfo = isChair ? chairInfo : (isSec ? secInfo : null);

            units.push({
              id: p.userId || p.id,
              _id: p.userId || p.id,
              name: p.userName || p.userId,
              title: p.userName || p.displayName || p.userId,
              position: p.position || p.jobTitle,
              types: 'user',
              parent: unitId,
              parentName: unitName,
              roles: {
                participant: !(isChair || isSec),
                chair: isChair,
                secretary: isSec
              },
              seatNumber: p.seatNumber,
              roomId: p.roomId,
              tasks: p.tasks || [],
              status: p.isConfirmed === true ? 'ACCEPTED' : (p.isConfirmed === false ? 'REJECTED' : (p.status || p.participationStatus)),
              isAssigned: p.isAssigned,
              delegateInfo: roleInfo?.delegateInfo || p.delegateInfo || null
            });
          });
        }
      });
    } else if (data.units) {
      data.units.forEach(u => {
        const unitId = u.unitId;
        const unitName = u.unitName || unitId;
        
        const unitPrototype = {
          id: u.unitId,
          _id: u.unitId,
          userId: u.unitId,
          unitId: u.unitId,
          name: unitName,
          title: unitName,
          types: 'organization_unit',
          roles: { participant: true },
          tasks: (u.tasks || []).filter(t => t.attachableType === "UNIT"),
          isConfirmed: u.isUnitConfirmed,
          status: u.isUnitConfirmed === true ? 'ACCEPTED' : (u.isUnitConfirmed === false ? 'REJECTED' : (u.status || u.unitState)),
          _originalUnit: u
        };

        if (u.sittingPosition && Array.isArray(u.sittingPosition) && u.sittingPosition.length > 0) {
          u.sittingPosition.forEach(pos => {
            const roomId = pos.roomId;
            const seatNumbers = Array.isArray(pos.seatNumber) ? pos.seatNumber : [pos.seatNumber];
            seatNumbers.forEach(seat => {
              if (seat) {
                units.push({
                  ...unitPrototype,
                  seatNumber: seat,
                  roomId: roomId
                });
              }
            });
          });
        } else {
          // Fallback or unassigned unit
          units.push({
            ...unitPrototype,
            seatNumber: u.seatNumber,
            roomId: u.roomId
          });
        }

        if (u.participants) {
          u.participants.forEach(p => {
            const pId = (p.id || p.userId || "").toString().trim();
            const pUserId = (p.userId || "").toString().trim();
            
            const isChair = (pId === targetChairId || pUserId === targetChairId);
            const isSec = (pId === targetSecId || pUserId === targetSecId);
            const roleInfo = isChair ? chairInfo : (isSec ? secInfo : null);

            units.push({
              id: p.id || p.userId,
              _id: p.id || p.userId,
              name: p.userName || p.userId,
              title: p.userName || p.displayName || p.userId,
              position: p.position || p.jobTitle,
              types: 'user',
              parent: u.unitId,
              parentName: unitName,
              roles: {
                participant: !(isChair || isSec),
                chair: isChair,
                secretary: isSec
              },
              seatNumber: roleInfo?.seatNumber || p.seatNumber,
              roomId: roleInfo?.roomId || p.roomId,
              tasks: roleInfo?.tasks || p.tasks || [],
              status: p.isConfirmed === true ? 'ACCEPTED' : (p.isConfirmed === false ? 'REJECTED' : (p.status || (p.participationStatus))),
              delegateInfo: roleInfo?.delegateInfo || p.delegateInfo || null,
            });
          });
        }
      });
    }
   
    const addRoleIfMissing = (info, roleKey, fallbackId) => {
        const userId = (info?.userId || fallbackId || "").toString().trim();
        if (!userId) return;
        
        // Find ONLY if there's already an entry for this specific Role Key to avoid merging with Unit Participants
        const existingRoleEntry = units.find(u => u.id?.toString().trim() === userId && u.roles && u.roles[roleKey]);
        
        if (existingRoleEntry) {
            if (info) {
                existingRoleEntry.seatNumber = info.seatNumber || existingRoleEntry.seatNumber;
                existingRoleEntry.roomId = info.roomId || existingRoleEntry.roomId;
                const oldTasks = existingRoleEntry.tasks || [];
                const newTasks = info.tasks || [];
                const taskMap = new Map();
                oldTasks.forEach(t => taskMap.set(t.id, t));
                newTasks.forEach(t => taskMap.set(t.id, t));
                existingRoleEntry.tasks = Array.from(taskMap.values());
                if (info.userName || info.name || info.unitName) {
                    existingRoleEntry.name = info.userName || info.name || info.unitName;
                    existingRoleEntry.title = info.userName || info.name || info.unitName;
                }
                if (info.delegateInfo) existingRoleEntry.delegateInfo = info.delegateInfo;
            }
        } else {
            const hasUnitType = info?.type === 'UNIT' || info?.secretaryType === 'UNIT';
            units.push({
                id: userId,
                _id: userId,
                userId: userId,
                name: info?.userName || info?.name || info?.unitName || userId,
                title: info?.userName || info?.name || info?.unitName || userId,
                types: hasUnitType ? 'organization_unit' : 'user',
                roles: { participant: false, [roleKey]: true },
                seatNumber: info?.seatNumber || null,
                roomId: info?.roomId || null,
                tasks: info?.tasks || [],
                delegateInfo: info?.delegateInfo || null
            });
        }
    };

    addRoleIfMissing(chairInfo, 'chair', data.chairmanId);
    addRoleIfMissing(secInfo, 'secretary', data.secretaryId);

    return units;
  }, []);

  const fetchMeetingDetails = useCallback(async () => {
    if (open && meetingId) {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}`, {
          params: {
            listparammeeting: listparammeeting || undefined,
          }
        });
        if (response && response.meeting) {
          const data = response.meeting;

          if (data.meetingTime) {
            const [startTime, endTime] = data.meetingTime.split("-");
            data.startTime = startTime;
            data.endTime = endTime;
          }
          
          setMeetingData(data);
          if (data.proceesMeeting || data.processMeeting) {
            setIsProcessingAction(true);
          }
          setAvailableActions(response.availableActions || []);
          setWorkItem(response.workItem || null);
          
          const reconstructed = reconstructSelectedUnits(data);
          setSelectedUnits(reconstructed);

          let startT = null;
          let endT = null;
          if (data.meetingTime && data.meetingDate) {
            const [s, e] = data.meetingTime.split("-");
            startT = dayjs(`${data.meetingDate}T${s}`);
            endT = dayjs(`${data.meetingDate}T${e}`);
          }

          reset({
            title: data.title || "",
            meetingType: data.meetingType || "",
            priority: data.priority || "",
            meetingDate: data.meetingDate ? dayjs(data.meetingDate) : null,
            startTime: startT,
            endTime: endT,
            meetingMode: data.meetingMode || "HYBRID",
            content: data.content || "",
            directCommand: data.directCommand || "",
            onlineMeeting: {
              platform: data.onlineMeeting?.platform || "ZOOM",
              meetingLink: data.onlineMeeting?.meetingLink || "",
              passcode: data.onlineMeeting?.passcode || "",
            },
            recurrence: {
              type: data.recurrence?.type || "",
              interval: data.recurrence?.interval || 1,
              startDate: data.recurrence?.startDate ? dayjs(data.recurrence.startDate) : null,
              endDate: data.recurrence?.endDate ? dayjs(data.recurrence.endDate) : null,
            },
          });
        }
      } catch (error) {
        toast(error?.message || "Lỗi khi tải thông tin lịch họp", "error");
      } finally {
        setIsLoading(false);
      }
    }
  }, [open, meetingId, listparammeeting, reset, toast, reconstructSelectedUnits]);

    const handleCloseClearConfirm = React.useCallback(() => {
        setOpenClearConfirm(false);
      }, []);

    // const handleConfirmSave = React.useCallback(async () => {
    //   setIsLoading(true);
    //   try {
    //     const statusPayload = {
    //       meetingId: meetingId,
    //       acceptJoin: true,
    //       assignParticipants: true,
    //       prepareDocuments: true
    //     };
    //     await axiosInstance.post(API_UPDATE_MEETING_STATUS, statusPayload);
    //     toast("Lưu xử lý lịch họp thành công!", "success");
    //     setOpenClearConfirm(false);
    //     if (onSuccess) {
    //       onSuccess();
    //     }
    //     onClose();
    //   } catch (error) {
    //     toast(error?.response?.data?.message || "Lỗi khi lưu xử lý lịch họp", "error");
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }, [meetingId, toast, onSuccess, onClose]);

    const onSubmits = React.useCallback(() => {
      setOpenClearConfirm(true);
    }, []);

  useEffect(() => {
    fetchMeetingDetails();
  }, [fetchMeetingDetails]);

  const fetchFilesForTask = useCallback(async (taskId) => {
    // console.log("Fetching files for task:", taskId);
    try {
      const fileRes = await axiosInstance.get(`${APP_BASE}/api/files/by-object`, {
        params: {
          "object_type": 'MeetingTask',
          "object_id": taskId,
        },
      });
      const filesData = fileRes?.data?.data || fileRes?.data || fileRes || [];
      const files = Array.isArray(filesData) ? filesData : [];
      
      // console.log(`Files received for task ${taskId}:`, files.length);
      
      setTaskFiles(prev => ({
        ...prev,
        [taskId]: files.map(f => ({
          file: { name: f.file_name || f.name, ...f },
          isImportant: !!(f.is_important || f.isImportant),
          isRecall: !!(f.is_recall || f.isRecall),
          isExisting: true,
        }))
      }));
    } catch (fileError) {
      logger.error(`Failed to fetch files for task ${taskId}`, fileError);
    }
  }, []);

  useEffect(() => {
    if (open && meetingId) {
      dispatch(getCommentsByDocument({ documentId: meetingId, type: "outgoing" }));
    }
  }, [open, meetingId, dispatch]);

  

  // 4. Interaction Handlers
  const handleFileSelect = useCallback(async (event, taskId) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const maxSize = 100 * 1024 * 1024; // 100MB
    const maxFiles = 10;
    const currentFilesCount = (taskFiles[taskId]?.length || 0);

    if (currentFilesCount + files.length > maxFiles) {
      toast("Vượt quá số lượng file", "warning");
      return;
    }

    for (const file of files) {
      if (file.size > maxSize) {
        toast("Vượt quá 100MB/file", "warning");
        return;
      }
    }

    setIsLoading(true);
    try {
      const uploadPromises = files.map(file => apiUploadFile(file, "MeetingTask", taskId));
      await Promise.all(uploadPromises);

      // if ((ishandlermeeting || isProcessingAction) && meetingId) {
      //   const statusPayload = {
      //     meetingId: meetingId,
      //     acceptJoin: true,
      //     assignParticipants: true,
      //     prepareDocuments: true
      //   };
      //   await axiosInstance.post(API_UPDATE_MEETING_STATUS, statusPayload);
      //   await fetchMeetingDetails();
      // }

      toast("Tải lên tài liệu thành công!", "success");
      // console.log("Upload success, refreshing files for task:", taskId);
      await fetchFilesForTask(taskId);
    } catch (error) {
      toast("Lỗi khi tải lên tài liệu", "error");
      logger.error("Error in immediate file upload:", error);
    } finally {
      setIsLoading(false);
    }
  }, [ishandlermeeting, meetingId, isProcessingAction, toast, fetchMeetingDetails, fetchFilesForTask, taskFiles]);

  const handleRemoveFile = useCallback((taskId, fileIdx) => {
    const fileItem = taskFiles[taskId]?.[fileIdx];
    if (fileItem?.isExisting) {
      setFileToDelete({ taskId, fileIdx, fileId: fileItem.file.id || fileItem.file._id });
      setOpenDeleteDialog(true);
    } else {
      setTaskFiles(prev => ({
        ...prev,
        [taskId]: prev[taskId].filter((_, i) => i !== fileIdx)
      }));
    }
  }, [taskFiles]);

  const handleCloseLockConfirm = useCallback(async () => {
    setOpenDeleteDialog(false);
  }, []);

  const handleConfirmDeleteFile = useCallback(async () => {
    if (!fileToDelete) return;
    
    const { taskId, fileId } = fileToDelete;
    setIsLoading(true);
    try {
      await axiosInstance.delete(`${API_MARK_IMPORTANT_DOCUMENT}/${fileId}`);
      toast("Xóa tài liệu thành công!", "success");
      await fetchFilesForTask(taskId);
      setOpenDeleteDialog(false);
      setFileToDelete(null);
    } catch (error) {
      toast(error?.response?.data?.message || "Lỗi khi xóa tài liệu", "error");
      logger.error("Error deleting file:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fileToDelete, fetchFilesForTask, toast]);

  const handleToggleImportant = useCallback(async (taskId, fileIdx) => {
    const fileItem = taskFiles[taskId]?.[fileIdx];
    const fileId = fileItem?.file?.id || fileItem?.file?._id;
    
    if (!fileId) {
      toast("Không tìm thấy ID tài liệu để cập nhật", "error");
      return;
    }

    const newImportance = !fileItem.isImportant;

    try {
      // Call API to mark/unmark important
      await axiosInstance.patch(`${API_MARK_IMPORTANT_DOCUMENT}/${fileId}/importance`, {
        isImportant: newImportance
      });

      // Update local state on success
      setTaskFiles(prev => ({
        ...prev,
        [taskId]: prev[taskId].map((item, i) => 
          i === fileIdx ? { ...item, isImportant: newImportance } : item
        )
      }));
      
      toast(`Đã ${newImportance ? "đánh dấu" : "bỏ đánh dấu"} tài liệu chỉ xem`, "success");
    } catch (error) {
      toast("Lỗi khi cập nhật trạng thái tài liệu", "error");
      logger.error("Error toggling file importance:", error);
    }
  }, [taskFiles, toast]);

  const handleToggleRecall = useCallback(async (taskId, fileIdx) => {
    const fileItem = taskFiles[taskId]?.[fileIdx];
    const fileId = fileItem?.file?.id || fileItem?.file?._id;
    
    if (!fileId) {
      toast("Không tìm thấy ID tài liệu để cập nhật", "error");
      return;
    }

    const newRecall = !fileItem.isRecall;

    try {
      // Call API to mark/unmark recall via Redux
      await dispatch(patchFileRecall({ fileId, isRecall: newRecall })).unwrap();

      // Update local state on success
      setTaskFiles(prev => ({
        ...prev,
        [taskId]: prev[taskId].map((item, i) => 
          i === fileIdx ? { ...item, isRecall: newRecall } : item
        )
      }));
      
      toast(`Đã ${newRecall ? "đánh dấu" : "bỏ đánh dấu"} tài liệu thu hồi`, "success");
    } catch (error) {
      toast("Lỗi khi cập nhật trạng thái tài liệu thu hồi", "error");
      logger.error("Error toggling file recall status:", error);
    }
  }, [taskFiles, toast, dispatch]);

  const handleOpenParticipatingUnits = useCallback(() => {
    setOpenParticipatingUnits(true);
  }, []);

  const handleCloseParticipatingUnits = useCallback(() => {
    setOpenParticipatingUnits(false);
  }, []);

  const handleParticipatingUnitsSave = useCallback((newResults) => {
    setSelectedUnits(newResults);
    handleCloseParticipatingUnits();
  }, [handleCloseParticipatingUnits]);

  const handleRoomChange = useCallback(() => {
    // Custom logic if needed
  }, []);
  
  const handleToggleTasksExpanded = useCallback(() => {
    setIsTasksExpanded((prev) => !prev);
  }, []);

  const handleProcessingAction = useCallback(async (type) => {
    if (type === 'process_meeting' || type === 'update_meeting_unit_process') {
      try {
        await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/unit-processing`);
        setIsProcessingAction(true);
      } catch (error) {
        toast(error?.response?.data?.message || "Lỗi khi xử lý lịch họp", "error");
      }
    }
  }, [meetingId, toast]);

  const handleClosePrepareDocs = useCallback(() => {
    setOpenPrepareDocs(false);
    setDocAssignee(null);
    setEditingTask(null);
  }, []);

  const handlePrepareDocsSave = useCallback((docData) => {
    if (!docAssignee) return;

    setSelectedUnits(prev => {
      const assigneeId = docAssignee.id || docAssignee._id;
      const exists = prev.some(item => (item.id || item._id) === assigneeId);

      if (exists) {
        return prev.map(item => {
          if ((item.id || item._id) === assigneeId) {
            const currentTasks = item.tasks || [];
            
            // Nếu đang edit, thay thế task tại vị trí taskIndex
            if (editingTask !== null && editingTask.taskIndex !== undefined) {
              const updatedTasks = [...currentTasks];
              updatedTasks[editingTask.taskIndex] = docData;
              return { ...item, tasks: updatedTasks };
            }

            // Nếu không thì thêm mới
            return {
              ...item,
              tasks: [...currentTasks, docData]
            };
          }
          return item;
        });
      } else {
        return [...prev, { ...docAssignee, tasks: [docData] }];
      }
    });

    handleClosePrepareDocs();
  }, [docAssignee, editingTask, handleClosePrepareDocs]);


//    const { crmSource } = useSelector((state) => state.config);

  // const schema = yup.object().shape({
  //   title: yup.string().required("Vui lòng nhập tiêu đề cuộc họp"),
  //   meetingType: yup.string().required("Vui lòng chọn loại lịch họp"),
  //   priority: yup.string().required("Vui lòng chọn mức độ ưu tiên"),
  //   meetingDate: yup.date().required("Vui lòng chọn ngày họp").typeError("Ngày họp không hợp lệ"),
  //   startTime: yup.date().required("Vui lòng chọn thời gian bắt đầu").typeError("Thời gian bắt đầu không hợp lệ"),
  //   endTime: yup.date().required("Vui lòng chọn thời gian kết thúc").typeError("Thời gian kết thúc không hợp lệ"),
  //   meetingMode: yup.string().required("Vui lòng chọn hình thức họp"),
  //   directCommand: yup.string(),
  //   onlineMeeting: yup.object().shape({
  //     platform: yup.string().when("$meetingMode", {
  //       is: (val) => val === "ONLINE" || val === "HYBRID",
  //       then: (schema) => schema.required("Vui lòng nhập nền tảng họp"),
  //       otherwise: (schema) => schema.nullable(),
  //     }),
  //     meetingLink: yup.string().when("$meetingMode", {
  //       is: (val) => val === "ONLINE" || val === "HYBRID",
  //       then: (schema) => schema.required("Vui lòng nhập link họp"),
  //       otherwise: (schema) => schema.nullable(),
  //     }),
  //   }),
  // });

  // const [tabIndex, setTabIndex] = React.useState(0);
  // const [expandedSections, setExpandedSections] = React.useState([]);
  // const [isAttendanceConfirmed, setIsAttendanceConfirmed] = React.useState(false);
  const steps = React.useMemo(() => {
    const list = [{ id: 1, label: "Gán người tham gia" }];
    if (meetingData?.hasDocumentUnit !== false) {
      list.push({ id: 2, label: "Upload tài liệu họp" });
    }
    list.push({ id: 3, label: "Hoàn thành" });
    return list;
  }, [meetingData?.hasDocumentUnit]);

  // const { commentsList: comments } = useSelector(
  //   (state) => state.unit
  // );

  // Business logic moved above to resolve initialization order issues


//   const tabs = [
//     { label: "Thông tin lịch" },
//     { label: "Tham dự cuộc họp" },
//     { label: "Điều hành cuộc họp" },
//     { label: "Kết luận" },
//   ];

//   const handleTabChange = useCallback((event, newValue) => {
//     setTabIndex(newValue);
//   }, []);

  // Group participants by unit
  // const attendanceGroups = React.useMemo(() => {
  //   const groups = {};
    
  //   // Process units first to establish headers if they are explicitly selected
  //   selectedUnits.forEach(item => {
  //     const isUnit = item.types === 'organization_unit';
  //     if (isUnit) {
  //       const uId = item.id || item._id;
  //       if (!groups[uId]) {
  //         groups[uId] = { 
  //           id: uId, 
  //           name: item.name || item.title, 
  //           members: [], 
  //           tasks: item.tasks || [],
  //           status: item.status,
  //           _originalUnit: item
  //         };
  //       }
  //     });

  //   // Process all selected items to assign participants to groups
  //   selectedUnits.forEach(item => {
  //     if (!item.roles?.participant) return;

  //     const isUnit = item.types === 'user' ? false : true;
  //     if (isUnit) return; // units are already handled

  //     const uId = item.parent;
  //     const uName = item.parentName || item.unitName || "Đơn vị khác";
      
  //     if (!groups[uId]) {
  //       groups[uId] = { 
  //         id: uId, 
  //         name: uName, 
  //         members: [], 
  //         tasks: [],
  //         _originalUnit: null
  //       };
  //     }
      
  //     groups[uId].members.push(item);
  //   });
    
  //   return Object.values(groups);
  // }, [selectedUnits]);

  // const attendanceStats = React.useMemo(() => {
  //   const individualParticipants = selectedUnits.filter(u => u.types === 'user' && u.roles?.participant);
  //   const total = individualParticipants.length;
  //   const confirmed = individualParticipants.filter(m => m.status === "ACCEPTED").length;
  //   const rejected = individualParticipants.filter(m => m.status === "REJECTED").length;
  //   const pending = total - confirmed - rejected;

  //   const units = selectedUnits.filter(u => u.types === 'organization_unit');
  //   const unitsTotal = units.length;
  //   const unitsConfirmed = units.filter(u => u.status === "ACCEPTED").length;
  //   const unitsRejected = units.filter(u => u.status === "REJECTED").length;

  //   return { total, confirmed, rejected, pending, unitsTotal, unitsConfirmed, unitsRejected };
  // }, [selectedUnits]);


  // const handleNextStep1 = useCallback(() => {
  //   setActiveStep(1);
  // }, []);

  // const handleNextStep2 = useCallback(() => {
  //   setActiveStep(2);
  // }, []);

  // const handleNextStep3 = useCallback(() => {
  //   setActiveStep(3);
  // }, []);

  // const handleBackToStep0 = useCallback(() => {
  //   setActiveStep(0);
  // }, []);

  // const handleBackToStep1 = useCallback(() => {
  //   setActiveStep(1);
  // }, []);

  // const handleOpenPrepareDocs = useCallback((assignee, task = null, taskIndex = null) => {
  //   setDocAssignee(assignee);
  //   setEditingTask(task && taskIndex !== null ? { task, taskIndex } : null);
  //   setOpenPrepareDocs(true);
  // }, []);

  // const handleToggleGroup = useCallback((id) => {
  //   setExpandedSections((prev) =>
  //     prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
  //   );
  // }, []);

  // const handleAddTaskToGroup = useCallback((e, group) => {
  //   e.stopPropagation();
  //   handleOpenPrepareDocs(group._originalUnit || { id: group.id, name: group.name, types: 'organization_unit' });
  // }, [handleOpenPrepareDocs]);

  // const handleAddTaskToMember = useCallback((member) => {
  //   handleOpenPrepareDocs(member);
  // }, [handleOpenPrepareDocs]);

  // const chairman = React.useMemo(() => selectedUnits.find(u => u.roles?.chair), [selectedUnits]);
  // const secretary = React.useMemo(() => selectedUnits.find(u => u.roles?.secretary), [selectedUnits]);

  


//   const handleDateChange = useCallback((onChange) => {
//     return (date) => {
//       onChange(date);
//     };
//   }, []);

  // Reset form khi mở
  useEffect(() => {
    if (open) {
      if (!meetingId) {
        reset({
          title: "",
          meetingType: "",
          priority: "",
          meetingDate: null,
          startTime: null,
          endTime: null,
          meetingMode: "HYBRID",
          content: "",
          onlineMeeting: {
            platform: "ZOOM",
            meetingLink: "",
            passcode: "",
          },
          recurrence: {
            type: "",
            interval: 1,
            form: "finity",
            daysOfMonth: [],
            startDate: null,
            endDate: null,
            monthInQuarter: [],
            endMonth: "",
            endYear: "",
          },
          directCommand: "",
        });
        setSelectedUnits([]);
      }
    }
  }, [open, reset, meetingId]);

  // Fetch comments
  useEffect(() => {
    if (open && meetingId) {
      dispatch(getCommentsByDocument({ documentId: meetingId, type: "outgoing" }));
    }
  }, [open, meetingId, dispatch]);

  // Fetch specialized meeting tasks (UNIT type)
  useEffect(() => {
    const fetchMeetingTasks = async () => {
      if (open && meetingId) {
        try {
          const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/unit-tasks?includeComments=true`);
          let tasks = [];
          if (Array.isArray(response)) {
            tasks = response;
            setWorkItem(response.workItem || null);
          } else if (response?.success && response?.data) {
            tasks = response.data;
            setWorkItem(response.workItem || null);
          }
          // console.log("setMeetingTasks:", meetingTasks);
          // console.log("setMeetingTasks:", meetingTasks);
          setMeetingTasks(tasks);

          if (tasks && tasks.length > 0) {
            tasks.forEach(task => {
              fetchFilesForTask(task.id || task._id);
            });
          } else {
            setTaskFiles({});
          }
        } catch (error) {
          logger.error("Error fetching meeting tasks:", error);
        }
      }
    };
    fetchMeetingTasks();
  }, [open, meetingId, fetchFilesForTask]);


  const onSubmit = async () => {
    setIsLoading(true);

    try {
      if ((ishandlermeeting || isProcessingAction) && meetingId) {
        // 1. Participant Sync Logic
        // Identify the secretary if any
        const secretaryNode = selectedUnits.find(u => u.roles?.secretary);
        const secretaryId = secretaryNode ? (secretaryNode.id || secretaryNode._id || secretaryNode.userId) : "";
        const secretaryUnitId = secretaryNode ? (secretaryNode.types === 'organization_unit' ? (secretaryNode.id || secretaryNode._id) : secretaryNode.parent) : null;

        // Group selected members by unit
        const participantUnitsMap = new Map();
        selectedUnits.forEach(u => {
          if (u.types === 'user' && u.roles?.participant && u.parent) {
            if (!participantUnitsMap.has(u.parent)) {
              participantUnitsMap.set(u.parent, []);
            }
            participantUnitsMap.get(u.parent).push({ userId: u.id || u._id || u.userId });
          }
        });

        // Get existing units from meeting overall data
        const pInRoom = meetingData?.peopleInRoom;
        const peopleData = Array.isArray(pInRoom) 
          ? pInRoom 
          : (pInRoom?.unitId ? [pInRoom] : Object.values(pInRoom || {}).filter(v => v && typeof v === 'object' && v.unitId));

        // Set of units to sync: All currently selected units WITH participants + any units that WERE in the meeting
        let targetUnitIds = new Set([
            ...Array.from(participantUnitsMap.keys()),
            ...peopleData.map(p => p.unitId)
        ]);

        // If no units are identified yet but we have a secretary, we MUST sync at least one unit (the secretary's unit)
        if (targetUnitIds.size === 0 && secretaryUnitId) {
          targetUnitIds.add(secretaryUnitId);
        }

        const syncPromises = Array.from(targetUnitIds).map(unitId => {
          const existingUnit = peopleData.find(p => p.unitId == unitId);
          const members = participantUnitsMap.get(unitId) || [];

          const syncPayload = {
            meetingUnitId: existingUnit?.id || meetingId, 
            unitId: unitId,
            secretary: secretaryId,
            members: members,
            workItem: workItem,
            actionCode: actionCode.code
          };

          return axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/participants/sync`, syncPayload);
        });

        if (syncPromises.length > 0) {
          await Promise.all(syncPromises);
        }
      }

        // 2. Update overall status to confirm participant assignment
        const statusPayload = {
          workItem : workItem,
          meetingId: meetingId,
          acceptJoin: true,
          assignParticipants: true,
          prepareDocuments: meetingData?.prepareDocuments || false,
          actionCode:actionCode.code
        };
        await axiosInstance.post(API_UPDATE_MEETING_STATUS, statusPayload);

        // Note: Task file uploads are now handled immediately in handleFileSelect

        toast("Cập nhật thông tin thành công!", "success");
        // onSuccess?.();
        
        // Refresh detail to make sure everything is in sync before closing (optional but good)
        await fetchMeetingDetails();
        handleCloseClearConfirm();
        onClose();
        return;
      
   
  
      // 1. Phân loại người tham gia từ selectedUnits
      // const chairman = selectedUnits.find(u => u.roles?.chair);
      // const secretary = selectedUnits.find(u => u.roles?.secretary);
      
      // Xây dựng danh sách units và participants
      // const unitMap = {};

      // selectedUnits.forEach(item => {
      //   const isUnit = item.types === 'organization_unit';
      //   const uId = isUnit ? (item.id || item._id) : item.parent;
        
      //   if (!uId) return;

      //   if (!unitMap[uId]) {
      //     unitMap[uId] = { 
      //       unitId: uId, 
      //       participants: [], 
      //       tasks: [] 
      //     };
      //   }
      //   if (isUnit) {
      //     unitMap[uId].isRoomSelected = true;
      //   } else if (unitMap[uId].isRoomSelected !== true) {
      //     unitMap[uId].isRoomSelected = false;
      //   }

      //   // Nếu là đơn vị và đơn vị đó được gán ghế
      //   if (isUnit && item.seatNumber && item.roomId) {
      //     if (!unitMap[uId].sittingPosition) unitMap[uId].sittingPosition = [];
          
      //     let roomPos = unitMap[uId].sittingPosition.find(p => p.roomId === item.roomId);
      //     if (!roomPos) {
      //       roomPos = { roomId: item.roomId, seatNumber: [] };
      //       unitMap[uId].sittingPosition.push(roomPos);
      //     }
      //     if (!roomPos.seatNumber.includes(item.seatNumber)) {
      //       roomPos.seatNumber.push(item.seatNumber);
      //     }
      //   }

      //   // Xử lý cá nhân tham gia
      //   if (!isUnit && item.roles?.participant) {
      //       unitMap[uId].participants.push({
      //           userId: item.id || item._id,
      //           seatNumber: item.seatNumber || null,
      //           roomId: item.roomId || null,
      //           tasks: (item.tasks || []).map(t => ({
      //               attachableType: "PARTICIPANT",
      //               content: t.content || "",
      //               documentName: t.documentName || "",
      //               deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
      //           }))
      //       });
      //   }

      //   // Xử lý chuẩn bị tài liệu (tasks) cho đơn vị
      //   if (isUnit && item.tasks && item.tasks.length > 0 && unitMap[uId].tasks.length === 0) {
      //       const mappedTasks = item.tasks.map(t => ({
      //           attachableType: "UNIT",
      //           content: t.content || "",
      //           documentName: t.documentName || "",
      //           deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
      //       }));
      //       unitMap[uId].tasks.push(...mappedTasks);
      //   }
      // });

      // const payload = {
      //   title: data.title,
      //   meetingType: data.meetingType,
      //   priority: data.priority,
      //   meetingDate: data.meetingDate ? dayjs(data.meetingDate).format("YYYY-MM-DD") : null,
      //   meetingTime: (data.startTime && data.endTime) 
      //     ? `${dayjs(data.startTime).format("HH:mm")}-${dayjs(data.endTime).format("HH:mm")}`
      //     : null,
      //   meetingMode: data.meetingMode,
      //   content: data.content,
      //   chairmanId: chairman ? (chairman.id || chairman._id) : null,
      //   secretaryId: secretary ? (secretary.id || secretary._id) : null,
      //   directCommand: data.directCommand,
      //   onlineMeeting: {
      //     platform: data.onlineMeeting?.platform,
      //     meetingLink: data.onlineMeeting?.meetingLink,
      //     passcode: data.onlineMeeting?.passcode,
      //   },
      //   recurrence: data.recurrence?.type ? {
      //     type: data.recurrence.type.toUpperCase(),
      //     interval: Number(data.recurrence.interval) || 1,
      //     startDate: data.recurrence?.startDate ? dayjs(data.recurrence.startDate).format("YYYY-MM-DD") : null,
      //     endDate: data.recurrence?.endDate ? dayjs(data.recurrence.endDate).format("YYYY-MM-DD") : null,
      //   } : null,
      //   tasks: [], // Giao tài liệu cấp cuộc họp
      //   units: Object.values(unitMap),
      // };

      // const response = await axiosInstance.post(API_ADD_MEETING_SCHEDULE, payload);
      // const newMeetingId = response?.data?._id || response?._id || response?.id;

      // if (!newMeetingId) {
      //   throw new Error("Không nhận được ID lịch họp sau khi tạo.");
      // }

      // Xử lý upload file cho tài liệu chuẩn bị
      // const uploadPromises = [];
      // Object.keys(taskFiles).forEach(taskId => {
      //   const filesForTask = taskFiles[taskId] || [];
      //   filesForTask.forEach(item => {
      //     uploadPromises.push(
      //       apiUploadFile(item.file, "MeetingTask", newMeetingId)
      //         // .catch( => toast(`Tải lên tệp ${item.file.name} thất bại.`, "warning"))
      //     );
      //   });
      // });

      // if (uploadPromises.length > 0) {
      //   await Promise.all(uploadPromises);
      // }

      // toast("Tạo lịch họp thành công!", "success");
      // onSuccess?.();
      // onClose();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // const handleConfirmAttendance = useCallback(async () => {
  //   setIsLoading(true);
  //   try {
  //     // Logic for confirming attendance would go here
  //     setIsAttendanceConfirmed(true);
  //     toast("Xác nhận tham gia thành công!", "success");
  //   } catch (error) {
  //     toast("Lỗi khi xác nhận tham gia", "error");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [toast]);

  // Determine actions and flags for FormButton
  const dataForFormButton = React.useMemo(() => {
    // Flatten available actions
    let flatActions = [];
    if (availableActions && Array.isArray(availableActions)) {
      availableActions.forEach(action => {
        if (action.subActions && Array.isArray(action.subActions) && action.subActions.length > 0) {
          action.subActions.forEach(sub => {
            if (sub.actions && Array.isArray(sub.actions)) {
              flatActions = [...flatActions, ...sub.actions];
            }
          });
        } else {
          flatActions.push(action);
        }
      });
    }

    // If already in processing mode or update_meeting_unit_process type, hide the actions
    if (isProcessingAction || actionCode?.type === 'update_meeting_unit_process') {
        flatActions = flatActions.filter(a => a.type !== 'process_meeting' && a.type !== 'update_meeting_unit_process');
    }

    // Generate flags dynamically based on types
    const flags = {};
    flatActions.forEach(a => {
        const flagName = typeFlagMap[a.type];
        if (flagName) flags[flagName] = true;
    });

    return {
        ...meetingData, 
        workItem: workItem,
        meetingId: meetingId, // FormButton uses this
        availableActions: flatActions,
        flags: {
            ...flags,
        }
    };
  }, [availableActions, meetingData, meetingId, workItem, isProcessingAction]);
// Thêm hàm này vào trong component HandleMeetingSchedules
const getCorrectDeadline = useCallback((taskId, defaultDeadline) => {
  if (!meetingData) return defaultDeadline;
  
  let foundDeadline = null;
  
  const checkTasks = (tasksArr) => {
    if (!tasksArr || !Array.isArray(tasksArr)) return;
    const match = tasksArr.find(t => (t.id || t._id) === taskId);
    if (match && match.deadline) foundDeadline = match.deadline;
  };

  // Kiểm tra trong peopleInRoom và units
  if (meetingData.peopleInRoom) {
    const pInRoom = meetingData.peopleInRoom;
    const arr = Array.isArray(pInRoom) ? pInRoom : 
               (pInRoom?.unitId ? [pInRoom] : Object.values(pInRoom).filter(v => v && typeof v === 'object' && v.unitId));
    arr.forEach(u => checkTasks(u.tasks));
  }

  if (!foundDeadline && meetingData.units) {
    meetingData.units.forEach(u => checkTasks(u.tasks));
  }

  return foundDeadline || defaultDeadline;
}, [meetingData]);

  return (
    <BaseSwipper
      // title={
      //   <TitleWrapper>
      //     <span>{title}</span>
      //     <ProcessingStatusBadge status={meetingData} />
      //   </TitleWrapper>
      // }
      title="Xử lý lịch họp"
      open={open}
      onClose={onClose}
      onSave={handleSubmit(onSubmit)}
      type="add"
      hideBackdrop
       moreActions={
        <FlexGap8>
          
              <StyleBoxButton>
                <ButtonOutline
                  onClick={onSubmits}
                  disabled={isLoading}
                  variant="outlined"
                >
                  Lưu
                </ButtonOutline>
              </StyleBoxButton>
            
           <FormButton
              dataDetail={dataForFormButton}
              setReloadData={onSuccess} 
              onClose={onClose}
              disabled={isLoading}
              sharedComponents={sharedComponents}
              onAction={handleProcessingAction}
           />
        </FlexGap8>
      }
    >
   
      

      <JobMainContent>
        <Box mb={4} mt={1}>
          <CustomStepper
            steps={steps}
            activeStep={activeStep}
            onStepClick={setActiveStep}
            alternativeLabel={false}
            disabledSteps={{ [steps.length - 1]: true }}
          />
        </Box>
    

            {/* CHI TIẾT CÁC BƯỚC XỬ LÝ */}
            
            {/* BƯỚC 1: GÁN NGƯỜI THAM GIA */}
            {steps[activeStep]?.id === 1 && (
              <Box>
                <RegisterForMeetingRooms 
                  control={control} 
                  errors={errors} 
                  sharedComponents={sharedComponents} 
                  selectedUnits={selectedUnits}
                  onOpenParticipatingUnits={handleOpenParticipatingUnits}
                  isView={!isProcessingAction}
                  isProcessing
                  isProcessingAction={isProcessingAction}
                  initialRooms={meetingData?.roomIds?.length ? meetingData.roomIds : [{ id: 'strongboy', name: 'PHÒNG HỌP STRONGBOY', capacity: 50, image: '', stage: 'Sẵn sàng' }]}
                  leftPanelTitle="GÁN NGƯỜI ĐƠN VỊ THAM GIA"
                  onRoomChange={handleRoomChange}
                  assignOnlyRoom={meetingData?.assignOnlyRoom}
                  assignOnlySecretary={meetingData?.assignOnlySecretary}
                  assignRoomAndSecretary={meetingData?.assignRoomAndSecretary}
                />
                </Box>
            )}

            {/* BƯỚC 2: GÁN VỊ TRÍ NGỒI */}
            {/* {activeStep === 2 && (
              <Box>
                <RegisterForMeetingRooms 
                  control={control} 
                  errors={errors} 
                  sharedComponents={sharedComponents} 
                  selectedUnits={selectedUnits}
                  onOpenParticipatingUnits={handleOpenParticipatingUnits}
                  isView={!isProcessingAction}
                  isProcessing={true}
                  isProcessingAction={isProcessingAction}
                  initialRooms={meetingData?.roomIds?.length ? meetingData.roomIds : [{ id: 'strongboy', name: 'PHÒNG HỌP STRONGBOY', capacity: 50, image: '', stage: 'Sẵn sàng' }]}
                  leftPanelTitle="DANH SÁCH CÁ NHÂN THAM DỰ"
                /> */}
                {/* <NavigationContainer mt={3}>
                  <BlueButtonOutline onClick={handleBackToStep0}>Quay lại</BlueButtonOutline>
                  <StyledPrimaryButton variant="contained" onClick={handleNextStep2}>
                    Tiếp theo: Upload tài liệu
                  </StyledPrimaryButton>
                </NavigationContainer> */}
                {/* </Box>
            )} */}

            {/* BƯỚC 2: UPLOAD TÀI LIỆU HỌP */}
            {steps[activeStep]?.id === 2 && (
              <>
            
              <StyledBoxContainerContent>
                <ParticipantHeaderBox 
                  onClick={handleToggleTasksExpanded}
                  isExpanded={isTasksExpanded}
                >
                  <StyledHeaderContent variant="h6" mt={0}>
                    Tài liệu họp cần chuẩn bị
                  </StyledHeaderContent>
                  <FlexCenterGap16>
                    <ParticipantStats mb={0}>
                      <StatItem colorType="blue">
                        Tài liệu cần chuẩn bị : <span>{meetingTasks?.length || 0} loại tài liệu</span>
                      </StatItem>
                    </ParticipantStats>
                    {isTasksExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  </FlexCenterGap16>
                </ParticipantHeaderBox>
                
                {isTasksExpanded && (
                  <BoxMarginTop2>
                    {meetingTasks?.length > 0 ? meetingTasks.map((task, idx) => {
                      const taskId = task.id || task._id || idx;
                      return (
                        <DocumentBox key={taskId}>
                          <FlexSpaceBetweenBox>
                            <FlexOneBox>
                              <TaskTitle variant="subtitle2">
                                {idx + 1}. {task.documentName}
                              </TaskTitle>
                              <DocumentInfoRow>
                                <DocumentLabel>Thời hạn</DocumentLabel>
                                <DocumentValue>: {(function() {
																const exactDeadline = getCorrectDeadline(taskId, task.deadline);
																return exactDeadline ? dayjs(exactDeadline).format("HH:mm - DD/MM/YYYY") : "---";
															})()}</DocumentValue>
                              </DocumentInfoRow>
                              {task.content && (
                                <DocumentInfoRow>
                                  <DocumentLabel>Nội dung</DocumentLabel>
                                  <DocumentValue preLine>: {task.content}</DocumentValue>
                                </DocumentInfoRow>
                              )}
                            </FlexOneBox>
                            <ButtonOutline
                              variant="contained"
                              component="label"
                              startIcon={<CloudUploadIcon />}
                              size="small"
                            >
                              Chọn
                              <FileUploadInput 
                                taskId={taskId}
                                onFileSelect={handleFileSelect}
                              />
                            </ButtonOutline>
                          </FlexSpaceBetweenBox>

                          {/* Bảng danh sách tệp đã chọn */}
                          {taskFiles[taskId]?.length > 0 && (
                            <>
                              <SectionSubtitle variant="subtitle2" small greyText>
                                Danh sách tệp tải lên
                              </SectionSubtitle>
                              <StyledTableContainer component={Paper}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <StyledHeaderCellWithWidth>STT</StyledHeaderCellWithWidth>
                                    <StyledHeaderCell>Tên file</StyledHeaderCell>
                                    <StyledHeaderCell align="center">Tài liệu chỉ xem</StyledHeaderCell>
                                    <StyledHeaderCell align="center">Tài liệu thu hồi</StyledHeaderCell>
                                    <StyledHeaderCell align="center">Hành động</StyledHeaderCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {taskFiles[taskId].map((fileItem, fIdx) => (
                                    <FileRow
                                      key={fIdx}
                                      fileItem={fileItem}
                                      fileIndex={fIdx}
                                      taskId={taskId}
                                      onToggleImportant={handleToggleImportant}
                                      showRecall
                                      onToggleRecall={handleToggleRecall}
                                      onRemoveFile={handleRemoveFile}
                                    />
                                  ))}
                                </TableBody>
                              </Table>
                            </StyledTableContainer>
                            </>
                          )}
                        </DocumentBox>
                      )
                    }) : (
                      <EmptyStateText>Chưa có yêu cầu chuẩn bị tài liệu họp</EmptyStateText>
                    )}
                  </BoxMarginTop2>
                )}
                {/* <NavigationContainer mt={4}>
                  <BlueButtonOutline onClick={handleBackToStep1}>Quay lại</BlueButtonOutline>
                  <StyledPrimaryButton variant="contained" onClick={handleNextStep3}>
                    Tiếp theo: Hoàn thành
                  </StyledPrimaryButton>
                </NavigationContainer> */}
              </StyledBoxContainerContent>
                <Box>
                    <RegisterForMeetingRooms 
                  control={control} 
                  errors={errors} 
                  sharedComponents={sharedComponents} 
                  selectedUnits={selectedUnits}
                  onOpenParticipatingUnits={handleOpenParticipatingUnits}
                  isView={!isProcessingAction}
                  isProcessing
                  isProcessingAction={isProcessingAction}
                  initialRooms={meetingData?.roomIds?.length ? meetingData.roomIds : [{ id: 'strongboy', name: 'PHÒNG HỌP STRONGBOY', capacity: 50, image: '', stage: 'Sẵn sàng' }]}
                  leftPanelTitle="DANH SÁCH CÁ NHÂN THAM DỰ"
                  assignOnlyRoom={meetingData?.assignOnlyRoom}
                  assignOnlySecretary={meetingData?.assignOnlySecretary}
                  assignRoomAndSecretary={meetingData?.assignRoomAndSecretary}
                />
                </Box>
              </>
            )}

            {/* BƯỚC 3: HOÀN THÀNH (HOẶC XỬ LÝ KHÁC) */}
            {steps[activeStep]?.id === 3 && (
             <>
            
              <StyledBoxContainerContent>
                <ParticipantHeaderBox 
                  onClick={handleToggleTasksExpanded}
                  isExpanded={isTasksExpanded}
                >
                  <StyledHeaderContent variant="h6" mt={0}>
                    Tài liệu họp cần chuẩn bị
                  </StyledHeaderContent>
                  <FlexCenterGap16>
                    <ParticipantStats mb={0}>
                      <StatItem colorType="blue">
                        Tài liệu cần chuẩn bị : <span>{meetingTasks?.length || 0} loại tài liệu</span>
                      </StatItem>
                    </ParticipantStats>
                    {isTasksExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  </FlexCenterGap16>
                </ParticipantHeaderBox>
                
                {isTasksExpanded && (
                  <BoxMarginTop2>
                    {meetingTasks?.length > 0 ? meetingTasks.map((task, idx) => {
                      const taskId = task.id || task._id || idx;
                      return (
                        <DocumentBox key={taskId}>
                          <FlexSpaceBetweenBox>
                            <FlexOneBox>
                              <TaskTitle variant="subtitle2">
                                {idx + 1}. {task.documentName}
                              </TaskTitle>
                              <DocumentInfoRow>
                                <DocumentLabel>Thời hạn</DocumentLabel>
                                <DocumentValue>: {(function() {
  const exactDeadline = getCorrectDeadline(taskId, task.deadline);
  return exactDeadline ? dayjs(exactDeadline).format("HH:mm - DD/MM/YYYY") : "---";
})()}</DocumentValue>
                              </DocumentInfoRow>
                              {task.content && (
                                <DocumentInfoRow>
                                  <DocumentLabel>Nội dung</DocumentLabel>
                                  <DocumentValue preLine>: {task.content}</DocumentValue>
                                </DocumentInfoRow>
                              )}
                            </FlexOneBox>
                            <Button
                              variant="contained"
                              component="label"
                              startIcon={<CloudUploadIcon />}
                              size="small"
                            >
                              Chọn
                              <FileUploadInput 
                                taskId={taskId}
                                onFileSelect={handleFileSelect}
                              />
                            </Button>
                          </FlexSpaceBetweenBox>

                          {/* Bảng danh sách tệp đã chọn */}
                          {taskFiles[taskId]?.length > 0 && (
                            <>
                              <SectionSubtitle variant="subtitle2" small greyText>
                                Danh sách tệp tải lên
                              </SectionSubtitle>
                              <StyledTableContainer component={Paper}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <StyledHeaderCellWithWidth>STT</StyledHeaderCellWithWidth>
                                    <StyledHeaderCell>Tên file</StyledHeaderCell>
                                    <StyledHeaderCell align="center">Tài liệu chỉ xem</StyledHeaderCell>
                                    <StyledHeaderCell align="center">Tài liệu thu hồi</StyledHeaderCell>
                                    <StyledHeaderCell align="center">Hành động</StyledHeaderCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {taskFiles[taskId].map((fileItem, fIdx) => (
                                    <FileRow
                                      key={fIdx}
                                      fileItem={fileItem}
                                      fileIndex={fIdx}
                                      taskId={taskId}
                                      onToggleImportant={handleToggleImportant}
                                      showRecall
                                      onToggleRecall={handleToggleRecall}
                                      onRemoveFile={handleRemoveFile}
                                    />
                                  ))}
                                </TableBody>
                              </Table>
                            </StyledTableContainer>
                            </>
                          )}
                        </DocumentBox>
                      )
                    }) : (
                      <EmptyStateText>Chưa có yêu cầu chuẩn bị tài liệu họp</EmptyStateText>
                    )}
                  </BoxMarginTop2>
                )}
                {/* <NavigationContainer mt={4}>
                  <BlueButtonOutline onClick={handleBackToStep1}>Quay lại</BlueButtonOutline>
                  <StyledPrimaryButton variant="contained" onClick={handleNextStep3}>
                    Tiếp theo: Hoàn thành
                  </StyledPrimaryButton>
                </NavigationContainer> */}
              </StyledBoxContainerContent>
                <Box>
                    <RegisterForMeetingRooms 
                  control={control} 
                  errors={errors} 
                  sharedComponents={sharedComponents} 
                  selectedUnits={selectedUnits}
                  onOpenParticipatingUnits={handleOpenParticipatingUnits}
                  isView={!isProcessingAction}
                  isProcessing
                  isProcessingAction={isProcessingAction}
                  initialRooms={meetingData?.roomIds?.length ? meetingData.roomIds : [{ id: 'strongboy', name: 'PHÒNG HỌP STRONGBOY', capacity: 50, image: '', stage: 'Sẵn sàng' }]}
                  leftPanelTitle="DANH SÁCH CÁ NHÂN THAM DỰ"
                  assignOnlyRoom={meetingData?.assignOnlyRoom}
                  assignOnlySecretary={meetingData?.assignOnlySecretary}
                  assignRoomAndSecretary={meetingData?.assignRoomAndSecretary}
                />
                </Box>
              </>
            )}

            <ParticipatingUnits
              open={openParticipatingUnits}
              onClose={handleCloseParticipatingUnits}
              onSave={handleParticipatingUnitsSave}
              initialSelectedUnits={selectedUnits}
              dialogKey="internalUnit"
              control={control}
              isProcessing
              hideRoles={(() => {
                const roles = ['chair'];
                if (meetingData?.assignOnlySecretary) {
                  roles.push('participant');
                } else if (meetingData?.assignRoomAndSecretary) {
                  // Show secretary and participant (only hide chair)
                } else {
                  // Default behavior: hide secretary and chair (only show participant)
                  roles.push('secretary');
                }
                return roles;
              })()}
              excludeMeetingId={meetingId}
            />

            <PrepareDocuments
              open={openPrepareDocs}
              onClose={handleClosePrepareDocs}
              onSave={handlePrepareDocsSave}
              targetName={docAssignee ? (docAssignee.title || docAssignee.name) : ""}
              sharedComponents={sharedComponents}
            />

            <CustomDialog
                open={openDeleteDialog}
                onClose={handleCloseLockConfirm}
                onSave={handleConfirmDeleteFile}
                title="Xác nhận xóa tài liệu"
    titleButton="Xác nhận"
                isLoading={isLoading}
            >
              <SkyBox>
                      <SkyTypography>
                        Bạn xác nhận xoá file này không.
                      </SkyTypography>
                    </SkyBox>
        </CustomDialog>
              <CustomDialog
                open={openClearConfirm}
                onClose={handleCloseClearConfirm}
                onSave={handleSubmit(onSubmit)}
                title="Xác nhận lưu xử lý"
                titleButton="Xác nhận"
                isLoading={isLoading}
              >
                <SkyBox>
                    <SkyTypography>
                         Xác nhận lưu xử lý lịch họp,lịch họp sẽ gửi đến người tham gia 
                    </SkyTypography>
                </SkyBox>
              </CustomDialog>
        
      </JobMainContent>
    </BaseSwipper>
  );
};

export default withSharedComponents(HandleMeetingSchedules);
