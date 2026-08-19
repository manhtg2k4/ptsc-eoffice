import React, { useEffect, useCallback } from "react";
import {

  Checkbox,
  
  TableCell,

  TableRow,

} from "@mui/material";
import {  useForm } from "react-hook-form";
// import {
//   getCommentsByDocument,
// } from "@redux/slices/SharedCategory/managementUnitSlice";
// import CustomComment from "@components/CustomComment";
import DeleteIcon from "@mui/icons-material/Delete";


// import {
//   StyleBoxComent,
//   StyledGridCustomComment,
// } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
// import FormButton from "@components/FormButton";
// import { typeFlagMap } from "@components/FormButton/constant";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import {
 
  JobMainContent,
  

  // BoardSection,
  // BoardGrid,
  // BoardCard,
  // BoardIconBox,
  // BoardInfo,
  // BoardLabel,
  // BoardName,
  // BoardTitle,
  // AttendanceSection,
 
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
//   TaskTitle,
  // StatsSummary,
  StatText,
  DepartmentStats,
//   ParticipantHeaderBox,
  // GreenButtonOutline,
  BlueButtonOutline,
  FlexCenterGap16,
  FlexGap8,
  // FlexGrowBox,
  // BoldSubtitle,
  GreyCaptionWithMargin,
  StyleBoxButton,
//   BoxMarginTop2,
//   FlexSpaceBetweenBox,
//   FlexOneBox,
//   StyledTableContainer,
//   StyledHeaderCell,
//   StyledHeaderCellWithWidth,
  ErrorIconButton,
  // NavigationContainer,
  // CompletionBox,
  // CenterActions,
  // StyledPrimaryButton,
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
// import { useDispatch } from "react-redux";
// import PersonIcon from "@mui/icons-material/Person";

// import EditIcon from "@mui/icons-material/Edit";
// import AddIcon from "@mui/icons-material/Add";
// import DescriptionIcon from "@mui/icons-material/Description";
// import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import ParticipatingUnits from "./ParticipatingUnits";
import RegisterForMeetingRooms from "./RegisterForMeetingRooms";
import PrepareDocuments from "./PrepareDocuments";
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

