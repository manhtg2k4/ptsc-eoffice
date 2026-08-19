import React, { useEffect, useCallback, useRef, useMemo } from "react";
import {
  Grid,
  FormControlLabel,
  RadioGroup,
  // Typography,
  Box
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  getCommentsByDocument,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { 
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { withFormWrapper } from "@components/common/FormWrapper";
// import CustomComment from "@components/CustomComment";
// import {
//   StyleBoxComent,
//   StyledGridCustomComment,
// } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import * as yup from "yup";
import { 
  FlexGrowBox,
  FooterActions
} from "@styles/BaseSwiper/BaseSwiper.style";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE  } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
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
  // ActionLink,
  DepartmentContent,
  ParticipantRow,
  // DocumentBox,
  // DocumentTitle,
  // DocumentInfoRow,
  // DocumentLabel,
  // DocumentValue,
  // EditParticipantButton,
  // SectionSubtitle,
  // StatDivider,
  ParticipantName,
  // StyledAddIcon,
  // DocumentHeaderBox,
  // DocumentActionIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  // SectionHeaderContainer,
  BoldCompanyLabel,
  CompanyCheckbox,
  ConfirmScopeTitle,
  ConfirmScopeLabel,
  ConfirmScopeRadio,
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
import { useDispatch, useSelector } from "react-redux";
// import PersonIcon from "@mui/icons-material/Person";

// import EditIcon from "@mui/icons-material/Edit";
// import AddIcon from "@mui/icons-material/Add";
// import DescriptionIcon from "@mui/icons-material/Description";
import ParticipatingUnits from "./ParticipatingUnits";
import RegisterForMeetingRooms from "./RegisterForMeetingRooms";
import PrepareDocuments from "./PrepareDocuments";
// import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import RecurringMeetingConfigModal from "./RecurringMeetingConfigModal";
import { getAllErrorMessages, meetingContentSchema, meetingTitleSchema } from "./constants";



const MemberItem = React.memo(({ member }) => {
  // const handleAddTask = useCallback(() => {
  //   onAddTaskToMember(member);
  // }, [member, onAddTaskToMember]);

  return (
    <React.Fragment>
      <ParticipantRow>
        <ParticipantName variant="body2">
          {member.title || member.name} {member.position ? `- ${member.position}` : ""}
        </ParticipantName>
        {/* <ActionLink onClick={handleAddTask}>
          <StyledAddIcon />
          Giao chuẩn bị tài liệu
        </ActionLink> */}
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
  // onAddTaskToGroup, 
  onAddTaskToMember 
}) => {
  const handleToggle = useCallback(() => {
    onToggle(groupId);
  }, [groupId, onToggle]);

  // const handleAddTask = useCallback((e) => {
  //   onAddTaskToGroup(e, group);
  // }, [group, onAddTaskToGroup]);

  return (
    <DepartmentAccordion>
      <DepartmentHeader onClick={handleToggle}>
        <DepartmentTitle>
          <DepartmentName>{group.name}</DepartmentName>
          {/* <ActionLink onClick={handleAddTask}>
            <StyledAddIcon />
            Giao chuẩn bị tài liệu
          </ActionLink> */}
        </DepartmentTitle>
        {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </DepartmentHeader>
      {isExpanded && (
        <DepartmentContent>
          {/* Member List */}
          {group.members.length > 0 && (
            <>
              {/* <SectionSubtitle variant="subtitle2" small greyText>
                NGƯỜI THAM GIA
              </SectionSubtitle> */}
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





const UpdateMeetingSchedule = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Chỉnh sửa lịch họp",
  meetingId,
}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    ButtonOutline,
    // AsyncAutoCompleted,
    DateTimePicker: BaseDateTimePicker,
    DatePicker: BaseDatePicker,
    Dialog,
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

   const { crmSource } = useSelector((state) => state.config);
  const optionModeOfWork = useMemo(() => {
    return crmSource.find((item) => item.code === "LICHDINHKY")?.data || [];
  }, [crmSource]);
  const urgencyOptions = useMemo(() => {
    return crmSource.find((item) => item.code === "DOUUTIENLH")?.data || [];
  }, [crmSource]);
  const timeOptions = useMemo(() => {
    return crmSource.find((item) => item.code === "LQH")?.data || [];
  }, [crmSource]);

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
    meetingType: yup.string().required("Vui lòng chọn loại cuộc họp"),
    // priority: yup.string().required("Vui lòng chọn mức độ ưu tiên"),
    isCompany: yup.boolean(),
       meetingDate: yup.date()
         .required("Vui lòng chọn ngày họp")
         .typeError("Ngày họp không hợp lệ"),
        //  .min(dayjs().startOf('day').toDate(), "Ngày họp không được là ngày trong quá khứ"),
    startTime: yup.date().required("Vui lòng chọn thời gian bắt đầu").typeError("Thời gian bắt đầu không hợp lệ"),
    endTime: yup.date().required("Vui lòng chọn thời gian kết thúc").typeError("Thời gian kết thúc không hợp lệ"),
    meetingMode: yup.string().required("Vui lòng chọn hình thức họp"),
    location: yup.string().when("meetingMode", {
      is: "OUTSIDETHECOMPANY",
      then: (schema) => schema.trim().required("Vui lòng nhập địa điểm"),
      otherwise: (schema) => schema.nullable(),
    }),
    content: meetingContentSchema,
    // directCommand: yup.string(),
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
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    context: { meetingMode: "ONLINE" }, 
    defaultValues: {
      title: "",
      meetingType: "",
      priority: "",
      isCompany: false,
      meetingDate: null,
      startTime: null,
      endTime: null,  
      meetingMode: "ONLINE",
      location: "",
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

  const meetingDate = watch("meetingDate");
  const startTime = watch("startTime");

  const meetingStartTime = React.useMemo(() => {
    if (!meetingDate || !startTime) return null;
    return dayjs(meetingDate)
      .hour(dayjs(startTime).hour())
      .minute(dayjs(startTime).minute())
      .second(0);
  }, [meetingDate, startTime]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [meetingData, setMeetingData] = React.useState(null);

  // const [expandedSections, setExpandedSections] = React.useState(["banLanhDao", "phongKinhDoanh"]);
  const [openParticipatingUnits, setOpenParticipatingUnits] = React.useState(false);
  const [selectedUnits, setSelectedUnits] = React.useState([]);
  const [selectedRooms, setSelectedRooms] = React.useState([]);
  const toast = useToast();
  const [openPrepareDocs, setOpenPrepareDocs] = React.useState(false);
  const [docAssignee, setDocAssignee] = React.useState(null);
  const [docRole, setDocRole] = React.useState(null);
  const [editingTask, setEditingTask] = React.useState(null); // { task, taskIndex }
  const dispatch = useDispatch();
  const recurrenceFieldOnChangeRef = useRef(null);
  const [openRecurrenceModal, setOpenRecurrenceModal] = React.useState(false);
  const [pendingRecurrenceType, setPendingRecurrenceType] = React.useState(null);
  const [openUpdateConfirm, setOpenUpdateConfirm] = React.useState(false);
  const [recurrenceScope, setRecurrenceScope] = React.useState("ONLY_THIS");
  const [pendingPayload, setPendingPayload] = React.useState(null);
  const [openSimpleConfirm, setOpenSimpleConfirm] = React.useState(false);

  const isLocked = React.useMemo(() => {
    return meetingData?.isMeetingApproved === true && meetingData?.isCancelled !== true;
  }, [meetingData]);

  // const { commentsList: comments } = useSelector(
  //   (state) => state.unit
  // );


 

;

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
  //     }
  //   });

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

  const handleParticipatingUnitsSave = (newResults) => {
    setSelectedUnits(prev => {
      // 1. Map new results by ID for easy lookup
      const newMap = {};
      newResults.forEach(item => {
        const id = (item.id || item._id)?.toString().trim().toLowerCase();
        if (id) newMap[id] = item;
      });

      // 2. Lấy danh sách các ID được chọn mới
      const selectedIds = new Set(Object.keys(newMap));

      // 3. Xử lý gộp dữ liệu: Đảm bảo mỗi ID chỉ xuất hiện 1 lần (hoặc theo seatNumber)
      // và cập nhật vai trò, giữ lại nhiệm vụ (tasks).
      const finalResults = [];
      const processedIds = new Set();

      // Duyệt qua các item cũ để cập nhật
      prev.forEach(oldItem => {
        const id = (oldItem.id || oldItem._id)?.toString().trim().toLowerCase();
        if (!id || !selectedIds.has(id)) return; // Bỏ qua nếu không còn được chọn

        const freshData = newMap[id];
        const key = `${id}-${oldItem.types}-${oldItem.seatNumber || ''}-${oldItem.roomId || ''}`;
        
        if (!processedIds.has(key)) {
          finalResults.push({
            ...oldItem,
            // Cập nhật các roles mà hộp thoại quản lý, giữ lại các thông tin khác
            roles: { 
              ...(oldItem.roles || {}), 
              participant: freshData.roles?.participant,
              secretary: freshData.roles?.secretary,
              chair: freshData.roles?.chair
            },
            // Giữ lại tasks, seatNumber, roomId từ item cũ
          });
          processedIds.add(key);
        }
      });

      // 4. Thêm các item mới hoàn toàn (chưa có trong prev)
      newResults.forEach(newItem => {
        const id = (newItem.id || newItem._id)?.toString().trim().toLowerCase();
        if (!id) return;

        // Kiểm tra xem ID này đã được xử lý trong bước 3 chưa (không xét seatNumber vì item mới chưa có seat)
        const alreadyExists = finalResults.some(res => (res.id || res._id)?.toString().trim().toLowerCase() === id);
        
        if (!alreadyExists) {
          finalResults.push(newItem);
        }
      });

      return finalResults;
    });
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
            
            // Nếu đang edit, thay thế task tại vị trí taskIndex
            if (editingTask !== null && editingTask.taskIndex !== undefined) {
              const updatedTasks = [...currentTasks];
              updatedTasks[editingTask.taskIndex] = { ...docData, attachableRole: docRole || updatedTasks[editingTask.taskIndex].attachableRole };
              return { ...item, tasks: updatedTasks };
            }

            return {
              ...item,
              tasks: [...currentTasks, { ...docData, attachableRole: docRole }]
            };
          }
          return item;
        });
      } else {
        return [...prev, { ...docAssignee, tasks: [{ ...docData, attachableRole: docRole }] }];
      }
    });
  };



  


  const handleIsCompanyChange = useCallback((e) => {
    setValue("isCompany", e.target.checked);
  }, [setValue]);

  const handleNeedConfirmationChange = useCallback((e) => {
    setValue("needConfirmation", e.target.checked);
  }, [setValue]);

  const handleDateChange = useCallback((onChange) => {
    return (date) => {
      onChange(date);
      // Reset selected rooms, participants and seat assignments when time changes
      setSelectedRooms([]);
      setSelectedUnits([]);
    };
  }, [setSelectedRooms, setSelectedUnits]);

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
    setValue("recurrence.type", "");
  };


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
          meetingMode: "ONLINE",
          location: "",
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

  // Fetch data when meetingId is provided
  useEffect(() => {
    const fetchMeetingDetails = async () => {
      if (open && meetingId) {
        setIsLoading(true);
        try {
          const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}`);
          // console.log(response, "response")
          if (response && response.meeting) {
            const data = response.meeting;
            // console.log(data, "data")
            setMeetingData(data);
            
            // Reconstruct selectedUnits
            const reconstructed = reconstructSelectedUnits(data);
            setSelectedUnits(reconstructed);
            setSelectedRooms(data.roomIds || []);

            // Extract times
            let startT = null;
            let endT = null;
            if (data.meetingTime && data.meetingDate) {
              const [s, e] = data.meetingTime.split("-");
              startT = dayjs(`${data.meetingDate}T${s}`);
              endT = dayjs(`${data.meetingDate}T${e}`);
            }

            // Reset form with fetched data
            reset({
              title: data.title || "",
              meetingType: data.meetingType || "",
              priority: data.priority || "",
              meetingDate: data.meetingDate ? dayjs(data.meetingDate) : null,
              startTime: startT,
              endTime: endT,
              meetingMode: data.meetingMode || "ONLINE",
              location: data.location || "",
              content: data.content || "",
              isCompany: data.isCompany || false,
              directCommand: data.directCommand || "",
              onlineMeeting: {
                platform: data.onlineMeeting?.platform || "ZOOM",
                meetingLink: data.onlineMeeting?.meetingLink || "",
                passcode: data.onlineMeeting?.passcode || "",
              },
              recurrence: (() => {
                const r = data.recurrence;
                if (!r || r.type === "KHONG") return { type: "", interval: 1, daysOfWeek: [] };
                
                const reverseDayMap = {
                  "MON": 2, "TUE": 3, "WED": 4, "THU": 5, "FRI": 6, "SAT": 7, "SUN": 8
                };

                const getFEType = (type) => {
                  const t = (type || "").toUpperCase();
                  if (t === "TUAN") return "Tuần";
                  if (t === "THANG") return "Tháng";
                  if (t === "NAM") return "Năm";
                  if (t === "TUY_CHINH" || t === "TUYCHINH") return "Tuỳ chỉnh";
                  if (t === "NGAY") return "Ngày";
                  if (t === "QUY") return "Quý";
                  return type;
                };

                return {
                  type: getFEType(r.type),
                  interval: r.intervalValue || r.interval || 1,
                  startDate: r.startDate ? dayjs(r.startDate) : null,
                  endDate: (r.endDate || r.endMonth) ? dayjs(r.endDate || r.endMonth) : null,
                  endYear: r.endYear || "",
                  daysOfWeek: (() => {
                    if (!r.daysOfWeek) return [];
                    const daysArr = Array.isArray(r.daysOfWeek) 
                      ? r.daysOfWeek 
                      : (typeof r.daysOfWeek === 'string' ? r.daysOfWeek.split(",") : []);
                    return daysArr.map(d => reverseDayMap[d]).filter(Boolean);
                  })()
                };
              })(),
            });
          }
        } catch (error) {
          toast(error?.message || "Lỗi khi tải thông tin lịch họp", "error");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchMeetingDetails();
  }, [open, meetingId, reset, toast]);

  const reconstructSelectedUnits = (data) => {
    const units = [];
    if (!data.units) return units;

    // BE now returns chairman and secretary as arrays of objects or single objects
    const chairInfo = data.chairman ? (Array.isArray(data.chairman) ? (data.chairman.length > 0 ? data.chairman[0] : null) : data.chairman) : null;
    const secInfo = data.secretary ? (Array.isArray(data.secretary) ? (data.secretary.length > 0 ? data.secretary[0] : null) : data.secretary) : null;

    const targetChairId = (chairInfo?.userId || data.chairmanId || "").toString().trim();
    const targetSecId = (secInfo?.userId || data.secretaryId || "").toString().trim();

    data.units.forEach(u => {
      const unitId = u.unitId;
      const unitIdStr = (unitId || "").toString().trim().toLowerCase();
      const unitName = u.unitName || unitId;
      
    const unitPrototype = {
      id: u.unitId,
      _id: u.unitId,
      recordId: u.id,
      name: unitName,
      title: unitName,
      types: 'organization_unit',
      roles: u.isRoomSelected === false ? {} : { participant: true },
      tasks: (u.tasks || []).filter(t => t.attachableType === "UNIT"),
      isRoomSelected: u.isRoomSelected,
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
          const pId = (p.userId || "").toString().trim().toLowerCase();
          // Nếu participant có ID trùng với unitId thì bỏ qua (đã được xử lý ở phần Unit phía trên)
          if (pId === unitIdStr && pId !== "") return;

          const isChair = pId === targetChairId;
          const isSec = pId === targetSecId;
        
        const roleInfo = isChair ? chairInfo : (isSec ? secInfo : null);

        units.push({
            id: p.userId,
            _id: p.userId,
            recordId: p.id,
          name: p.userName || p.userId,
          title: p.userName || p.userId,
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
          isNotParticipant: p.isNotParticipant
        });
      });
    }
    });
    
    // 3. Fallback: Ensure Chairman and Secretary are represented even if they weren't in any unit's participants
    const addRoleIfMissing = (info, roleKey, fallbackId) => {
        const userId = (info?.userId || fallbackId || "").toString().trim().toLowerCase();
        if (!userId) return;
        
        const existing = units.find(u => (u.id || u._id)?.toString().trim().toLowerCase() === userId);
        if (existing) {
            existing.roles[roleKey] = true;
            // logic cho user: nếu là chủ trì/thư ký thì không hiện ở tham dự nữa trừ khi là đơn vị
            if (existing.types !== 'organization_unit') {
                existing.roles.participant = false;
            }
            if (info) {
                existing.recordId = info.id || existing.recordId;
                existing.seatNumber = info.seatNumber || existing.seatNumber;
                existing.roomId = info.roomId || existing.roomId;
                
                // Merge tasks and deduplicate by ID
                const oldTasks = existing.tasks || [];
                const newTasks = info.tasks || [];
                const taskMap = new Map();
                oldTasks.forEach(t => taskMap.set(t.id, t));
                newTasks.forEach(t => taskMap.set(t.id, t));
                existing.tasks = Array.from(taskMap.values());

                existing.isNotParticipant = info.isNotParticipant !== undefined ? info.isNotParticipant : existing.isNotParticipant;
                if (info.userName) existing.name = info.userName;
            }
        } else {
            // BE trả về type: 'UNIT' trong secretary object
            const isUnit = info?.secretaryType === "UNIT" || info?.chairmanType === "UNIT" || info?.type === "UNIT";
            units.push({
                id: info?.userId || fallbackId,
                _id: info?.userId || fallbackId,
                recordId: info?.id,
                name: info?.userName || (info?.userId || fallbackId),
                title: info?.userName || (info?.userId || fallbackId),
                types: isUnit ? 'organization_unit' : 'user',
                roles: { participant: false, [roleKey]: true },
                seatNumber: info?.seatNumber || null,
                roomId: info?.roomId || null,
                tasks: info?.tasks || [],
                isNotParticipant: info?.isNotParticipant
            });
        }
    };

    addRoleIfMissing(chairInfo, 'chair', data.chairmanId);
    addRoleIfMissing(secInfo, 'secretary', data.secretaryId);

    // 4. Guests
    if (data.guests && data.guests.length > 0) {
      units.push({
        id: 'GUEST_GROUP',
        name: 'Khách mời',
        types: 'guest_group',
        roles: { participant: true },
        members: data.guests.map((g, idx) => ({
          id: g.id || `guest-${idx}`,
          recordId: g.id,
          name: g.guestName,
          title: g.guestName,
          position: g.guestTitle,
          types: 'guest',
          roles: { participant: true },
          parent: 'GUEST_GROUP',
          parentName: 'Khách mời',
          seatNumber: g.seatNumber,
          roomId: g.roomId
        }))
      });
    }

    return units;
  };

 

  const onSubmit = async (data) => {
     if (data.startTime && data.endTime) {
          const start = dayjs(data.startTime);
          const end = dayjs(data.endTime);
          
          const startH = start.hour();
          const startM = start.minute();
          const endH = end.hour();
          const endM = end.minute();
          
          if (startH > endH || (startH === endH && startM > endM)) {
            toast("Thời gian bắt đầu không được lớn hơn thời gian kết thúc", "error");
            return;
          }
        }
    
        // if (selectedUnits.length === 0) {
        //   toast("Vui lòng chọn đơn vị hoặc cá nhân tham gia", "error");
        //   return;
        // }
        if ((data.meetingMode === "OFFLINE" || data.meetingMode === "HYBRID") && selectedRooms.length === 0) {
          toast("Bạn chưa đăng ký phòng họp", "error");
          return;
        }

        // Kiểm tra nếu loại cuộc họp là "Họp đối tác" thì phải có khách mời
        const selectedMeetingType = timeOptions.find(opt => opt.value === data.meetingType);
        const isPartnerMeeting = selectedMeetingType?.title?.toLowerCase() === "họp đối tác";
        const hasGuests = selectedUnits.some(u => u.types === 'guest_group' && u.members?.length > 0);
        
        if (isPartnerMeeting && !hasGuests) {
          toast("Loại cuộc họp đối tác phải có ít nhất một khách mời", "error");
          return;
        }

    setIsLoading(true);

    try {
      // 1. Phân loại người tham gia từ selectedUnits
      const chairmanUser = selectedUnits.find(u => u.roles?.chair);
      const secretaryUser = selectedUnits.find(u => u.roles?.secretary);

      const mapRoleInfo = (user, roleStr) => {
        if (!user) return null;
        const uId = user.id || user._id;
        return {
          id: user.recordId || undefined,
          userId: uId,
          tasks: (user.tasks || []).filter(t => t.attachableRole === roleStr).map(t => ({
            id: t.id || undefined,
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
          if (item.recordId) {
            unitMap[uId].id = item.recordId;
          }
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
            unitMap[uId].participants.push({
                id: item.recordId || undefined,
                userId: item.id || item._id,
                seatNumber: item.seatNumber || null,
                roomId: item.roomId || null,
                tasks: (item.tasks || []).filter(t => t.attachableRole === "PARTICIPANT" || !t.attachableRole).map(t => ({
                  id: t.id || undefined,
                  attachableType: "PARTICIPANT",
                  content: t.content || "",
                  documentName: t.documentName || "",
                  deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
                }))
            });
        }

        // Xử lý chuẩn bị tài liệu (tasks) cho đơn vị
        if (isUnit && hasTasks) {
            const unitTasks = item.tasks.filter(t => t.attachableRole === "UNIT" || !t.attachableRole || (t.attachableRole !== "CHAIRMAN" && t.attachableRole !== "SECRETARY"));
            
            if (unitTasks.length > 0 && unitMap[uId].tasks.length === 0) {
                const mappedTasks = unitTasks.map(t => ({
                    id: t.id || undefined,
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
          id: meetingData?.onlineMeeting?.id,
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
              id: meetingData?.recurrence?.id,
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
              id: meetingData?.recurrence?.id,
              type: "TUY_CHINH",
              startDate: todayStr,
              endDate: r.endDate ? dayjs(r.endDate).format("YYYY-MM-DD") : null,
              intervalValue: String(r.interval)
            };
          }
          if (type === "MONTHLY" || type === "THANG") {
            return {
              id: meetingData?.recurrence?.id,
              type: "THANG",
              endMonth: r.endDate ? dayjs(r.endDate).format("YYYY-MM") : null
            };
          }
          if (type === "YEARLY" || type === "NAM") {
            return {
              id: meetingData?.recurrence?.id,
              type: "NAM",
              endYear: String(r.endYear)
            };
          }
          if (type === "DAILY" || type === "NGAY") {
            return {
              id: meetingData?.recurrence?.id,
              type: "NGAY",
              endDate: r.endDate ? dayjs(r.endDate).format("YYYY-MM-DD") : null
            };
          }
          return null;
        })(),
        tasks: [], // Giao tài liệu cấp cuộc họp
        units: Object.values(unitMap),
        guests: selectedUnits.find(u => u.types === 'guest_group')?.members?.map(m => ({
          id: m.recordId || undefined,
          guestName: m.name || m.title,
          guestTitle: m.position || "",
          seatNumber: m.seatNumber,
          roomId: m.roomId
        })) || [],
      };

      const recurrenceType = (data.recurrence?.type || "").toUpperCase();
      const isRecurringNow = recurrenceType && !["KHONG", "KHÔNG", "", "NONE"].includes(recurrenceType);
      const wasRecurring = meetingData?.recurrence && meetingData?.recurrence?.type && !["KHONG", "KHÔNG", "", "NONE"].includes(meetingData.recurrence.type.toUpperCase());

      if (isRecurringNow || wasRecurring) {
        setPendingPayload(payload);
        setOpenUpdateConfirm(true);
        setIsLoading(false);
        return;
      } else {
        setPendingPayload(payload);
        setOpenSimpleConfirm(true);
        setIsLoading(false);
        return;
      }

      // await axiosInstance.patch(`${API_ADD_MEETING_SCHEDULE}/${meetingId}`, payload);

      // toast("Cập nhật lịch họp thành công!", "success");
      // onSuccess?.();
      // onClose();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRecurrenceUpdate = async () => {
    if (!pendingPayload) return;
    setIsLoading(true);
    try {
      const finalPayload = {
        ...pendingPayload,
        isToday: recurrenceScope === "ONLY_THIS",
        isNextDay: recurrenceScope === "ALL_FOLLOWING"
      };

      // Call new recurrence update API first
      await axiosInstance.patch(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/update-recuring`, finalPayload);

      // Then call standard update API
      await axiosInstance.patch(`${API_ADD_MEETING_SCHEDULE}/${meetingId}`, pendingPayload);

      toast("Cập nhật chuỗi lịch họp thành công!", "success");
      onSuccess?.();
      onClose();
      setOpenUpdateConfirm(false);
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi cập nhật chuỗi lịch họp!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSimpleUpdate = async () => {
    if (!pendingPayload) return;
    setIsLoading(true);
    try {
      await axiosInstance.patch(`${API_ADD_MEETING_SCHEDULE}/${meetingId}`, pendingPayload);
      toast("Cập nhật lịch họp thành công!", "success");
      onSuccess?.();
      onClose();
      setOpenSimpleConfirm(false);
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseUpdateConfirm = useCallback(() => {
    setOpenUpdateConfirm(false);
  }, []);

  const handleCloseSimpleConfirm = useCallback(() => {
    setOpenSimpleConfirm(false);
  }, []);

  const handleRecurrenceScopeChange = useCallback((e) => {
    setRecurrenceScope(e.target.value);
  }, []);

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


  return (
    <BaseSwipper
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleSubmit(onSubmit, onInvalid)}
      type="add"
      hideBackdrop
       footer={
         <>
                  <FlexGrowBox />
                                <FooterActions>
        <ButtonOutline
          onClick={handleSubmit(onSubmit, onInvalid)}
          disabled={isLoading}
          variant="outlined"
        >
          Lưu
        </ButtonOutline>
        </FooterActions>
        </>
      }
    >
   
     

      <JobMainContent>
       
            {/* THÔNG TIN CHUNG */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
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
                                    <StyledDivider />
                    {/* )} */}
                  </Grid>

                  <Grid container spacing={3} mb={4}>
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
                        <Grid item xs={12} sm={6} md={6}>
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
                                helperText={errors.meetingDate?.message}
                                required
                                disabled={isLocked}
                                
                              />
                            )}
                          />
                        </Grid>

                        {/* Thời gian bắt đầu */}
                        <Grid item xs={12} sm={6} md={3} >
                          <Controller
                            name="startTime"
                            control={control}
                            render={({ field }) => (
                              <DateTimePicker
                                label="Thời gian bắt đầu"
                                value={field.value}
                                onChange={handleDateChange(field.onChange)}
                                timeOnly
                                error={!!errors.startTime}
                                helperText={errors.startTime?.message}
                                required
                                disabled={isLocked}
                                
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Controller
                            name="endTime"
                            control={control}
                            render={({ field }) => (
                              <DateTimePicker 
                                label="Thời gian kết thúc"
                                value={field.value}
                                onChange={handleDateChange(field.onChange)}
                                timeOnly
                                error={!!errors.endTime}
                                helperText={errors.endTime?.message}
                                required
                                disabled={isLocked}
                                
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
                                  disabled={isLocked}
                                />
                              );
                            }}
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
              </Grid>

              {/* <StyledGridCustomComment item xs={12} md={4}>
                <StyleBoxComent type="outgoing">
                  <CustomComment
                    documentId={meetingId}
                    comments={comments}
                    type="outgoing"
                    styledMaxHeightCommentListContainer="630px"
                  // noneTitle
                  />
                </StyleBoxComent>
              </StyledGridCustomComment> */}
            </Grid>

            <ParticipatingUnits
              open={openParticipatingUnits}
              onClose={handleCloseParticipatingUnits}
              onSave={handleParticipatingUnitsSave}
              initialSelectedUnits={selectedUnits}
              dialogKey="internalUnit"
              control={control}
              excludeMeetingId={meetingId}
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

            <RecurringMeetingConfigModal
              open={openRecurrenceModal}
              onClose={handleRecurrenceClose}
              onSave={handleRecurrenceSave}
              type={pendingRecurrenceType}
              initialData={watch("recurrence")}
              sharedComponents={sharedComponents}
            />
            
            <RegisterForMeetingRooms 
              control={control} 
              errors={errors} 
              sharedComponents={sharedComponents} 
              selectedUnits={selectedUnits}
              onOpenParticipatingUnits={handleOpenParticipatingUnits}
              isView={false}
              meetingData={meetingData}
              initialRooms={meetingData?.roomIds?.length ? meetingData.roomIds : [{ id: 'strongboy', name: 'PHÒNG HỌP STRONGBOY', capacity: 50, image: '', stage: 'Sẵn sàng' }]}
              onRoomChange={setSelectedRooms}
              onUpdateParticipants={setSelectedUnits}
              onOpenPrepareDocs={handleOpenPrepareDocs}
            />

            <Dialog
              open={openUpdateConfirm}
              onClose={handleCloseUpdateConfirm}
              onSave={handleConfirmRecurrenceUpdate}
              title="Xác nhận lưu chỉnh sửa"
              titleButton="Xác nhận"
              cancelString="Hủy"
              isLoading={isLoading}
            >
              <Box p={2}>
                 <ConfirmScopeTitle variant="body1">
                  Lịch họp này thuộc một chuỗi lịch lặp. Vui lòng chọn phạm vi lưu chỉnh sửa.
                </ConfirmScopeTitle>
                <RadioGroup
                  value={recurrenceScope}
                  onChange={handleRecurrenceScopeChange}
                >
                  <FormControlLabel 
                    value="ONLY_THIS" 
                    control={<ConfirmScopeRadio />} 
                    label={
                      <ConfirmScopeLabel 
                        variant="body1" 
                        active={recurrenceScope === 'ONLY_THIS'}
                      >
                        Chỉ áp dụng phiên họp này
                      </ConfirmScopeLabel>
                    } 
                  />
                  <FormControlLabel 
                    value="ALL_FOLLOWING" 
                    control={<ConfirmScopeRadio />} 
                    label={
                      <ConfirmScopeLabel 
                        variant="body1" 
                        active={recurrenceScope === 'ALL_FOLLOWING'}
                        dimmed={recurrenceScope !== 'ALL_FOLLOWING'}
                      >
                        Áp dụng phiên này và các phiên sau
                      </ConfirmScopeLabel>
                    } 
                  />
                </RadioGroup>
              </Box>
            </Dialog>

            <Dialog
              open={openSimpleConfirm}
              onClose={handleCloseSimpleConfirm}
              onSave={handleConfirmSimpleUpdate}
              title="Xác nhận lưu chỉnh sửa"
              titleButton="Xác nhận"
              cancelString="Hủy"
              isLoading={isLoading}
              
            >
              <Box p={2}>
                 <ConfirmScopeTitle variant="body1">
                  Xác nhận lưu lịch họp &quot;{watch("title")}&quot; các thông tin sau khi điều chỉnh sẽ được gửi đến các thành phần tham gia
                </ConfirmScopeTitle>
              </Box>
            </Dialog>
        
      
      </JobMainContent>
    </BaseSwipper>
  );
};

export default withSharedComponents(UpdateMeetingSchedule);
