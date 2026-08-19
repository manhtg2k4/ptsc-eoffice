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
// import FormButton from "@components/FormButton";
// import { typeFlagMap } from "@components/FormButton/constant";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE, API_UPDATE_MEETING_STATUS, APP_BASE, API_MARK_IMPORTANT_DOCUMENT, API_UPDATE_MEETING_PERSONAL_PROCESSING } from "@EnvironmentFile/constants/urlConfig";
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
  
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
import { useDispatch } from "react-redux";

// import ParticipatingUnits from "./ParticipatingUnits";
// import RegisterForMeetingRooms from "./RegisterForMeetingRooms";
// import PrepareDocuments from "./PrepareDocuments";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

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
            <DocumentValue>: {task.deadline 
              ? dayjs(task.deadline).format("HH:mm - DD/MM/YYYY") 
              : "---"}
            </DocumentValue>
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
                    <DocumentValue>: {task.deadline 
                      ? dayjs(task.deadline).format("HH:mm - DD/MM/YYYY") 
                      : "---"}
                    </DocumentValue>
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


const ManagePersonalMeetingSchedules = ({
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
//   const [openParticipatingUnits, setOpenParticipatingUnits] = React.useState(false);
  // const [selectedUnits, setSelectedUnits] = React.useState([]);
//   const [openPrepareDocs, setOpenPrepareDocs] = React.useState(false);
//   const [docAssignee, setDocAssignee] = React.useState(null);
  const [workItem, setWorkItem] = React.useState(null);
  const [isTasksExpanded, setIsTasksExpanded] = React.useState(true);
  const [meetingTasks, setMeetingTasks] = React.useState([]);
//   const [availableActions, setAvailableActions] = React.useState([]);
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
//   const [editingTask, setEditingTask] = React.useState(null); 
  const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
  const [fileToDelete, setFileToDelete] = React.useState(null);
  // const [openClearConfirm, setOpenClearConfirm] = React.useState(false);
  
  const toast = useToast();
  const dispatch = useDispatch();

  const {
   
    handleSubmit,
  
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
          name: unitName,
          title: unitName,
          types: 'organization_unit',
          roles: { participant: true },
          tasks: u.tasks || [],
          isConfirmed: u.isUnitConfirmed !== undefined ? u.isUnitConfirmed : u.isConfirmed,
          status: u.isUnitConfirmed === true ? 'ACCEPTED' : (u.isUnitConfirmed === false ? 'REJECTED' : (u.status || u.unitState)),
        };
        units.push(unitPrototype);

        if (Array.isArray(u.members)) {
          u.members.forEach(p => {
            const pId = (p.userId || p.id || "").toString().trim();
            const isChair = pId === targetChairId;
            const isSec = pId === targetSecId;

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
              isAssigned: p.isAssigned
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
        
        const existing = units.find(u => u.id?.toString().trim() === userId);
        if (existing) {
            existing.roles[roleKey] = true;
            existing.roles.participant = false;
            if (info) {
                existing.seatNumber = info.seatNumber || existing.seatNumber;
                existing.roomId = info.roomId || existing.roomId;
                existing.tasks = info.tasks || existing.tasks;
                if (info.userName) {
                    existing.name = info.userName;
                    existing.title = info.userName;
                }
                if (info.delegateInfo) existing.delegateInfo = info.delegateInfo;
            }
        } else {
            units.push({
                id: userId,
                _id: userId,
                name: info?.userName || userId,
                title: info?.userName || userId,
                types: 'user',
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
        //   setAvailableActions(response.availableActions || []);
          setWorkItem(response.workItem || null);
          
          // const reconstructed = reconstructSelectedUnits(data);
          // setSelectedUnits(reconstructed);

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

    // const handleCloseClearConfirm = React.useCallback(() => {
    //     setOpenClearConfirm(false);
    //   }, []);

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

    // const onSubmits = React.useCallback(() => {
    //   setOpenClearConfirm(true);
    // }, []);

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

      if ((ishandlermeeting || isProcessingAction) && meetingId) {
        const statusPayload = {
          meetingId: meetingId,
          acceptJoin: true,
          assignParticipants: true,
          prepareDocuments: true
        };
        await axiosInstance.post(API_UPDATE_MEETING_STATUS, statusPayload);
        await fetchMeetingDetails();
      }

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

//   const handleOpenParticipatingUnits = useCallback(() => {
//     setOpenParticipatingUnits(true);
//   }, []);

//   const handleCloseParticipatingUnits = useCallback(() => {
//     setOpenParticipatingUnits(false);
//   }, []);

//   const handleParticipatingUnitsSave = useCallback((newResults) => {
//     setSelectedUnits(newResults);
//     handleCloseParticipatingUnits();
//   }, [handleCloseParticipatingUnits]);


  
  const handleToggleTasksExpanded = useCallback(() => {
    setIsTasksExpanded((prev) => !prev);
  }, []);

//   const handleProcessingAction = useCallback(async (type) => {
//     if (type === 'process_meeting') {
//       try {
//         await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/unit-processing`);
//         setIsProcessingAction(true);
//       } catch (error) {
//         toast(error?.response?.data?.message || "Lỗi khi xử lý lịch họp", "error");
//       }
//     }
//   }, [meetingId, toast]);

//   const handleClosePrepareDocs = useCallback(() => {
//     setOpenPrepareDocs(false);
//     setDocAssignee(null);
//     setEditingTask(null);
//   }, []);

//   const handlePrepareDocsSave = useCallback((docData) => {
//     if (!docAssignee) return;

//     setSelectedUnits(prev => {
//       const assigneeId = docAssignee.id || docAssignee._id;
//       const exists = prev.some(item => (item.id || item._id) === assigneeId);

//       if (exists) {
//         return prev.map(item => {
//           if ((item.id || item._id) === assigneeId) {
//             const currentTasks = item.tasks || [];
            
//             // Nếu đang edit, thay thế task tại vị trí taskIndex
//             if (editingTask !== null && editingTask.taskIndex !== undefined) {
//               const updatedTasks = [...currentTasks];
//               updatedTasks[editingTask.taskIndex] = docData;
//               return { ...item, tasks: updatedTasks };
//             }

//             // Nếu không thì thêm mới
//             return {
//               ...item,
//               tasks: [...currentTasks, docData]
//             };
//           }
//           return item;
//         });
//       } else {
//         return [...prev, { ...docAssignee, tasks: [docData] }];
//       }
//     });

//     handleClosePrepareDocs();
//   }, [docAssignee, editingTask, handleClosePrepareDocs]);





  const steps = [
    { id: 1, label: "Upload tài liệu họp" },
    { id: 2, label: "Hoàn thành" }
  ];


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
        // setSelectedUnits([]);
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
          const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/my-tasks?includeComments=true`);
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
      if (!actionCode) {
        toast("Không xác định được mã hành động", "error");
        return;
      }

      const payload = {
        actionCode,
        workItem: workItem || {}, 
        meetingId: meetingId || "",
      };

      await axiosInstance.post(`${API_UPDATE_MEETING_PERSONAL_PROCESSING}`, payload);
      toast("Lưu xử lý lịch họp thành công!", "success");
      onSuccess?.();
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
//   const dataForFormButton = React.useMemo(() => {
//     // Flatten available actions
//     let flatActions = [];
//     if (availableActions && Array.isArray(availableActions)) {
//       availableActions.forEach(action => {
//         if (action.subActions && Array.isArray(action.subActions) && action.subActions.length > 0) {
//           action.subActions.forEach(sub => {
//             if (sub.actions && Array.isArray(sub.actions)) {
//               flatActions = [...flatActions, ...sub.actions];
//             }
//           });
//         } else {
//           flatActions.push(action);
//         }
//       });
//     }

//     // If already in processing mode, hide the process_meeting action
//     if (isProcessingAction) {
//         flatActions = flatActions.filter(a => a.type !== 'process_meeting');
//     }

//     // Generate flags dynamically based on types
//     const flags = {};
//     flatActions.forEach(a => {
//         const flagName = typeFlagMap[a.type];
//         if (flagName) flags[flagName] = true;
//     });

//     return {
//         ...meetingData, 
//         workItem: workItem,
//         meetingId: meetingId, // FormButton uses this
//         availableActions: flatActions,
//         flags: {
//             ...flags,
//         }
//     };
//   }, [availableActions, meetingData, meetingId, workItem, isProcessingAction]);


  const getCorrectDeadline = useCallback((taskId, defaultDeadline) => {
    if (!meetingData) return defaultDeadline;
    let foundDeadline = null;
    const checkTasks = (tasksArr) => {
      if (!tasksArr || !Array.isArray(tasksArr)) return;
      const match = tasksArr.find(t => (t.id || t._id) === taskId);
      if (match && match.deadline) foundDeadline = match.deadline;
    };
    // Tìm trong peopleInRoom
    if (meetingData.peopleInRoom) {
      const pInRoom = meetingData.peopleInRoom;
      const arr = Array.isArray(pInRoom) ? pInRoom : (pInRoom.unitId ? [pInRoom] : Object.values(pInRoom).filter(v => v && typeof v === 'object' && v.unitId));
      arr.forEach(u => checkTasks(u.tasks));
    }
    // Tìm trong units
    if (!foundDeadline && meetingData.units) {
      meetingData.units.forEach(u => checkTasks(u.tasks));
    }
    // Tìm trong chairman tasks
    if (!foundDeadline && meetingData.chairman) {
      meetingData.chairman.forEach(c => checkTasks(c.tasks));
    }
    // Tìm trong secretary tasks
    if (!foundDeadline && meetingData.secretary) {
      meetingData.secretary.forEach(s => checkTasks(s.tasks));
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
        <Box mb={4} mt={1}>
          <CustomStepper
            steps={steps}
            activeStep={activeStep}
            onStepClick={setActiveStep}
            alternativeLabel={false}
            disabledSteps={{ [steps.length - 1]: true }}
          />
        </Box>
    

       

            {/* BƯỚC 3: UPLOAD TÀI LIỆU HỌP */}
            {activeStep === 0 && (
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
             
              </StyledBoxContainerContent>
              </>
            )}


            {activeStep === 1 && (
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
              </>
            )}

            {/* <ParticipatingUnits
              open={openParticipatingUnits}
              onClose={handleCloseParticipatingUnits}
              onSave={handleParticipatingUnitsSave}
              initialSelectedUnits={selectedUnits}
              dialogKey="internalUnit"
              control={control}
              isProcessing={true}
              hideRoles={['chair', 'secretary']}
              excludeMeetingId={meetingId}
            />

            <PrepareDocuments
              open={openPrepareDocs}
              onClose={handleClosePrepareDocs}
              onSave={handlePrepareDocsSave}
              targetName={docAssignee ? (docAssignee.title || docAssignee.name) : ""}
              sharedComponents={sharedComponents}
            /> */}

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
              {/* <CustomDialog
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
              </CustomDialog> */}
        
      </JobMainContent>
    </BaseSwipper>
  );
};

export default withSharedComponents(ManagePersonalMeetingSchedules);
