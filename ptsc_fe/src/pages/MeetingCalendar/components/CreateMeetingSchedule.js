import React, { useEffect, useCallback, useRef, useMemo } from "react";
import {
  Grid,
  Typography,
  FormControlLabel,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { withFormWrapper } from "@components/common/FormWrapper";
import * as yup from "yup";
import { 
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE, API_CHECK_DUPLICATE_MEETING_ROOM } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { 
  FlexGrowBox,
  FooterActions
} from "@styles/BaseSwiper/BaseSwiper.style";
import {
 
  JobMainContent,
  
  JobSectionTitle,
  StyledBoxContainerContent,
  // ParticipantHeader,
  // ParticipantStats,
  // StatItem,
  // BoardSection,
  // BoardGrid,
  // BoardCard,
  // BoardIconBox,
  // BoardInfo,
  // BoardLabel,
  // BoardName,
  // BoardTitle,
  // AttendanceSection,
  // EmptyStateText,
  DepartmentAccordion,
  DepartmentHeader,
  DepartmentTitle,
  DepartmentName,
  ActionLink,
  DepartmentContent,
  ParticipantRow,
  // DocumentBox,
  // DocumentTitle,
  // DocumentInfoRow,
  // DocumentLabel,
  // DocumentValue,
  // EditParticipantButton,
  SectionSubtitle,
  // StatDivider,
  ParticipantName,
  StyledAddIcon,
  // DocumentHeaderBox,
  // DocumentActionIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StyleBoxButton,
  LightTooltip,
  TaskIconsContainer,
  TaskActionLink,
  TaskAddIcon,
  TooltipContentBox,
  TooltipTitle,
  TaskCountText,
  TaskFileIcon,
  TaskExpandToggleText,
  // SectionHeaderContainer,
  BoldCompanyLabel,
  CompanyCheckbox,
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
import { useDispatch, useSelector } from "react-redux";
// import PersonIcon from "@mui/icons-material/Person";

// import EditIcon from "@mui/icons-material/Edit";
// import AddIcon from "@mui/icons-material/Add";
// import DescriptionIcon from "@mui/icons-material/Description";
import ParticipatingUnits from "./ParticipatingUnits";
import RegisterForMeetingRooms from "./RegisterForMeetingRooms";
import PrepareDocuments from "./PrepareDocuments";
import FormButton from "@components/FormButton";
import { typeFlagMap } from "@components/FormButton/constant";
import { getMeetingActions } from "@redux/slices/SharedCategory/managementUnitSlice";
import RecurringMeetingConfigModal from "./RecurringMeetingConfigModal";
import { getAllErrorMessages, meetingContentSchema, meetingTitleSchema } from "./constants";
// import { SkyBox, SkyTypography } from "@styles/SkyStyles";

const TaskIcons = ({ tasks, onAdd }) => {
  const displayTasks = tasks || [];
  const hasTasks = displayTasks.length > 0;
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleAddClick = useCallback((e) => {
    e.stopPropagation();
    onAdd?.();
  }, [onAdd]);

  const handleToggleExpand = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  if (!hasTasks) {
    return (
      <ActionLink onClick={handleAddClick}>
        <StyledAddIcon />
        Giao chuẩn bị tài liệu
      </ActionLink>
    );
  }

  const tasksToShow = isExpanded ? displayTasks : displayTasks.slice(0, 3);

  return (
    <TaskIconsContainer onClick={handleStopPropagation}>
       <TaskActionLink onClick={onAdd}>
          <TaskAddIcon />
       </TaskActionLink>
       {tasksToShow.map((task, idx) => (
         <LightTooltip
            key={idx}
            title={
              <TooltipContentBox>
                 <TooltipTitle variant="body2">Tài liệu : {task.documentName}</TooltipTitle>
                 <Typography variant="body2">Thời hạn : {dayjs(task.deadline).format("HH:mm - DD/MM/YYYY")}</Typography>
                 {task.content && <Typography variant="body2">Nội dung : {task.content}</Typography>}
              </TooltipContentBox>
            }
            arrow
            placement="top"
         >
            <TaskFileIcon />
         </LightTooltip>
       ))}
       {displayTasks.length > 3 && !isExpanded && (
         <TaskCountText 
           variant="caption" 
           onClick={handleToggleExpand}
         >
           +{displayTasks.length - 3}
         </TaskCountText>
       )}
       {isExpanded && displayTasks.length > 3 && (
         <TaskExpandToggleText 
           variant="caption" 
           onClick={handleToggleExpand}
         >
           (ẩn)
         </TaskExpandToggleText>
       )}
    </TaskIconsContainer>
  );
};


const MemberItem = React.memo(({ member, onAddTaskToMember }) => {
  const handleAddTask = useCallback(() => {
    onAddTaskToMember(member);
  }, [member, onAddTaskToMember]);

  return (
    <React.Fragment>
      <ParticipantRow>
        <ParticipantName variant="body2">
          {member.title || member.name} {member.position ? `- ${member.position}` : ""}
        </ParticipantName>
        <TaskIcons 
          tasks={member.tasks} 
          onAdd={handleAddTask} 
        />
      </ParticipantRow>
    </React.Fragment>
  );
});
MemberItem.displayName = "MemberItem";


const AttendanceGroupItem = React.memo(({ 
  group, 
  groupId, 
  isExpanded, 
  onToggle, 
  onAddTaskToGroup, 
  onAddTaskToMember 
}) => {
  const handleToggle = useCallback(() => {
    onToggle(groupId);
  }, [groupId, onToggle]);

  const handleAddTask = useCallback((e) => {
    onAddTaskToGroup(e, group);
  }, [group, onAddTaskToGroup]);

  return (
    <DepartmentAccordion>
      <DepartmentHeader onClick={handleToggle}>
        <DepartmentTitle>
          <DepartmentName>{group.name}</DepartmentName>
          <TaskIcons 
            tasks={group.tasks} 
            onAdd={handleAddTask} 
          />
        </DepartmentTitle>
        {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </DepartmentHeader>
      {isExpanded && (
        <DepartmentContent>

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

const CreateMeetingSchedule = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Tạo lịch họp",

}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    // ButtonOutline,
    // AsyncAutoCompleted,
    DateTimePicker: BaseDateTimePicker,
    DatePicker: BaseDatePicker,

  } = sharedComponents;

   const InputComponents = React.useMemo(() => {
      return withFormWrapper(BaseInput, "input");
    }, [BaseInput]);
  
    const DatePicker = React.useMemo(() => {
      return withFormWrapper(BaseDatePicker, "date");
    }, [BaseDatePicker]);

    const DateTimePicker = React.useMemo(() => {
      return withFormWrapper(BaseDateTimePicker, "date");
    }, [BaseDateTimePicker]);
   	const dispatch = useDispatch();
   	const { crmSource } = useSelector((state) => state.config);
   	const { availableActions, meetingFlowConfig, meetingWorkItem } = useSelector((state) => state.unit);
  	const optionModeOfWork = useMemo(
    	() => crmSource.find((item) => item.code === "LICHDINHKY")?.data || [],
    	[crmSource]
  	);
  	const urgencyOptions = useMemo(
    	() => crmSource.find((item) => item.code === "DOUUTIENLH")?.data || [],
    	[crmSource]
  	);
  	const timeOptions = useMemo(
      () => crmSource.find((item) => item.code === "LQH")?.data || [],
      [crmSource]
    );
  
  const [openRecurrenceModal, setOpenRecurrenceModal] = React.useState(false);
  const [pendingRecurrenceType, setPendingRecurrenceType] = React.useState(null);

  // const userData = React.useMemo(() => {
  //   try {
  //     return JSON.parse(localStorage.getItem("userData") || "{}");
  //   } catch (e) {
  //     return {};
  //   }
  // }, []);

  // const isHeadCompany = userData?.user?.parent?.isHeadCompany === true;

  const schema = yup.object().shape({
    title: meetingTitleSchema,
    meetingType: yup.string().required("Vui lòng chọn loại lịch họp"),
    // priority: yup.string().required("Vui lòng chọn mức độ ưu tiên"),
    isCompany: yup.boolean(),
    needConfirmation: yup.boolean(),
    meetingDate: yup.date()
      .required("Vui lòng chọn ngày họp")
      .typeError("Ngày họp không hợp lệ")
      .min(dayjs().startOf('day').toDate(), "Ngày họp không được là ngày trong quá khứ"),
    startTime: yup.date().required("Vui lòng chọn thời gian bắt đầu").typeError("Thời gian bắt đầu không hợp lệ")
      .test("is-future-time", "Thời gian bắt đầu không được nhỏ hơn thời gian hiện tại", function(value) {
        const { meetingDate } = this.parent;
        if (!value || !meetingDate) return true;
        
        const now = dayjs();
        const selectedDate = dayjs(meetingDate);
        if (selectedDate.isSame(now, 'day')) {
          const selectedTime = dayjs(value);
          if (selectedTime.hour() < now.hour()) return false;
          if (selectedTime.hour() === now.hour() && selectedTime.minute() < now.minute()) return false;
        }
        return true;
      }),
    endTime: yup.date().required("Vui lòng chọn thời gian kết thúc").typeError("Thời gian kết thúc không hợp lệ")
      .test("is-after-start", "Thời gian kết thúc phải lớn hơn thời gian bắt đầu", function(value) {
        const { startTime } = this.parent;
        if (!value || !startTime) return true;
        
        const start = dayjs(startTime);
        const end = dayjs(value);
        if (end.hour() < start.hour()) return false;
        if (end.hour() === start.hour() && end.minute() <= start.minute()) return false;
        return true;
      }),
    meetingMode: yup.string().required("Vui lòng chọn hình thức họp"),
    location: yup.string().when("meetingMode", {
      is: "OUTSIDETHECOMPANY",
      then: (schema) => schema.trim().required("Vui lòng nhập địa điểm"),
      otherwise: (schema) => schema.nullable(),
    }),
    content: meetingContentSchema,
    recurrence: yup.object().shape({
      // type: yup.string().required("Vui lòng chọn lịch định kỳ"),
    }),
    // directCommand: yup.string().required("Vui lòng nhập tên người trực chỉ huy"),
    onlineMeeting: yup.object().shape({
      platform: yup.string(),
      passcode: yup.string(),
    }).when("meetingMode", {
      is: (val) => val === "ONLINE" || val === "HYBRID",
      then: (schema) => schema.shape({
        meetingLink: yup.string()
          .nullable()
          .notRequired()
          .matches(
             /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
             { message: "Đường link họp online phải đúng định dạng URL", excludeEmptyString: true }
          ),
      }),
      otherwise: (schema) => schema.shape({
        meetingLink: yup.string().nullable(),
      }),
    }),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    context: { meetingMode: "" }, 
    defaultValues: {
      title: "",
      meetingType: "",
      priority: "",
      isCompany: false,
      needConfirmation: true,
      meetingDate: null,
      startTime: null,
      endTime: null,  
      meetingMode: "",
      location: "",
      content: "",
      directCommand: "",
      onlineMeeting: {
        platform: "ZOOM",
        meetingLink: "",
        passcode: "",
      },
      recurrence: {
        type: "khong",
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

  const meetingMode = watch("meetingMode");
  const meetingDate = watch("meetingDate");
  const startTime = watch("startTime");
  const recurrenceData = watch("recurrence");
  const meetingTypeId = watch("meetingType");

  const [roomSchedules, setRoomSchedules] = React.useState([]);
  const prevMeetingDateRef = useRef(null);
  const prevStartTimeRef = useRef(null);

  // Reset startTime và endTime về null khi người dùng thay đổi ngày họp
  // Hoặc xóa giờ xung đột nếu chọn giờ trước rồi mới chọn ngày
  useEffect(() => {
    const prev = prevMeetingDateRef.current;
    if (prev !== null) {
      // Đổi từ ngày cũ sang ngày mới → luôn reset giờ
      const isSame = (prev && meetingDate) ? dayjs(prev).isSame(dayjs(meetingDate), 'day') : prev === meetingDate;
      if (!isSame) {
        setValue("startTime", null);
        setValue("endTime", null);
      }
    } else if (meetingDate) {
      // Chọn ngày lần đầu (từ null) → kiểm tra giờ đã chọn trước có xung đột với lịch bận không
      const dateStr = dayjs(meetingDate).format("YYYY-MM-DD");
      const toMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
      };

      const isTimeInBusy = (timeVal) => {
        if (!timeVal) return false;
        const min = dayjs(timeVal).hour() * 60 + dayjs(timeVal).minute();
        return roomSchedules.some(s => {
          if (dayjs(s.meetingDate).format("YYYY-MM-DD") !== dateStr) return false;
          const [sStr, eStr] = s.meetingTime.split("-");
          return min >= toMinutes(sStr) && min < toMinutes(eStr);
        });
      };

      const currentStart = getValues("startTime");
      const currentEnd = getValues("endTime");

      if (isTimeInBusy(currentStart)) {
        // startTime xung đột → xóa cả start và end
        setValue("startTime", null);
        setValue("endTime", null);
      } else if (isTimeInBusy(currentEnd)) {
        // Chỉ endTime xung đột → xóa end
        setValue("endTime", null);
      } else if (currentStart && currentEnd) {
        // Cả hai không nằm trong khoảng bận riêng lẻ, nhưng kiểm tra khoảng [start, end] có chứa lịch bận không
        const startMin = dayjs(currentStart).hour() * 60 + dayjs(currentStart).minute();
        const endMin = dayjs(currentEnd).hour() * 60 + dayjs(currentEnd).minute();
        const hasOverlap = roomSchedules.some(s => {
          if (dayjs(s.meetingDate).format("YYYY-MM-DD") !== dateStr) return false;
          const [sStr, eStr] = s.meetingTime.split("-");
          return startMin < toMinutes(eStr) && endMin > toMinutes(sStr);
        });
        if (hasOverlap) {
          setValue("startTime", null);
          setValue("endTime", null);
        }
      }
    }
    prevMeetingDateRef.current = meetingDate;
  }, [meetingDate, setValue, getValues, roomSchedules]);

  // Reset endTime về null khi startTime thay đổi và xung đột với endTime (startTime >= endTime)
  useEffect(() => {
    const prev = prevStartTimeRef.current;
    if (prev !== null) {
      const isSame = (prev && startTime) ? dayjs(prev).isSame(dayjs(startTime), 'minute') : prev === startTime;
      if (!isSame && startTime) {
        const currentEndTime = getValues("endTime");
        if (currentEndTime) {
          const startMin = dayjs(startTime).hour() * 60 + dayjs(startTime).minute();
          const endMin = dayjs(currentEndTime).hour() * 60 + dayjs(currentEndTime).minute();
          if (startMin >= endMin) {
            setValue("endTime", null);
          }
        }
      }
    }
    prevStartTimeRef.current = startTime;
  }, [startTime, setValue, getValues]);

  const isPartnerMeeting = React.useMemo(() => {
    const selectedOption = timeOptions.find(opt => opt.value === meetingTypeId);
    return selectedOption?.title?.toLowerCase() === "họp đối tác";
  }, [meetingTypeId, timeOptions]);

  const isToday = React.useMemo(() => {
    return meetingDate && dayjs(meetingDate).isSame(dayjs(), 'day');
  }, [meetingDate]);
  
  const minStartTime = React.useMemo(() => {
    return isToday ? dayjs().startOf('minute') : undefined;
  }, [isToday]);

  const minEndTime = React.useMemo(() => {
    if (startTime) {
      return dayjs(startTime).add(1, 'minute');
    }
    return isToday ? dayjs().startOf('minute') : undefined;
  }, [isToday, startTime]);


  const meetingStartTime = React.useMemo(() => {
    if (!meetingDate || !startTime) return null;
    return dayjs(meetingDate)
      .hour(dayjs(startTime).hour())
      .minute(dayjs(startTime).minute())
      .second(0);
  }, [meetingDate, startTime]);

  
  const [isLoading, setIsLoading] = React.useState(false);
  // const [expandedSections, setExpandedSections] = React.useState(["banLanhDao", "phongKinhDoanh"]);
  const [openParticipatingUnits, setOpenParticipatingUnits] = React.useState(false);
  const [selectedUnits, setSelectedUnits] = React.useState([]);
  const [selectedRooms, setSelectedRooms] = React.useState([]);


  // Tự động lấy lịch họp tương lai của các phòng họp đang chọn
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!selectedRooms || selectedRooms.length === 0) {
        setRoomSchedules([]);
        return;
      }
      try {
        const roomIds = selectedRooms.map(r => r.id);
        const response = await axiosInstance.post(API_CHECK_DUPLICATE_MEETING_ROOM, { roomIds });
        setRoomSchedules(response || []);
      } catch (error) {
        logger.error("Lỗi khi lấy lịch bận của phòng họp:", error);
      }
    };
    fetchSchedules();
  }, [selectedRooms]);

  const toast = useToast();

  const onInvalid = useCallback((errors) => {
    const errorMsgs = getAllErrorMessages(errors);
    if (errorMsgs.length > 0) {
      toast(errorMsgs[0], "error");
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.querySelector(`[name="${firstErrorKey}"]`);
        if (el) {
          el.focus?.();
          el.scrollIntoView?.({ behavior: "smooth", block: "center" });
        }
      }
    } else {
      toast("Vui lòng nhập đầy đủ thông tin hoặc kiểm tra lại các trường bị lỗi!", "error");
    }
  }, [toast]);

  const [openPrepareDocs, setOpenPrepareDocs] = React.useState(false);
  const [docAssignee, setDocAssignee] = React.useState(null);
  const [docRole, setDocRole] = React.useState(null);
  const [editingTask, setEditingTask] = React.useState(null); // { task, taskIndex }

  const [pendingAction, setPendingAction] = React.useState(null); // { type, actionCode, formData, label }
  const recurrenceFieldOnChangeRef = useRef(null);





  // // Group participants by unit
  // const attendanceGroups = useMemo(() => {
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
  //           _originalUnit: item
  //         };
  //       }
  //     });

  //   // Process all selected items to assign participants to groups
  //   selectedUnits.forEach(item => {
  //     if (!item.roles?.participant) return;

  //     const isUnit = item.types === 'organization_unit';
  //     const uId = isUnit ? (item.id || item._id) : (item.parent || (item.id || item._id));
  //     const uName = isUnit ? (item.name || item.title) : (item.parentName || item.unitName || item.name || item.title);
      
  //     if (!groups[uId]) {
  //       groups[uId] = { 
  //         id: uId, 
  //         name: uName, 
  //         members: [], 
  //         tasks: item.tasks || [],
  //         _originalUnit: isUnit ? item : null
  //       };
  //     }
      
  //     if (!isUnit) {
  //       // Only add individuals to the members list
  //       groups[uId].members.push(item);
  //     } else {
  //       // If it's a unit participating, check if we should add it as a "member" or just keep the header
  //       // For now, if the unit itself is a participant, we treat the header as the participation marker
  //       // but we can add it to members if needed.
  //     }
  //   });
    
  //   return Object.values(groups).filter(g => g.members.length > 0 || g.tasks.length > 0);
  // }, [selectedUnits]);

  // const totalParticipants = useMemo(() => {
  //   return selectedUnits.filter(u => u.roles?.participant).length;
  // }, [selectedUnits]);


  // const toggleSection = (sectionId) => {
  //   setExpandedSections((prev) =>
  //     prev.includes(sectionId)
  //       ? prev.filter((id) => id !== sectionId)
  //       : [...prev, sectionId]
  //   );
  // };

  // const handleToggleBanLanhDao = useCallback(() => {
  //   toggleSection("banLanhDao");
  // }, []);

  // const handleTogglePhongKinhDoanh = useCallback(() => {
  //   toggleSection("phongKinhDoanh");
  // }, []);

  const handleOpenParticipatingUnits = useCallback(() => {
    setOpenParticipatingUnits(true);
  }, []);

  const handleCloseParticipatingUnits = useCallback(() => {
    setOpenParticipatingUnits(false);
  }, []);

  const handleOpenPrepareDocs = useCallback((assignee, task = null, taskIndex = null, role = null) => {
    setDocAssignee(assignee);
    setEditingTask(task && taskIndex !== null ? { task, taskIndex } : null);
    setDocRole(role);
    setOpenPrepareDocs(true);
  }, []);

  const handleClosePrepareDocs = useCallback(() => {
    setOpenPrepareDocs(false);
    setDocAssignee(null);
    setEditingTask(null);
    setDocRole(null);
  }, []);

  // const handleToggleGroup = useCallback((id) => {
  //   // setExpandedSections((prev) =>
  //   //   prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
  //   // );
  // }, []);

  // const handleAddTaskToGroup = useCallback((e, group) => {
  //   e.stopPropagation();
  //   handleOpenPrepareDocs(group._originalUnit || { id: group.id, name: group.name, types: 'organization_unit' });
  // }, [handleOpenPrepareDocs]);

  // const handleAddTaskToMember = useCallback((member) => {
  //   handleOpenPrepareDocs(member);
  // }, [handleOpenPrepareDocs]);

  const handleParticipatingUnitsSave = (newResults) => {
    setSelectedUnits(prev => {
      // 1. Map new results by ID for easy lookup
      const newMap = {};
      newResults.forEach(item => {
        newMap[item.id || item._id] = item;
      });

      // 2. Keep existing entries if they are still in the new selection
      const keptEntries = prev.filter(oldItem => {
        const id = oldItem.id || oldItem._id;
        return !!newMap[id];
      }).map(oldItem => {
         // Update roles/tasks from the new result to ensure consistency
         const freshData = newMap[oldItem.id || oldItem._id];
         return {
           ...oldItem,
           roles: freshData.roles,
           // Note: We keep oldItem.tasks, oldItem.seatNumber, oldItem.roomId
         };
      });

      // 3. Add entirely new entries
      const oldIds = new Set(prev.map(u => u.id || u._id));
      const addedEntries = newResults.filter(newItem => !oldIds.has(newItem.id || newItem._id));

      return [...keptEntries, ...addedEntries];
    });
  };

  const handleContinueAndSubmit = (newResults) => {
    handleParticipatingUnitsSave(newResults);
    setTimeout(() => {
      const submitAction = availableActions?.find(a => a.type === 'auto_submit_meeting');
      if (submitAction) {
        handleProcessingAction('auto_submit_meeting', { action: submitAction });
      } else {
        const createAction = availableActions?.find(a => a.type === 'create_meeting');
        if (createAction) {
           handleProcessingAction('create_meeting', { action: createAction });
        }
      }
    }, 500);
  };

  const handlePrepareDocsSave = (docData) => {
    if (!docAssignee) return;

    setSelectedUnits(prev => {
      const assigneeId = docAssignee.id || docAssignee._id;
      const exists = prev.some(item => (item.id || item._id) === assigneeId);

      if (exists) {
        return prev.map(item => {
          if ((item.id || item._id) === assigneeId) {
            const currentTasks = item.tasks || [];
            
            // If editing, replace the task at taskIndex
            if (editingTask !== null && editingTask.taskIndex !== undefined) {
              const updatedTasks = [...currentTasks];
              updatedTasks[editingTask.taskIndex] = { ...docData, attachableRole: docRole || updatedTasks[editingTask.taskIndex].attachableRole };
              return { ...item, tasks: updatedTasks };
            }
            
            // Otherwise, add new task
            return {
              ...item,
              tasks: [...currentTasks, { ...docData, attachableRole: docRole }]
            };
          }
          return item;
        });
      } else {
        // If it doesn't exist (e.g. a unit that wasn't explicitly selected in the tree but we want to assign a task to it)
        return [...prev, { ...docAssignee, tasks: [{ ...docData, attachableRole: docRole }] }];
      }
    });
  };

  useEffect(() => {
    if (open) {
      dispatch(getMeetingActions());
    }
  }, [open, dispatch]);

  const handleRoomChange = useCallback((rooms, timeData) => {
    setSelectedRooms(rooms);
    if (timeData) {
      if (timeData.meetingDate) {
        setValue("meetingDate", dayjs(timeData.meetingDate).toDate());
      }
      if (timeData.startTime) {
        setValue("startTime", dayjs(timeData.startTime).toDate());
      }
      if (timeData.endTime) {
        setValue("endTime", dayjs(timeData.endTime).toDate());
      }
    }
  }, [setValue]);

  // Hàm disable giờ bận trên DateTimePicker (Tuân thủ Quy tắc Section 6)
  // view: 'hours' | 'minutes' (từ MUI TimePicker)
  const shouldDisableTime = useCallback((timeValue, type, view) => {
    if (!timeValue) return false;
    const mDate = getValues("meetingDate");
    if (!mDate) return false;
    const dateStr = dayjs(mDate).format("YYYY-MM-DD");
    const isDateToday = dayjs(mDate).isSame(dayjs(), 'day');

    const toMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    const targetMin = timeValue.hour() * 60 + timeValue.minute();
    const hourStart = timeValue.hour() * 60;
    const hourEnd = hourStart + 60;

    const currentStartTime = getValues("startTime");
    const hasStart = !!currentStartTime;
    const startProposed = hasStart ? dayjs(currentStartTime).hour() * 60 + dayjs(currentStartTime).minute() : null;

    // Quy tắc Section 6: Không cho chọn thời gian quá khứ nếu là ngày hôm nay
    if (isDateToday) {
      const now = dayjs();
      const nowMin = now.hour() * 60 + now.minute();
      if (view === "hours" && hourEnd <= nowMin) {
        return true;
      }
      if (view === "minutes" && targetMin < nowMin) {
        return true;
      }
    }

    // Quy tắc Section 6: Giờ kết thúc không được nhỏ hơn hoặc bằng giờ bắt đầu
    if (type === "end" && hasStart) {
      if (view === "hours" && hourEnd <= startProposed) {
        return true;
      }
      if (view === "minutes" && targetMin <= startProposed) {
        return true;
      }
    }

    // Disable nếu giờ/phút này khiến khoảng họp mới trùng vào bất kỳ lịch họp bận nào trong ngày họp
    return roomSchedules.some(s => {
      if (dayjs(s.meetingDate).format("YYYY-MM-DD") !== dateStr) return false;
      const [startStr, endStr] = s.meetingTime.split("-");
      const startBusy = toMinutes(startStr);
      const endBusy = toMinutes(endStr);

      if (type === "start") {
        if (view === "hours") {
          return hourStart >= startBusy && hourEnd <= endBusy;
        }
        return targetMin >= startBusy && targetMin < endBusy;
      } else if (type === "end") {
        if (view === "hours") {
          if (hasStart) {
            return startProposed < endBusy && hourStart > startBusy;
          } else {
            return hourStart > startBusy && hourEnd <= endBusy;
          }
        }
        if (hasStart) {
          return startProposed < endBusy && targetMin > startBusy;
        } else {
          return targetMin > startBusy && targetMin <= endBusy;
        }
      }

      return false;
    });
  }, [roomSchedules, getValues]);

  const handleDateChange = useCallback((onChange) => {
    return (date) => {
      onChange(date);
    };
  }, []);
  // Ngăn nhập khoảng trắng ở đầu chuỗi, trim khi blur
  const handleTrimChange = useCallback((onChange) => {
    return (e) => {
      const value = e.target.value;
      // Không cho phép khoảng trắng ở đầu chuỗi
      if (value.length > 0 && value.trimStart() !== value) {
        e.target.value = value.trimStart();
        onChange(e.target.value);
      } else {
        onChange(value);
      }
    };
  }, []);

  const handleTrimBlur = useCallback((onBlur, onChange, fieldValue) => {
    return () => {
      if (typeof fieldValue === 'string') {
        const trimmed = fieldValue.trim();
        if (trimmed !== fieldValue) {
          onChange(trimmed);
        }
      }
      onBlur?.();
    };
  }, []);
  
  const handleRecurrenceTypeChange = useCallback((e) => {
    if (!recurrenceFieldOnChangeRef.current) return;

    const value = e?.target?.value !== undefined ? e.target.value : e;
    recurrenceFieldOnChangeRef.current(value);

    // Explicitly check for known backend enums
    const valStr = String(value).toUpperCase();
    if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "QUARTER", "CUSTOM"].includes(valStr)) {
      setPendingRecurrenceType(valStr);
      setOpenRecurrenceModal(true);
      return;
    }

    // Fallback: Heuristic detection based on title if value is not standard enum
    let modalType = null;
    let selectedOption = optionModeOfWork.find(o => o.value === value);
    let checkString = (selectedOption?.title || valStr).toUpperCase();

    if (checkString.includes("THÁNG") || checkString.includes("MONTH")) modalType = "MONTHLY";
    else if (checkString.includes("QUÝ") || checkString.includes("QUARTER")) modalType = "QUARTER";
    else if (checkString.includes("NĂM") || checkString.includes("YEAR")) modalType = "YEARLY";
    else if (checkString.includes("TÙY CHỈNH") || checkString.includes("TUỲ CHỈNH") || checkString.includes("CUSTOM")) modalType = "CUSTOM";
    else if (checkString.includes("TUẦN") || checkString.includes("WEEK")) modalType = "WEEKLY";
    else if (checkString.includes("NGÀY") || checkString.includes("DAY")) modalType = "DAILY";

    if (modalType) {
      setPendingRecurrenceType(modalType);
      setOpenRecurrenceModal(true);
    }
  }, [optionModeOfWork, setPendingRecurrenceType, setOpenRecurrenceModal]);

  const handleRecurrenceSave = (data) => {
    // Update all recurrence fields
    // setValue("recurrence.type", data.type); // ensure type is consistent
    setValue("recurrence.interval", data.interval);
    setValue("recurrence.form", data.form);
    setValue("recurrence.daysOfMonth", data.daysOfMonth);
    setValue("recurrence.daysOfWeek", data.daysOfWeek);
    setValue("recurrence.monthInQuarter", data.monthInQuarter);
    setValue("recurrence.endDate", data.endDate);
    setValue("recurrence.startDate", data.startDate); // For yearly repeat date
    setValue("recurrence.endYear", data.endYear);
    
    setOpenRecurrenceModal(false);
  };
  
  const handleRecurrenceClose = () => {
    setOpenRecurrenceModal(false);
    // Option: Reset type to empty if they cancel? 
    // For now, let's reset to empty if it was a new selection, but complexities exist with previous values.
    // Simplest UX: If they cancel, we assume they didn't mean to pick that complex type, or just didn't finish.
    // We can clear the type selection.
    setValue("recurrence.type", "");
  };

  const handleIsCompanyChange = useCallback((e) => {
    setValue("isCompany", e.target.checked);
  }, [setValue]);

  const handleNeedConfirmationChange = useCallback((e) => {
    setValue("needConfirmation", e.target.checked);
  }, [setValue]);

  // Reset form khi mở
  useEffect(() => {
    if (open) {
      reset({
        title: "",
        needConfirmation: true,
        meetingType: "",
        priority: "",
        meetingDate: null,
        startTime: null,
        endTime: null,
        meetingMode: "OFFLINE",
        content: "",
        onlineMeeting: {
          platform: "ZOOM",
          meetingLink: "",
          passcode: "",
        },
        recurrence: {
          type: "khong",
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
      // setExpandedSections([]);
    }
  }, [open, reset]);

 

  const validateForm = useCallback((data) => {
    // if (selectedUnits.length === 0) {
    //   toast("Vui lòng chọn đơn vị hoặc cá nhân tham gia", "error");
    //   return false;
    // }
    if ((data.meetingMode === "OFFLINE" || data.meetingMode === "HYBRID") && selectedRooms.length === 0) {
      toast("Bạn chưa đăng ký phòng họp", "error");
      return false;
    }

    // Kiểm tra trùng lịch bận của phòng họp (Overlap check)
    if (data.startTime && data.endTime && data.meetingDate && (data.meetingMode === "OFFLINE" || data.meetingMode === "HYBRID")) {
      const dateStr = dayjs(data.meetingDate).format("YYYY-MM-DD");
      const toMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
      };

      const startProposed = dayjs(data.startTime).hour() * 60 + dayjs(data.startTime).minute();
      const endProposed = dayjs(data.endTime).hour() * 60 + dayjs(data.endTime).minute();

      const hasOverlap = roomSchedules.some(s => {
        if (dayjs(s.meetingDate).format("YYYY-MM-DD") !== dateStr) return false;
        const [startStr, endStr] = s.meetingTime.split("-");
        const startBusy = toMinutes(startStr);
        const endBusy = toMinutes(endStr);

        return startProposed < endBusy && endProposed > startBusy;
      });

      if (hasOverlap) {
        toast("Thời gian họp bị trùng với lịch bận của phòng họp!", "error");
        return false;
      }
    }

    // Kiểm tra nếu loại cuộc họp là "Họp đối tác" thì phải có khách mời
    const selectedMeetingType = timeOptions.find(opt => opt.value === data.meetingType);
    const isPartnerMeeting = selectedMeetingType?.title?.toLowerCase() === "họp đối tác";
    const hasGuests = selectedUnits.some(u => u.types === 'guest_group' && u.members?.length > 0);
    
    if (isPartnerMeeting && !hasGuests) {
      toast("Loại cuộc họp đối tác phải có ít nhất một khách mời", "error");
      return false;
    }

    return true;
  }, [selectedRooms, selectedUnits, timeOptions, toast, roomSchedules]);

  const onSubmit = useCallback(async (data, actionCode) => {
    if (!validateForm(data)) return;

    setIsLoading(true);

    try {
      // 1. Phân loại người tham gia từ selectedUnits
      const chairmanUser = selectedUnits.find(u => u.roles?.chair);
      const secretaryUser = selectedUnits.find(u => u.roles?.secretary);

      const mapRoleInfo = (user, roleStr) => {
        if (!user) return null;
        const uId = user.id || user._id;
        return {
          userId: uId,
          tasks: (user.tasks || []).filter(t => t.attachableRole === roleStr).map(t => ({
            attachableType: "ROLE",
            attachableId: uId,
            attachableRole: roleStr,
            content: t.content || "",
            documentName: t.documentName || "",
            deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
          })),
          roomId: user.roomId || null,
          seatNumber: user.seatNumber || null,
          ...(roleStr === "SECRETARY" && { secretaryType: user.types === 'organization_unit' ? "UNIT" : "USER" })
        };
      };

      const chairmanPayload = mapRoleInfo(chairmanUser, "CHAIRMAN");
      const secretaryPayload = mapRoleInfo(secretaryUser, "SECRETARY");
      
      // Xây dựng danh sách units và participants
      const unitMap = {};

      selectedUnits.forEach(item => {
        const isUnit = item.types === 'organization_unit';
        const isParticipant = !!item.roles?.participant;
        const uId = isUnit ? (item.id || item._id) : item.parent;
        const hasTasks = item.tasks && item.tasks.length > 0;
        
        if (!uId) return;

        // Kiểm tra xem đơn vị này có cá nhân nào tham gia không
        const unitHasMembers = isUnit && selectedUnits.some(u => u.parent === uId && u.roles?.participant);

        // Chỉ đưa vào mảng units nếu:
        // 1. Phải được tích Tham dự (isParticipant)
        // 2. Hoặc là đơn vị và có thành viên tham gia
        const shouldIncludeInUnits = isParticipant || (isUnit && unitHasMembers);
        if (!shouldIncludeInUnits) return;

        if (!unitMap[uId]) {
          unitMap[uId] = { 
            unitId: uId, 
            participants: [], 
            tasks: [],
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
        if (!isUnit && isParticipant) {
            const memberTasks = (item.tasks || []).filter(t => t.attachableRole === "PARTICIPANT" || !t.attachableRole).map(t => ({
                attachableType: "PARTICIPANT",
                content: t.content || "",
                documentName: t.documentName || "",
                deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
            }));

            unitMap[uId].participants.push({
                userId: item.id || item._id,
                seatNumber: item.seatNumber || null,
                roomId: item.roomId || null,
                tasks: memberTasks
            });
        }

        // Xử lý chuẩn bị tài liệu (tasks) cho ĐƠN VỊ (Phòng ban)
        if (isUnit && hasTasks) {
            const unitTasks = item.tasks.filter(t => t.attachableRole === "UNIT" || !t.attachableRole || (t.attachableRole !== "CHAIRMAN" && t.attachableRole !== "SECRETARY"));
            
            if (unitTasks.length > 0 && unitMap[uId].tasks.length === 0) {
                const mappedTasks = unitTasks.map(t => ({
                    attachableType: "UNIT",
                    content: t.content || "",
                    documentName: t.documentName || "",
                    deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
                }));
                unitMap[uId].tasks.push(...mappedTasks);
            }
        }
      });

      const payload = {
        title: data.title,
        meetingType: data.meetingType,
        priority: data.priority,
        isCompany: data.isCompany || false,
        needConfirmation: data.needConfirmation || false,
        meetingDate: data.meetingDate ? dayjs(data.meetingDate).format("YYYY-MM-DD") : null,
        meetingTime: (data.startTime && data.endTime) 
          ? `${dayjs(data.startTime).format("HH:mm")}-${dayjs(data.endTime).format("HH:mm")}`
          : null,
        meetingMode: data.meetingMode,
        location: data.meetingMode === "OUTSIDETHECOMPANY" ? data.location : undefined,
        roomIds: data.meetingMode === "OUTSIDETHECOMPANY" ? [] : selectedRooms.map(r => r.id),
        content: data.content,
        chairman: chairmanPayload,
        secretary: secretaryPayload,
        directCommand: data.directCommand,
        onlineMeeting: {
          platform: data.onlineMeeting?.platform,
          meetingLink: data.onlineMeeting?.meetingLink,
          passcode: data.onlineMeeting?.passcode,
        },
        recurrence: (() => {
          const r = data.recurrence;
          if (!r || !r.type || r.type.toUpperCase() === "KHONG") return null;

          const dayMap = {
            2: "MON", 3: "TUE", 4: "WED", 5: "THU", 6: "FRI", 7: "SAT", 8: "SUN"
          };

          // Helper to get standard type even if r.type is an ID
          const getStandardType = (val) => {
            const valStr = String(val).toUpperCase();
            if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "QUARTER", "CUSTOM", "TUAN", "TUY_CHINH", "THANG", "NAM", "NGAY"].includes(valStr)) {
                return valStr;
            }
            const option = optionModeOfWork.find(o => o.value === val);
            const title = (option?.title || valStr).toUpperCase();
            if (title.includes("THÁNG") || title.includes("MONTH")) return "THANG";
            if (title.includes("QUÝ") || title.includes("QUARTER")) return "QUARTER";
            if (title.includes("NĂM") || title.includes("YEAR")) return "NAM";
            if (title.includes("TÙY CHỈNH") || title.includes("TUỲ CHỈNH") || title.includes("CUSTOM")) return "TUY_CHINH";
            if (title.includes("TUẦN") || title.includes("WEEK")) return "TUAN";
            if (title.includes("NGÀY") || title.includes("DAY")) return "NGAY";
            return valStr;
          };

          const type = getStandardType(r.type);
          // const startDate = data.meetingDate ? dayjs(data.meetingDate).format("YYYY-MM-DD") : null;
          const todayStr = dayjs().format("YYYY-MM-DD");

          if (type === "WEEKLY" || type === "TUAN") {
            return {
              type: "TUAN",
              startDate: todayStr,
              endDate: r.endDate ? dayjs(r.endDate).format("YYYY-MM-DD") : null,
              daysOfWeek: Array.isArray(r.daysOfWeek)
                ? r.daysOfWeek.map(d => dayMap[d]).filter(Boolean).join(",")
                : r.daysOfWeek
            };
          }
          if (type === "CUSTOM" || type === "TUY_CHINH") {
            return {
              type: "TUY_CHINH",
              startDate: todayStr,
              endDate: r.endDate ? dayjs(r.endDate).format("YYYY-MM-DD") : null,
              intervalValue: String(r.interval)
            };
          }
          if (type === "MONTHLY" || type === "THANG") {
            return {
              type: "THANG",
              endMonth: r.endDate ? dayjs(r.endDate).format("YYYY-MM") : null
            };
          }
          if (type === "YEARLY" || type === "NAM") {
            return {
              type: "NAM",
              endYear: String(r.endYear)
            };
          }
          if (type === "DAILY" || type === "NGAY") {
            return {
              type: "NGAY",
              endDate: r.endDate ? dayjs(r.endDate).format("YYYY-MM-DD") : null
            };
          }
          return null;
        })(),
        tasks: [], // Giao tài liệu cấp cuộc họp
        units: Object.values(unitMap),
        guests: selectedUnits.find(u => u.types === 'guest_group')?.members?.map(m => ({
          guestName: m.name || m.title,
          guestTitle: m.position || "",
          seatNumber: m.seatNumber,
          roomId: m.roomId
        })) || [],
        actionCode: typeof actionCode === 'string' ? actionCode : null,
        flowConfig: meetingFlowConfig,
        workItem: meetingWorkItem,
      };

      const response = await axiosInstance.post(API_ADD_MEETING_SCHEDULE, payload);
      const newMeetingId = response?.data?._id || response?._id || response?.id;

      if (!newMeetingId) {
        throw new Error("Không nhận được ID lịch họp sau khi tạo.");
      }

      toast("Tạo lịch họp thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedUnits, selectedRooms, meetingFlowConfig, meetingWorkItem, toast, onSuccess, onClose, validateForm, optionModeOfWork]);
  const handleProcessingAction = useCallback((type, data) => {
    const meetingActionTypes = [
      'create_meeting_seat', 
      'auto_announced_meeting', 
      'create_meeting', 
      'auto_submit_meeting'
    ];
    if (meetingActionTypes.includes(type)) {
      handleSubmit((formData) => {
        if (!validateForm(formData)) return;

        if (type === 'auto_announced_meeting' || type === 'auto_submit_meeting') {
          setPendingAction({
            type,
            actionCode: data?.action?.code,
            formData,
            label: type === 'auto_announced_meeting' ? 'Công bố' : 'Trình'
          });
        } else {
          onSubmit(formData, data?.action?.code);
        }
      }, onInvalid)();
    }
  }, [handleSubmit, onSubmit, validateForm, onInvalid]);

  const handleConfirmAction = useCallback(() => {
    if (pendingAction) {
      onSubmit(pendingAction.formData, pendingAction.actionCode);
      setPendingAction(null);
    }
  }, [pendingAction, onSubmit]);

  const handleCloseConfirmAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const dataForFormButton = React.useMemo(() => {
    const flags = {};
    availableActions.forEach(a => {
      const flagName = typeFlagMap[a.type];
      if (flagName) flags[flagName] = true;
    });

    return {
      availableActions: availableActions,
      flags: flags
    };
  }, [availableActions]);
  const selectedTargetName = docAssignee ? (docAssignee.name || docAssignee.title || docAssignee.fullName) : "";

  return (
    <BaseSwipper
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleSubmit(onSubmit, onInvalid)}
      isLoading={isLoading}
      type="add"
      hideBackdrop
       footer={
          <>
                  <FlexGrowBox />
                                <FooterActions>
        <StyleBoxButton>
          <FormButton
            dataDetail={dataForFormButton}
            onAction={handleProcessingAction}
            disabled={isLoading}
            sharedComponents={sharedComponents}
          />
        </StyleBoxButton>
        </FooterActions></>
      }
      >
      <PrepareDocuments
        open={openPrepareDocs}
        onClose={handleClosePrepareDocs}
        onSave={handlePrepareDocsSave}
        initialData={editingTask?.task || null}
        targetName={selectedTargetName}
        sharedComponents={sharedComponents}
        meetingStartTime={meetingStartTime}
      />
    
      <JobMainContent>
        <RegisterForMeetingRooms 
          control={control} 
          errors={errors} 
          sharedComponents={sharedComponents} 
          selectedUnits={selectedUnits}
          onOpenParticipatingUnits={handleOpenParticipatingUnits}
          onRoomChange={handleRoomChange}
          initialRooms={selectedRooms}
          onUpdateParticipants={setSelectedUnits}
          onOpenPrepareDocs={handleOpenPrepareDocs}
          isPartnerMeeting={isPartnerMeeting}
          forceOnlineLinkFullWidth
          topOnly
        />
        {/* THÔNG TIN CHUNG */}
        <StyledBoxContainerContent>
          <Grid item xs={12}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <StyledIconWrapper>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0"/>
                                <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0"/>
                                <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0"/>
                                <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0"/>
                                <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0"/>
                              </svg>
                            </StyledIconWrapper>
                            <StyledHeaderContent variant="h6" noWrap>
                              Thông tin lịch họp
                            </StyledHeaderContent>
                          </div>
            {/* {isHeadCompany && ( */}
              </div>
              <StyledDivider />
            {/* )} */}
          </Grid>

          <Grid container spacing={3}>
            {/* ==================== CỘT TRÁI ==================== */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {/* Tên cuộc họp */}
                <Grid item xs={12}>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Tiêu đề cuộc họp"
                        placeholder="Nhập tiêu đề cuộc họp"
                        {...field}
                        onChange={handleTrimChange(field.onChange)}
                        onBlur={handleTrimBlur(field.onBlur, field.onChange, field.value)}
                        required
                        error={!!errors.title}
                        helperText={errors.title?.message}
                      />
                    )}
                  />
                </Grid>
             

                {/* Ngày họp */}
                <Grid item xs={12} sm={6} md={4}>
                  <Controller
                    name="meetingDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="Ngày họp"
                        value={field.value}
                        onChange={handleDateChange(field.onChange)}
                        showTime={false}
                        minDate={dayjs().startOf('day')}
                        error={!!errors.meetingDate}
                        helperText={selectedRooms.length === 0 && meetingMode !== "ONLINE" && meetingMode !== "OUTSIDETHECOMPANY" ? "Vui lòng chọn phòng họp trước" : errors.meetingDate?.message}
                        required
                        disabled={selectedRooms.length === 0 && meetingMode !== "ONLINE" && meetingMode !== "OUTSIDETHECOMPANY"}
                      />
                    )}
                  />
                </Grid>

                {/* Thời gian bắt đầu */}
                <Grid item xs={12} sm={6} md={4} >
                  <Controller
                    name="startTime"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        label="Thời gian bắt đầu"
                        value={field.value}
                        onChange={handleDateChange(field.onChange)}
                        timeOnly // Use TimePicker
                        minTime={minStartTime}
                        error={!!errors.startTime}
                        helperText={selectedRooms.length === 0 && meetingMode !== "ONLINE" && meetingMode !== "OUTSIDETHECOMPANY" ? "Vui lòng chọn phòng họp trước" : errors.startTime?.message}
                        required
                        disabled={selectedRooms.length === 0 && meetingMode !== "ONLINE" && meetingMode !== "OUTSIDETHECOMPANY"}
                        shouldDisableTime={(v, view) => shouldDisableTime(v, "start", view)}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Controller
                    name="endTime"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        label="Thời gian kết thúc"
                        value={field.value}
                        onChange={handleDateChange(field.onChange)}
                        timeOnly // Use TimePicker
                        minTime={minEndTime}
                        error={!!errors.endTime}
                        helperText={selectedRooms.length === 0 && meetingMode !== "ONLINE" && meetingMode !== "OUTSIDETHECOMPANY" ? "Vui lòng chọn phòng họp trước" : errors.endTime?.message}
                        required
                        disabled={selectedRooms.length === 0 && meetingMode !== "ONLINE" && meetingMode !== "OUTSIDETHECOMPANY"}
                        shouldDisableTime={(v, view) => shouldDisableTime(v, "end", view)}
                      />
                    )}
                  />
                </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                  <Controller
                    name="meetingType"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        select
                        label="Loại cuộc họp"
                        placeholder="Chọn loại cuộc họp..."
                        options={timeOptions}
                        customLabel="title"
                        customValue="value"
                        {...field}
                        error={!!errors.meetingType}
                        helperText={errors.meetingType?.message}
                        required
                      />
                    )}
                  />
                </Grid>

                {/* Định kỳ */}
                <Grid item xs={12} sm={6} md={2}>
                  <Controller
                    name="recurrence.type"
                    control={control}
                    render={({ field }) => {
                      recurrenceFieldOnChangeRef.current = field.onChange;
                      return (
                        <InputComponents
                          select
                          label="Lịch lặp"
                          placeholder="Chọn lịch lặp..."
                          options={optionModeOfWork}
                          customLabel="title"
                          customValue="value"
                          {...field}
                          onChange={handleRecurrenceTypeChange}
                          onMenuItemClick={handleRecurrenceTypeChange}
                        />
                      );
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        select
                        label="Mức độ ưu tiên"
                        placeholder="Chọn mức độ ưu tiên..."
                        options={urgencyOptions}
                        customLabel="title"
                        customValue="value"
                        {...field}
                        error={!!errors.priority}
                        helperText={errors.priority?.message}
                        // required
                      />
                    )}
                  />
                </Grid> 

                 <Grid item xs={12} sm={6} md={2}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '40px', marginTop: '20px' }}>
                    <Controller
                      name="isCompany"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <CompanyCheckbox
                              checked={field.value}
                              onChange={handleIsCompanyChange}
                            />
                          }
                          label={<BoldCompanyLabel variant="body2">Lịch tổng công ty</BoldCompanyLabel>}
                          labelPlacement="start"
                          
                        />
                      )}
                    />
                  </div>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '40px', marginTop: '20px' }}>
                    <Controller
                      name="needConfirmation"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <CompanyCheckbox
                              checked={field.value}
                              onChange={handleNeedConfirmationChange}
                            />
                          }
                          label={<BoldCompanyLabel variant="body2">Cần xác nhận</BoldCompanyLabel>}
                          labelPlacement="start"
                          
                        />
                      )}
                    />
                  </div>
                </Grid>
                {/* <Grid item xs={12} sm={6} md={6}>
                  <Controller
                    name="directCommand"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Trực chỉ huy"
                        placeholder="Nhập tên người trực chỉ huy..."
                        {...field}
                        error={!!errors.directCommand}
                        helperText={errors.directCommand?.message}
                        required
                      />
                    )}
                  />
                </Grid> */}
              </Grid>
            </Grid>
          </Grid>

          {/* Nội dung họp */}
          <JobSectionTitle variant="h6" gutterBottom mt={4}>
            Nội dung họp
          </JobSectionTitle>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    // label="Nội dung họp"
                    multiline
                    rows={4}
                    placeholder="Nhập nội dung họp..."
                    {...field}
                    onChange={handleTrimChange(field.onChange)}
                    onBlur={handleTrimBlur(field.onBlur, field.onChange, field.value)}
                    error={!!errors.content}
                    helperText={errors.content?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledBoxContainerContent>

        {/* THÔNG TIN NGƯỜI THAM GIA
        <StyledBoxContainerContent>
          <ParticipantHeader>
            <JobSectionTitle variant="h6" mt={0}>
              Đơn vị tham gia
            </JobSectionTitle>
            {selectedUnits.length > 0 && (
              <ParticipantStats>
                <StatItem colorType="red">
                  Thành phần tham dự : <span>{selectedUnits.length}</span>
                </StatItem>
                <StatDivider orientation="vertical" flexItem />
                <StatItem colorType="blue">
                  Đơn vị chủ trì : <span>{chairman ? (chairman.parentName || chairman.name) : "Chưa chọn"}</span>
                </StatItem>
              </ParticipantStats>
            )}
          </ParticipantHeader>

          {selectedUnits.length === 0 ? (
            <EditParticipantButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenParticipatingUnits}
            >
              Đơn vị tham gia
            </EditParticipantButton>
          ) : (
            <>
              <EditParticipantButton
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleOpenParticipatingUnits}
              >
                Chỉnh sửa
              </EditParticipantButton>

              <BoardSection>
                <SectionSubtitle variant="subtitle2">
                  BAN ĐIỀU HÀNH
                </SectionSubtitle>
                <BoardGrid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <BoardCard type="chair">
                      <BoardIconBox type="chair">
                        <PersonIcon />
                      </BoardIconBox>
                      <BoardInfo>
                        <BoardLabel>NGƯỜI CHỦ TRÌ</BoardLabel>
                        <BoardName>{chairman ? (chairman.title || chairman.name) : "Chưa chọn người chủ trì"}</BoardName>
                        <BoardTitle>{chairman?.position || chairman?.parentName || "---"}</BoardTitle>
                      </BoardInfo>
                    </BoardCard>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <BoardCard type="secretary">
                      <BoardIconBox type="secretary">
                        <DescriptionIcon />
                      </BoardIconBox>
                      <BoardInfo>
                        <BoardLabel>THƯ KÝ CUỘC HỌP</BoardLabel>
                        <BoardName>{secretary ? (secretary.title || secretary.name) : "Chưa chọn thư ký"}</BoardName>
                        <BoardTitle>{secretary?.position || secretary?.parentName || "---"}</BoardTitle>
                      </BoardInfo>
                    </BoardCard>
                  </Grid>
                </BoardGrid>
              </BoardSection>

              <AttendanceSection>
                <SectionSubtitle variant="subtitle2">
                  THAM DỰ
                </SectionSubtitle>

                {attendanceGroups.map((group, gIdx) => {
                  const groupId = `group-${gIdx}`;
                  const isExpanded = expandedSections.includes(groupId);
                  return (
                    <AttendanceGroupItem
                      key={gIdx}
                      group={group}
                      groupId={groupId}
                      isExpanded={isExpanded}
                      onToggle={handleToggleGroup}
                      onAddTaskToGroup={handleAddTaskToGroup}
                      onAddTaskToMember={handleAddTaskToMember}
                    />
                  );
                })}

                {attendanceGroups.length === 0 && (
                  <EmptyStateText>
                    Chưa có đơn vị, cá nhân tham dự
                  </EmptyStateText>
                )}
              </AttendanceSection>
            </>
          )}
        </StyledBoxContainerContent> */}

        <ParticipatingUnits
          open={openParticipatingUnits}
          onClose={handleCloseParticipatingUnits}
          onSave={handleParticipatingUnitsSave}
          onContinueAndSubmit={handleContinueAndSubmit}
          initialSelectedUnits={selectedUnits}
          dialogKey="internalUnit"
          control={control}
        />

        <PrepareDocuments
          open={openPrepareDocs}
          onClose={handleClosePrepareDocs}
          onSave={handlePrepareDocsSave}
          initialData={editingTask?.task || null}
          targetName={docAssignee ? (docAssignee.title || docAssignee.name) : ""}
          sharedComponents={sharedComponents}
          meetingStartTime={meetingStartTime}
        />

        <RegisterForMeetingRooms 
          control={control} 
          errors={errors} 
          sharedComponents={sharedComponents} 
          selectedUnits={selectedUnits}
          onOpenParticipatingUnits={handleOpenParticipatingUnits}
          onRoomChange={handleRoomChange}
          initialRooms={selectedRooms}
          onUpdateParticipants={setSelectedUnits}
          onOpenPrepareDocs={handleOpenPrepareDocs}
          isPartnerMeeting={isPartnerMeeting}
          forceOnlineLinkFullWidth
          bottomOnly
        />

        <RecurringMeetingConfigModal
          open={openRecurrenceModal}
          onClose={handleRecurrenceClose}
          onSave={handleRecurrenceSave}
          type={pendingRecurrenceType}
          initialData={recurrenceData}
          sharedComponents={sharedComponents}
        />

        <CustomDialog
          open={!!pendingAction}
          onClose={handleCloseConfirmAction}
          onSave={handleConfirmAction}
          title={`Xác nhận ${pendingAction?.label?.toLowerCase()} lịch họp`}
          titleButton={"Xác nhận"}
          isLoading={isLoading}
        >
          <Typography variant="body1">
            Bạn có chắc chắn muốn {pendingAction?.label?.toLowerCase()} lịch họp không?
          </Typography>
        </CustomDialog>
      </JobMainContent>
    </BaseSwipper>

  );
};

export default withSharedComponents(CreateMeetingSchedule);