const MemberItem = React.memo(({ member, onAddTaskToMember }) => {
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
const FileUploadInput = React.memo(({ taskId, onFileSelect }) => {
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
const FileRow = React.memo(({ fileItem, fileIndex, taskId, onToggleImportant, onRemoveFile }) => {
  const handleToggle = useCallback(() => {
    onToggleImportant(taskId, fileIndex);
  }, [taskId, fileIndex, onToggleImportant]);

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


const AttendanceGroupItem = React.memo(({ 
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


const ActionButton = React.memo(({ action, onClick, disabled }) => {
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


const ProcessManagementSchedule = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  // title = "Xử lý lịch họp",
  meetingId,
//   ishandlermeeting = false,
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

  const [isLoading, setIsLoading] = React.useState(false);
  const [meetingData, setMeetingData] = React.useState(null);
 
  const [selectedRooms, setSelectedRooms] = React.useState([]);
  const [openParticipatingUnits, setOpenParticipatingUnits] = React.useState(false);
  const [selectedUnits, setSelectedUnits] = React.useState([]);
  const [openPrepareDocs, setOpenPrepareDocs] = React.useState(false);
  const [docAssignee, setDocAssignee] = React.useState(null);
  const [workItem, setWorkItem] = React.useState(null);
//   const [meetingTasks, setMeetingTasks] = React.useState([]);
  // const [availableActions, setAvailableActions] = React.useState([]);
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);

  const [editingTask, setEditingTask] = React.useState(null); 
  
  const toast = useToast();
//   const dispatch = useDispatch();

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
    const isSeatAssignment = data.isSeatAssignment;

    const chairInfo = (data.chairman && data.chairman.length > 0) ? data.chairman[0] : null;
    const secInfo = (data.secretary && data.secretary.length > 0) ? data.secretary[0] : null;

    const targetChairId = (chairInfo?.userId || data.chairmanId || "").toString().trim();
    const targetSecId = (secInfo?.userId || data.secretaryId || "").toString().trim();

    if (isSeatAssignment && data.units ) {
      const pInRoom = data.units ;
      const peopleData = Array.isArray(pInRoom) ? pInRoom : (pInRoom.unitId ? [pInRoom] : Object.values(pInRoom).filter(v => v && typeof v === 'object' && v.unitId));
      
      peopleData.forEach(u => {
        const unitId = u.unitId;
        const unitName = u.unitName;
        
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
        };
        units.push(unitPrototype);

        const membersList =  u.participants || u.members;
        if (Array.isArray(membersList)) {
          membersList.forEach(p => {
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
            const pId = (p.userId || "").toString().trim();
            const pUserId = (p.userId || "").toString().trim();
            
            const isChair = (pId === targetChairId || pUserId === targetChairId);
            const isSec = (pId === targetSecId || pUserId === targetSecId);
            const roleInfo = isChair ? chairInfo : (isSec ? secInfo : null);

            units.push({
              id: p.userId,
              _id: p.userId,
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
                if (info.userName) {
                    existingRoleEntry.name = info.userName;
                    existingRoleEntry.title = info.userName;
                }
                if (info.delegateInfo) existingRoleEntry.delegateInfo = info.delegateInfo;
            }
        } else {
            units.push({
                id: userId,
                _id: userId,
                userId: userId,
                name: info?.userName || userId,
                title: info?.userName || userId,
                types: (info?.type === 'UNIT' || info?.secretaryType === 'UNIT') ? 'organization_unit' : 'user',
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

    // Xử lý khách mời (guests)
    if (data.guests && Array.isArray(data.guests) && data.guests.length > 0) {
      units.push({
        id: 'GUEST_GROUP',
        name: 'Khách mời',
        types: 'guest_group',
        roles: { participant: true },
        members: data.guests.map(g => ({
          id: g.id || g._id,
          _id: g.id || g._id,
          name: g.guestName,
          title: g.guestName,
          guestName: g.guestName,
          position: g.guestTitle,
          guestTitle: g.guestTitle,
          types: 'guest',
          roles: { participant: true },
          parent: 'GUEST_GROUP',
          parentName: 'Khách mời',
          seatNumber: g.seatNumber,
          roomId: g.roomId,
          status: 'ACCEPTED'
        }))
      });
    }

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
          // setAvailableActions(response.availableActions || []);
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
          
          if (data.roomIds) {
             setSelectedRooms(data.roomIds);
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

  useEffect(() => {
    fetchMeetingDetails();
  }, [fetchMeetingDetails]);

//   useEffect(() => {
//     const fetchMeetingTasks = async () => {
//       if (open && meetingId) {
//         try {
//           const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/unit-tasks?includeComments=true`);
//           if (Array.isArray(response)) {
//             setMeetingTasks(response);
//           } else if (response?.success && response?.data) {
//             setMeetingTasks(response.data);
//           }
//         } catch (error) {
//           logger.error("Error fetching meeting tasks:", error);
//         }
//       }
//     };
//     fetchMeetingTasks();
//   }, [open, meetingId]);

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

//   useEffect(() => {
//     if (open && meetingId) {
//       dispatch(getCommentsByDocument({ documentId: meetingId, type: "outgoing" }));
//     }
//   }, [open, meetingId, dispatch]);




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

  const handleRoomChange = useCallback((rooms) => {
    setSelectedRooms(rooms);
  }, []);
  

  // const handleProcessingAction = useCallback(async (type) => {
  //   if (type === 'process_meeting') {
  //     try {
  //       await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/unit-processing`);
  //       setIsProcessingAction(true);
  //     } catch (error) {
  //       toast(error?.response?.data?.message || "Lỗi khi xử lý lịch họp", "error");
  //     }
  //   }
  // }, [meetingId, toast]);

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
//   useEffect(() => {
//     if (open && meetingId) {
//       dispatch(getCommentsByDocument({ documentId: meetingId, type: "outgoing" }));
//     }
//   }, [open, meetingId, dispatch]);

  // Fetch specialized meeting tasks (UNIT type)


  // Handlers for participant assignment and sync moved to earlier sections where relevant components are initialized.


  const onSubmit = async () => {
    setIsLoading(true);

    try {
      if (meetingId) {
        // Handle Seat Assignment Patch (Always call in ProcessManagement context as per user request)
        const unitMap = {};
        selectedUnits.forEach(item => {
          const isUnit = item.types === 'organization_unit';
          const isParticipant = !!item.roles?.participant;
          const itemId = item.userId;
          const uId = isUnit ? itemId : (item.parent || item.unitId || item.receiverUnitId);
          
          if (!uId) return;

          if (!unitMap[uId]) {
            unitMap[uId] = { 
              unitId: uId, 
              participants: [],
              sittingPosition: [],
              tasks: []
            };
          }
          if (isUnit) {
            unitMap[uId].isRoomSelected = isParticipant;
          } else if (unitMap[uId].isRoomSelected !== true) {
            unitMap[uId].isRoomSelected = false;
          }

          if (isUnit && item.seatNumber) {
            const rId = item.roomId;
            if (rId) {
              let roomPos = unitMap[uId].sittingPosition.find(p => p.roomId === rId);
              if (!roomPos) {
                roomPos = { roomId: rId, seatNumber: [] };
                unitMap[uId].sittingPosition.push(roomPos);
              }
              if (!roomPos.seatNumber.includes(item.seatNumber)) {
                roomPos.seatNumber.push(item.seatNumber);
              }
            }
          }

          if (!isUnit && item.roles?.participant) {
              unitMap[uId].participants.push({
                  userId: itemId,
                  seatNumber: item.seatNumber || null,
                  roomId: item.roomId || null,
                  tasks: (item.tasks || []).map(t => ({
                      attachableType: "PARTICIPANT",
                      content: t.content || "",
                      documentName: t.documentName || "",
                      deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
                  }))
              });
          }

          if (isUnit && item.tasks && item.tasks.length > 0 && unitMap[uId].tasks.length === 0) {
              unitMap[uId].tasks = item.tasks.map(t => ({
                  attachableType: "UNIT",
                  content: t.content || "",
                  documentName: t.documentName || "",
                  deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
              }));
          }
        });

        const chairmanUser = selectedUnits.find(u => u.roles?.chair);
        const secretaryUser = selectedUnits.find(u => u.roles?.secretary);

        // const mapRoleInfo = (user, roleStr) => {
        //   if (!user) return null;
        //   const uId = user.userId;
        //   return {
        //     userId: uId,
        //     tasks: (user.tasks || []).map(t => ({
        //       attachableType: "ROLE",
        //       attachableId: uId,
        //       attachableRole: roleStr,
        //       content: t.content || "",
        //       documentName: t.documentName || "",
        //       deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
        //     })),
        //     roomId: user.roomId || (meetingData?.roomIds?.[0]?.id) || null,
        //     seatNumber: user.seatNumber || null
        //   };
        // };

        const participantsPayload = {
          action:{
          actionCode:actionCode.code,
          workItem:workItem,

          },
          participants: [
            // Chairman
            ...(chairmanUser ? [{
              userId: chairmanUser.userId || chairmanUser.id || chairmanUser._id,
              seatNumber: chairmanUser.seatNumber || null,
              participantRole: "chairman",
              roomId: chairmanUser.roomId || (meetingData?.roomIds?.[0]?.id) || null,
            }] : []),
            // Secretary
            ...(secretaryUser ? [{
              userId: secretaryUser.userId || secretaryUser.id || secretaryUser._id,
              seatNumber: secretaryUser.seatNumber || null,
              participantRole: "secretary",
              roomId: secretaryUser.roomId || (meetingData?.roomIds?.[0]?.id) || null,
            }] : []),
            // Regular participants
            ...selectedUnits
              .filter(u => u.types === 'user' && u.roles?.participant && !u.roles?.chair && !u.roles?.secretary)
              .map(u => ({
                userId: u.userId || u.id || u._id,
                seatNumber: u.seatNumber || null,
                participantRole: "attendee",
                roomId: u.roomId || (meetingData?.roomIds?.[0]?.id) || null,
              })),
            // Guests
            ...(selectedUnits.find(u => u.types === 'guest_group')?.members?.map(m => ({
              guestId: m.id || m._id,
              guestName: m.guestName || null,
              seatNumber: m.seatNumber || null,
              roomId: m.roomId || (meetingData?.roomIds?.[0]?.id) || null,
            })) || [])
          ]
        };

        if (selectedRooms && selectedRooms.length > 0) {
            participantsPayload.roomIds = selectedRooms.map(r => r.id || r._id);
        }

        await axiosInstance.patch(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/replace-participants`, participantsPayload);

        // Note: Task file uploads are now handled immediately in handleFileSelect

        toast("Cập nhật thông tin thành công!", "success");
        // onSuccess?.();
        
        // Refresh detail to make sure everything is in sync before closing (optional but good)
        await fetchMeetingDetails();
        onClose();
        return;
      }

      // 1. Phân loại người tham gia từ selectedUnits
      // const chairman = selectedUnits.find(u => u.roles?.chair);
      // const secretary = selectedUnits.find(u => u.roles?.secretary);
      
      // Xây dựng danh sách units và participants
      const unitMap = {};

      selectedUnits.forEach(item => {
        const isUnit = item.types === 'organization_unit';
        const isParticipant = !!item.roles?.participant;
        const uId = isUnit ? (item.id || item._id) : item.parent;
        
        if (!uId) return;

        if (!unitMap[uId]) {
          unitMap[uId] = { 
            unitId: uId, 
            participants: [], 
            tasks: [] 
          };
        }
        if (isUnit) {
          unitMap[uId].isRoomSelected = isParticipant;
        } else if (unitMap[uId].isRoomSelected !== true) {
          unitMap[uId].isRoomSelected = false;
        }

        // Nếu là đơn vị và đơn vị đó được gán ghế
        if (isUnit && item.seatNumber && item.roomId) {
          if (!unitMap[uId].sittingPosition) unitMap[uId].sittingPosition = [];
          
          let roomPos = unitMap[uId].sittingPosition.find(p => p.roomId === item.roomId);
          if (!roomPos) {
            roomPos = { roomId: item.roomId, seatNumber: [] };
            unitMap[uId].sittingPosition.push(roomPos);
          }
          if (!roomPos.seatNumber.includes(item.seatNumber)) {
            roomPos.seatNumber.push(item.seatNumber);
          }
        }

        // Xử lý cá nhân tham gia
        if (!isUnit && item.roles?.participant) {
            unitMap[uId].participants.push({
                userId: item.id || item._id,
                seatNumber: item.seatNumber || null,
                roomId: item.roomId || null,
                tasks: (item.tasks || []).map(t => ({
                    attachableType: "PARTICIPANT",
                    content: t.content || "",
                    documentName: t.documentName || "",
                    deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
                }))
            });
        }

        // Xử lý chuẩn bị tài liệu (tasks) cho đơn vị
        if (isUnit && item.tasks && item.tasks.length > 0 && unitMap[uId].tasks.length === 0) {
            const mappedTasks = item.tasks.map(t => ({
                attachableType: "UNIT",
                content: t.content || "",
                documentName: t.documentName || "",
                deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
            }));
            unitMap[uId].tasks.push(...mappedTasks);
        }
      });

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
      onClose();
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
  // const dataForFormButton = React.useMemo(() => {
  //   // Flatten available actions
  //   let flatActions = [];
  //   if (availableActions && Array.isArray(availableActions)) {
  //     availableActions.forEach(action => {
  //       if (action.subActions && Array.isArray(action.subActions) && action.subActions.length > 0) {
  //         action.subActions.forEach(sub => {
  //           if (sub.actions && Array.isArray(sub.actions)) {
  //             flatActions = [...flatActions, ...sub.actions];
  //           }
  //         });
  //       } else {
  //         flatActions.push(action);
  //       }
  //     });
  //   }

  //   // If already in processing mode, hide the process_meeting action
  //   if (isProcessingAction) {
  //       flatActions = flatActions.filter(a => a.type !== 'process_meeting');
  //   }

  //   // Generate flags dynamically based on types
  //   const flags = {};
  //   flatActions.forEach(a => {
  //       const flagName = typeFlagMap[a.type];
  //       if (flagName) flags[flagName] = true;
  //   });

  //   return {
  //       ...meetingData, 
  //       workItem: workItem,
  //       meetingId: meetingId, // FormButton uses this
  //       availableActions: flatActions,
  //       flags: {
  //           ...flags,
  //       }
  //   };
  // }, [availableActions, meetingData, meetingId, workItem, isProcessingAction]);


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
                  onClick={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  variant="outlined"
                >
                  Lưu
                </ButtonOutline>
              </StyleBoxButton>
            
           {/* <FormButton
              dataDetail={dataForFormButton}
              setReloadData={onSuccess} 
              onClose={onClose}
              disabled={isLoading}
              sharedComponents={sharedComponents}
              onAction={handleProcessingAction}
           /> */}
        </FlexGap8>
      }
    >
   
      

      <JobMainContent>
  
                <RegisterForMeetingRooms 
                  control={control} 
                  errors={errors} 
                  sharedComponents={sharedComponents} 
                  selectedUnits={selectedUnits}
                  onOpenParticipatingUnits={handleOpenParticipatingUnits}
                  isView={!isProcessingAction}
                  isSeatAssignment={meetingData?.isSeatAssignment}
                  isProcessingAction={isProcessingAction}
                  initialRooms={meetingData?.roomIds?.length ? meetingData.roomIds : [{ id: 'strongboy', name: 'PHÒNG HỌP STRONGBOY', capacity: 50, image: '', stage: 'Sẵn sàng' }]}
                  leftPanelTitle="GÁN NGƯỜI ĐƠN VỊ THAM GIA"
                  onRoomChange={handleRoomChange}
          onUpdateParticipants={setSelectedUnits}
          meetingId={meetingId}
          meetingData={meetingData}
          onSuccess={onSuccess}
          hideSeatingDiagram={true}
        />
            <ParticipatingUnits
              open={openParticipatingUnits}
              onClose={handleCloseParticipatingUnits}
              onSave={handleParticipatingUnitsSave}
              initialSelectedUnits={selectedUnits}
              dialogKey="internalUnit"
              control={control}
              isSeatAssignment={meetingData?.isSeatAssignment}
              hideRoles={['chair', 'secretary']}
              excludeMeetingId={meetingId}
            />

            <PrepareDocuments
              open={openPrepareDocs}
              onClose={handleClosePrepareDocs}
              onSave={handlePrepareDocsSave}
              targetName={docAssignee ? (docAssignee.title || docAssignee.name) : ""}
              sharedComponents={sharedComponents}
            />
        
        
      </JobMainContent>
    </BaseSwipper>
  );
};

export default withSharedComponents(ProcessManagementSchedule);  
