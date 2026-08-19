import React, { useEffect, useCallback, useMemo } from "react";
import {
  Grid,
  styled,
  FormControlLabel,
  Checkbox,
  TableCell,

  TableRow,
  Box,
  Typography,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { withFormWrapper } from "@components/common/FormWrapper";
import CustomTableBorderTree from "@components/CustomTable/CustomTableBorderTree";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import {
  getCommentsByDocument,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import CustomComment from "@components/CustomComment";
// import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
// import { apiUploadFile } from "@services/FileUpload/fileUpload";
import {
  AbstractSummaryBox,
  AbstractSummaryContent,
  AbstractSummaryTitle,
  AbstractSummaryText,
  StyledInfoIcon,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import FormButton from "@components/FormButton";
import { typeFlagMap } from "@components/FormButton/constant";

import * as yup from "yup";

import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE, API_JOB_TO_MEETING } from "@EnvironmentFile/constants/urlConfig";


import { useToast } from "@components/common/ToastProvider";
import {
  JobMainContent,

  // JobSectionTitle,
  StyledBoxContainerContent,
  ParticipantHeader,
  ParticipantStats,
  StatItem,
  BoardSection,
  BoardGrid,
  BoardCard,
  // BoardIconBox,
  BoardInfo,
  BoardLabel,
  BoardName,
  BoardTitle,
  AttendanceSection,
  EmptyStateText,
  DepartmentAccordion,
  DepartmentHeader,
  DepartmentTitle,
  DepartmentName,
  BoardGridContainer,
  // ActionLink,
  DepartmentContent,
  // ParticipantRow,
  // DocumentBox,
  // DocumentTitle,
  // DocumentInfoRow,
  // DocumentLabel,
  // DocumentValue,
  EditParticipantButton,
  SectionSubtitle,
  // StatDivider,
  // ParticipantName,
  // StyledAddIcon,
  // DocumentHeaderBox,
  // DocumentActionIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  // StatusBadge,
  // ParticipantRowContent,
  // GreyCaption,
  StatsSummary,
  StatText,
  DepartmentStats,
  ParticipantAvatarBox,
  ParticipantContent,
  ParticipantStatus,
  ParticipantCard,
  StatChip,
  BoardAvatar,
  GreyCaption,
  // GreenButtonOutline,
  // FlexCenterGap16,
  // FlexGrowBox,
  // BoldSubtitle,
  UppercaseBoldSubtitle,
  FlexSpaceBetweenCenterBox,
  TaskActionBox,
  // GreyCaptionWithMargin,
  // BoxMarginTop2,
  // FlexSpaceBetweenBox,
  // FlexOneBox,
  // StyledTableContainer,
  // StyledHeaderCell,
  // StyledHeaderCellWithWidth,
  ErrorIconButton,
  // SectionHeaderContainer,
  BoldCompanyLabel,
  CompanyCheckbox,
  // StyledDownloadIcon,
  // FileItemContainer,
  // FileRowInfo,
  // FileDescriptionBox,
  // FileNameButton,
  // FileMetaRow,
  // FileMeta,
  // StyledInsertDriveFileIcon,
  MeetingStatsBanner,
  MeetingStatsDetailsRow,
  MeetingStatPill,
  StyledPeopleIcon,
  FlexAlignCenterGap,
  FlexJustifyBetweenAlignCenterMargin,
  FlexGap,
  EmptyDocumentText,
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";


// import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
// import DescriptionIcon from "@mui/icons-material/Description";
import CheckIcon from "@mui/icons-material/Check";
import WarningIcon from "@mui/icons-material/Warning";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import ParticipatingUnits from "./ParticipatingUnits";
import RegisterForMeetingRooms from "./RegisterForMeetingRooms";
import PrepareDocuments from "./PrepareDocuments";
import MeetingManagement from "./MeetingManagement";
import MeetingConclusion from "./MeetingConclusion";
import MeetingAttendance from "./MeetingAttendance";
import MeetingDocuments from "./MeetingDocuments";
import UpdateMeetingSchedule from "./UpdateMeetingSchedule";
import { CustomDialog } from "@components/CustomDialog";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import MeetingTasksPreparation from "./MeetingTasksPreparation";
import AddNewJob from "@pages/WorkManagement/components/AddJobToMeeting";
import ViewJobToMeeting from "@pages/WorkManagement/components/ViewJobToMeeting";
import ManagePersonalMeetingSchedules from "./ManagePersonalMeetingSchedules";

const RecurrenceSummaryBox = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(0.5),
  display: 'flex',
  alignItems: 'center',
}));

const RecurrenceSummaryText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.primary,
  fontWeight: 500,
}));

const BadgeContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isDone',
})(({ theme, $isDone }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: $isDone
      ? (isDark ? "rgba(76, 175, 80, 0.15)" : "#E8F5E9")
      : (isDark ? "rgba(255, 152, 0, 0.15)" : "#FFF8E1"),
    color: $isDone
      ? (isDark ? "#81c784" : "#2E7D32")
      : (isDark ? "#ffb74d" : "#F57C00"),
    borderRadius: "24px",
    padding: "4px 12px",
    marginLeft: "16px",
    cursor: "pointer",
    height: "32px",
    border: `1px solid ${$isDone
      ? (isDark ? "rgba(76, 175, 80, 0.3)" : "#C8E6C9")
      : (isDark ? "rgba(255, 152, 0, 0.3)" : "#FFE0B2")
      }`,
  };
});

const HexagonIcon = styled(Box)(({ theme }) => ({
  width: "24px",
  height: "24px",
  backgroundColor: theme.palette.mode === 'dark' ? "#f57c00" : "#FF9800",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  marginRight: "12px",
  minWidth: "24px",
}));

const CircleIcon = styled(Box)(({ theme }) => ({
  width: "16px",
  height: "16px",
  backgroundColor: theme.palette.mode === 'dark' ? "#f57c00" : "#F57C00",
  borderRadius: "50%",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginRight: "8px",
}));

const TooltipRow = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  marginBottom: "12px",
  "&:last-child": {
    marginBottom: 0,
  },
}));

// const TitleWrapper = styled(Box)(() => ({
//   display: "flex", 
//   alignItems: "center",
//   whiteSpace: "nowrap"
// }));

const StyledGridActions = styled(Grid)(() => ({
  display: "flex",
  alignItems: "center",
}));

const StyledTooltipContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
}));

const StyledSmallPriorityHighIcon = styled(PriorityHighIcon)(() => ({
  fontSize: 12,
}));

const StyledMediumPriorityHighIcon = styled(PriorityHighIcon)(() => ({
  fontSize: 16,
}));

const StyledBadgeText = styled(Typography)(() => ({
  fontWeight: 600,
  fontSize: "12px",
}));

const StyledTooltipText = styled(Typography)(() => ({
  fontSize: "14px",
  whiteSpace: "nowrap",
}));

const StatusDoneIconBox = styled(Box)(() => ({
  width: 24,
  height: 24,
  marginRight: "12px",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledCheckIcon = styled(CheckIcon)(({ theme }) => ({
  color: theme.palette.success.main,
  fontSize: 22,
  fontWeight: 'bold',
}));

const DoneIconWrapper = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  marginRight: '8px',
}));

const SmallCheckIcon = styled(CheckIcon)(() => ({
  fontSize: 18,
  fontWeight: 'bold',
}));

const ProcessingStatusBadge = ({ status }) => {
  const items = [
    status?.needConfirmation === false ? null : { key: 'acceptJoinuUser', label: "Xác nhận tham gia" },
    (status?.isChairman || status?.isSecretary || status?.hasDocumentUser == false) ? null : { key: 'prepareDocumentUser', label: "Chuẩn bị tài liệu họp" },
  ].filter(Boolean);

  const pendingCount = items.filter(item => !status?.[item.key]).length;
  const isDone = pendingCount === 0 || status?.needConfirmation === false;

  return (
    <Tooltip
      title={
        items.length > 0 ? (
          <StyledTooltipContent>
            {items.map((item, index) => {
              const itemDone = !!status?.[item.key];
              return (
                <TooltipRow key={index}>
                  {itemDone ? (
                    <StatusDoneIconBox>
                      <StyledCheckIcon />
                    </StatusDoneIconBox>
                  ) : (
                    <HexagonIcon>
                      <StyledMediumPriorityHighIcon />
                    </HexagonIcon>
                  )}
                  <StyledTooltipText
                    variant="body1"
                  >
                    {item.label}
                  </StyledTooltipText>
                </TooltipRow>
              );
            })}
          </StyledTooltipContent>
        ) : ""
      }
      disableHoverListener={items.length === 0}
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: "background.paper",
            color: "text.primary",
            boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
            maxWidth: "none",
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      <BadgeContainer
        $isDone={isDone}
      >
        {isDone ? (
          <DoneIconWrapper>
            <SmallCheckIcon />
          </DoneIconWrapper>
        ) : (
          <CircleIcon>
            <StyledSmallPriorityHighIcon />
          </CircleIcon>
        )}
        <StyledBadgeText
          variant="caption"
        >
          {isDone ? "Hoàn thành xử lý" : `Có ${pendingCount} việc cần xử lý`}
        </StyledBadgeText>
      </BadgeContainer>
    </Tooltip>
  );
};

const getRecurrenceSummaryText = (recurrence) => {
  if (!recurrence || !recurrence.typeOrigin || recurrence.typeOrigin === "KHONG") return null;

  const endDateStr = recurrence.endDate ? dayjs(recurrence.endDate).format("DD/MM/YYYY") : "";
  const type = recurrence.typeOrigin.toUpperCase();

  if (type === "NGAY") {
    return `Lịch họp lặp lại hàng ngày${endDateStr ? ` - Cho đến ngày ${endDateStr}` : ""}`;
  }

  if (type === "TUAN") {
    const daysMap = {
      "MON": "thứ 2",
      "TUE": "thứ 3",
      "WED": "thứ 4",
      "THU": "thứ 5",
      "FRI": "thứ 6",
      "SAT": "thứ 7",
      "SUN": "Chủ nhật"
    };
    let days = recurrence.daysOfWeek || [];
    if (typeof days === 'string') {
      days = days.split(",");
    }
    const formattedDays = days.map(d => daysMap[d.trim().toUpperCase()] || d).join(", ");
    return `Lịch họp lặp lại vào ${formattedDays} hàng tuần${endDateStr ? ` - Cho đến ngày ${endDateStr}` : ""}`;
  }

  if (type === "THANG") {
    return `Lịch họp lặp lại vào ngày ${recurrence.dayOfMonth} hàng tháng${endDateStr ? ` - Cho đến ngày ${endDateStr}` : ""}`;
  }

  if (type === "NAM") {
    const [month, day] = (recurrence.dayOfYear || "").split("-");
    const formattedDayOfYear = (day && month) ? `${day}/${month}` : "";
    return `Lịch họp lặp lại vào ngày ${formattedDayOfYear} hàng năm${endDateStr ? ` - Cho đến ngày ${endDateStr}` : ""}`;
  }

  return null;
};


const MemberItem = React.memo(({ member, noStatus }) => {
  const getStatusBadge = (member) => {
    if (noStatus) return null;
    if (member.isNotParticipant === true) {
      return <ParticipantStatus type="error">Xác nhận không tham gia</ParticipantStatus>;
    } else if (member.isConfirmed === true || member.status === "ACCEPTED") {
      return <ParticipantStatus type="success">Đã xác nhận tham gia</ParticipantStatus>;
    } else if (member.isDelegated || member.status === "DELEGATED") {
      return <ParticipantStatus type="success">Được ủy quyền tham gia</ParticipantStatus>;
    } else {
      return <ParticipantStatus>Chưa xác nhận tham gia</ParticipantStatus>;
    }
  };

  return (
    <Grid item xs={12} md={6}>
      <ParticipantCard>
        <ParticipantAvatarBox src={member.avatar || ""} alt={member.title || member.name}>
          {(member.title || member.name || "?").charAt(0)}
        </ParticipantAvatarBox>
        <ParticipantContent>
          <BoardName $small>{member.title || member.name}</BoardName>
          <BoardTitle>{member.position || member.parentName || "---"}</BoardTitle>
          {member.delegateInfo && (
            <GreyCaption variant="caption" $block>
              {` Được ủy quyền bởi ${member.delegateInfo}`}
            </GreyCaption>
          )}
        </ParticipantContent>
        {getStatusBadge(member)}
      </ParticipantCard>
    </Grid>
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
          <DeleteIcon />
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
        <DepartmentTitle $full>
          <DepartmentName $uppercase>{group.name}</DepartmentName>
          {totalCount > 0 ? (
            <DepartmentStats>
              <StatChip colorType="green" $noBackground>Cá nhân xác nhận tham gia : {confirmedCount} / {totalCount}</StatChip>
              {rejectedCount > 0 && <StatChip colorType="red" $noBackground> | Không tham gia : {rejectedCount}</StatChip>}
            </DepartmentStats>
          ) : (
            <DepartmentStats>
              {group.status === 'ACCEPTED' ? (
                <StatChip colorType="green" $noBackground>Đã xác nhận tham gia</StatChip>
              ) : group.status === 'REJECTED' ? (
                <StatChip colorType="red" $noBackground>Xác nhận không tham gia</StatChip>
              ) : (
                <StatChip colorType="grey" $noBackground>Chưa xác nhận tham gia</StatChip>
              )}
              <GreyCaption variant="caption">| Chưa gán người tham gia</GreyCaption>
            </DepartmentStats>
          )}
        </DepartmentTitle>
        {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </DepartmentHeader>
      {isExpanded && (
        <DepartmentContent $slate>
          {group.members.length > 0 ? (
            <Grid container spacing={2}>
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
            </Grid>
          ) : (
            <EmptyDocumentText>
              Chưa gán người tham gia
            </EmptyDocumentText>
          )}
        </DepartmentContent>
      )}
    </DepartmentAccordion>
  );
});
AttendanceGroupItem.displayName = "AttendanceGroupItem";
const CommentContainer = styled(StyledBoxContainerContent)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  position: "relative",
  // paddingBottom: "80px",
  marginBottom: theme.spacing(2),
  height: '606px',
  overflowY: 'auto',
}));

const StyledGridColumn = styled(Grid)(() => ({
  display: "flex",
  flexDirection: "column",
  position: "relative",
}));

const StyledGridContainer = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  alignItems: "stretch",
}));


const ViewMeetingSchedulePopup = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Chi tiết lịch họp",
  meetingId,
  // ishandlermeeting = false,
  // isparticipant = false,
  listparammeeting,
}) => {
  const {
    // BaseSwipper,
    InputComponents: BaseInput,
    ButtonOutline,
    // AsyncAutoCompleted,
    DateTimePicker: BaseDateTimePicker,
    CustomTabsWithBadge,
  } = sharedComponents;
  const isView = true;
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput, isView]);

  const DateTimePicker = useMemo(() => {
    const Wrapped = withFormWrapper(BaseDateTimePicker, "date");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
    Component.displayName = "DatePicker";
    return Component;
  }, [BaseDateTimePicker, isView]);
  const { crmSource } = useSelector((state) => state.config);
  const optionModeOfWork =
    crmSource.find((item) => item.code === "LICHDINHKY")?.data || [];
  const urgencyOptions =
    crmSource.find((item) => item.code === "DOUUTIENLH")?.data || [];
  const timeOptions =
    crmSource.find((item) => item.code === "LQH")?.data || [];

  // const userData = React.useMemo(() => {
  //   try {
  //     return JSON.parse(localStorage.getItem("userData") || "{}");
  //   } catch (e) {
  //     return {};
  //   }
  // }, []);

  // const isHeadCompany = userData?.user?.parent?.isHeadCompany === true;

  const schema = yup.object().shape({
    title: yup.string().required("Vui lòng nhập tiêu đề cuộc họp"),
    meetingType: yup.string().required("Vui lòng chọn loại lịch họp"),
    priority: yup.string().required("Vui lòng chọn mức độ ưu tiên"),
    meetingDate: yup.date().required("Vui lòng chọn ngày họp").typeError("Ngày họp không hợp lệ"),
    startTime: yup.date().required("Vui lòng chọn thời gian bắt đầu").typeError("Thời gian bắt đầu không hợp lệ"),
    endTime: yup.date().required("Vui lòng chọn thời gian kết thúc").typeError("Thời gian kết thúc không hợp lệ"),
    meetingMode: yup.string().required("Vui lòng chọn hình thức họp"),
    directCommand: yup.string(),
    onlineMeeting: yup.object().shape({
      platform: yup.string().when("$meetingMode", {
        is: (val) => val === "ONLINE" || val === "BOTH",
        then: (schema) => schema.required("Vui lòng nhập nền tảng họp"),
        otherwise: (schema) => schema.nullable(),
      }),
      // meetingLink: yup.string().when("$meetingMode", {
      //   is: (val) => val === "ONLINE" || val === "BOTH",
      //   then: (schema) => schema.required("Vui lòng nhập link họp"),
      //   otherwise: (schema) => schema.nullable(),
      // }),
    }),
  });

  const {
    control,
    // handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    context: { meetingMode: "BOTH" },
    defaultValues: {
      title: "",
      meetingType: "",
      priority: "",
      isCompany: false,
      meetingDate: null,
      startTime: null,
      endTime: null,
      meetingMode: "BOTH",
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

  const [isLoading, setIsLoading] = React.useState(false);
  const [meetingData, setMeetingData] = React.useState(null);
  const [tabIndex, setTabIndex] = React.useState(0);
  const [expandedSections, setExpandedSections] = React.useState([]);
  const [openParticipatingUnits, setOpenParticipatingUnits] = React.useState(false);
  const [availableActions, setAvailableActions] = React.useState([]);
  const [workItem, setWorkItem] = React.useState(null);
  const [selectedUnits, setSelectedUnits] = React.useState([]);
  const [participants, setParticipants] = React.useState([]);
  const toast = useToast();
  const [totalParticipants, setTotalParticipants] = React.useState(0);
  const [openPrepareDocs, setOpenPrepareDocs] = React.useState(false);
  const [docAssignee, setDocAssignee] = React.useState(null);
  // const [taskFiles, setTaskFiles] = React.useState({});
  // const [isTasksExpanded, setIsTasksExpanded] = React.useState(true);
  const [meetingTasks, setMeetingTasks] = React.useState([]);
  const [userRoles, setUserRoles] = React.useState({
    isChairman: false,
    isSecretary: false,
    isParticipant: false,
    isParticipantInCurrentUnit: false,
    isPersonalApprove: false,
    isCreatedByMe: false,
    isMeetingApproved: false,
    isSeatAssignment: false,
    isApproverList: false,
    isShowButtonCreateWork: false,
    proceesMeeting: false,
    isCompanyUnitDetail: false,
  });
  const [checkInStats, setCheckInStats] = React.useState(null);
  const dispatch = useDispatch();
  const [attendanceStatus, setAttendanceStatus] = React.useState(null);
  const [openLockConfirm, setOpenLockConfirm] = React.useState(false);
  const [canAccessMeetingTabs, setCanAccessMeetingTabs] = React.useState(true);
  const hasAnyRole = React.useMemo(() =>
    !!(userRoles.isChairman || userRoles.isSecretary || userRoles.isParticipant || userRoles.isParticipantInCurrentUnit || userRoles.isMeetingApproved || userRoles.isApproverListed || userRoles.isCompanyUnitDetail),
    [userRoles]);

  const [meetingTasksListData, setMeetingTasksListData] = React.useState([]);
  const [isTasksListLoading, setIsTasksListLoading] = React.useState(false);
  const [openAddJob, setOpenAddJob] = React.useState(false);
  const [taskSummary, setTaskSummary] = React.useState({
    total: 0,
    completed: 0,
    processing: 0,
    overdue: 0,
  });
  const [openHandleMeetingSchedules, setOpenHandleMeetingSchedules] = React.useState(false);
  const [personalMeetingActionCode, setPersonalMeetingActionCode] = React.useState("");
  const [openViewJob, setOpenViewJob] = React.useState(false);
  const [viewingJob, setViewingJob] = React.useState(null);

  const recurrenceSummary = React.useMemo(() => {
    return getRecurrenceSummaryText(meetingData?.recurrence);
  }, [meetingData?.recurrence]);

  const handleOpenAddJob = useCallback(() => {
    setOpenAddJob(true);
  }, []);

  const handleCloseAddJob = useCallback(() => {
    setOpenAddJob(false);
  }, []);

  const handleCloseViewJob = useCallback(() => {
    setOpenViewJob(false);
    setViewingJob(null);
  }, []);

  const handleTaskAction = useCallback((action, row) => {
    if (action.id === "view-job-detail") {
      setViewingJob(row);
      setOpenViewJob(true);
    }
  }, []);

  // const handleToggleTasksExpanded = useCallback(() => {
  //   setIsTasksExpanded((prev) => !prev);
  // }, []);

  // const handleFileSelect = useCallback((event, taskId) => {
  //   const files = Array.from(event.target.files);
  //   setTaskFiles(prev => ({
  //     ...prev,
  //     [taskId]: [
  //       ...(prev[taskId] || []),
  //       ...files.map(file => ({ file, isImportant: false }))
  //     ]
  //   }));
  // }, []);

  // const handleRemoveFile = useCallback((taskId, fileIdx) => {
  //   setTaskFiles(prev => ({
  //     ...prev,
  //     [taskId]: prev[taskId].filter((_, i) => i !== fileIdx)
  //   }));
  // }, []);

  // const handleToggleImportant = useCallback((taskId, fileIdx) => {
  //   setTaskFiles(prev => ({
  //     ...prev,
  //     [taskId]: prev[taskId].map((item, i) => 
  //       i === fileIdx ? { ...item, isImportant: !item.isImportant } : item
  //     )
  //   }));
  // }, []);

  const handleToggleGroup = useCallback((id) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleToggleGuests = useCallback(() => {
    handleToggleGroup('guests');
  }, [handleToggleGroup]);

  // const handleAddTaskToGroup = useCallback((e, group) => {
  //   e.stopPropagation();
  //   handleOpenPrepareDocs(group._originalUnit || { id: group.id, name: group.name, types: 'organization_unit' });
  // }, []);

  const handleAddTaskToMember = useCallback((member) => {
    handleOpenPrepareDocs(member);
  }, []);

  const handleOpenPrepareDocs = useCallback((assignee) => {
    setDocAssignee(assignee);
    setOpenPrepareDocs(true);
  }, []);
  const { commentsList: comments } = useSelector(
    (state) => state.unit
  );
  const meetingConclusionRef = React.useRef(null);


  const tabs = React.useMemo(() => {
    const list = [{ label: "Thông tin lịch", id: 'info' }];

    // If canAccessMeetingTabs is false, show only the default tab
    if (canAccessMeetingTabs === false || canAccessMeetingTabs === "false") {
      return list;
    }

    if (!userRoles.isChairman && !userRoles.isSecretary && (userRoles.isParticipant || userRoles.isParticipantInCurrentUnit)) {
      list.push({ label: "Tham dự cuộc họp", id: 'attendance' });
    }
    if (userRoles.isChairman || userRoles.isSecretary) {
      list.push({ label: "Điều hành cuộc họp", id: 'management' });
    }
    if (userRoles.isChairman || userRoles.isSecretary || userRoles.isParticipant || userRoles.isParticipantInCurrentUnit) {
      list.push({ label: "Kết luận cuộc họp", id: 'conclusion' });
    }
    return list;
  }, [userRoles, canAccessMeetingTabs]);

  const activeTabId = tabs[tabIndex]?.id;

  const handleTabChange = useCallback((event, newValue) => {
    setTabIndex(newValue);
  }, []);

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

  // const handleOpenPrepareDocs = useCallback((assignee) => {
  //   setDocAssignee(assignee);
  //   setOpenPrepareDocs(true);
  // }, []);

  const handleClosePrepareDocs = useCallback(() => {
    setOpenPrepareDocs(false);
    setDocAssignee(null);
  }, []);



  // Group participants by unit
  const attendanceGroups = React.useMemo(() => {
    const groups = {};

    // Process units first to establish headers if they are explicitly selected
    selectedUnits.forEach(item => {
      const isUnit = item.types === 'organization_unit';
      if (isUnit) {
        const uId = item.id || item._id;
        if (!groups[uId]) {
          groups[uId] = {
            id: uId,
            name: item.name || item.title,
            members: [],
            tasks: item.tasks || [],
            status: item.status,
            _originalUnit: item
          };
        }
      }
    });

    // Process all selected items to assign participants to groups
    selectedUnits.forEach(item => {
      if (!item.roles?.participant) return;

      const isUnit = item.types === 'user' ? false : true;
      if (isUnit || item.types === 'guest' || item.id === 'GUEST_GROUP') return; // units and guests are handled differently

      const uId = item.parent;
      const uName = item.parentName || item.unitName || "Đơn vị khác";

      if (!groups[uId]) {
        groups[uId] = {
          id: uId,
          name: uName,
          members: [],
          tasks: [],
          _originalUnit: null
        };
      }

      groups[uId].members.push(item);
    });

    return Object.values(groups);
  }, [selectedUnits]);

  const guests = React.useMemo(() => {
    const guestGroup = selectedUnits.find(u => u.id === 'GUEST_GROUP' || u.types === 'guest_group');
    if (guestGroup && guestGroup.members) {
      return guestGroup.members;
    }
    return selectedUnits.filter(u => u.types === 'guest' || u.isGuest);
  }, [selectedUnits]);

  const attendanceStats = React.useMemo(() => {
    if (meetingData?.participantSummary) {
      return {
        total: meetingData.participantSummary.totalPeople || 0,
        confirmed: meetingData.participantSummary.joined || 0,
        rejected: meetingData.participantSummary.notJoined || 0,
        totalGuests: meetingData.participantSummary.totalGuests || 0,
        pending: meetingData.participantSummary.unconfirmed || 0,
        unitsTotal: meetingData.unitConfirmSummary.total || 0,
        unitsConfirmed: meetingData.unitConfirmSummary.confirmed || 0,
        unitsRejected: meetingData.unitConfirmSummary.notConfirmed || 0
      };
    }
    const individualParticipants = selectedUnits.filter(u => u.types === 'user' && u.roles?.participant);
    const guestParticipants = guests;
    const total = individualParticipants.length + guestParticipants.length;
    const confirmed = individualParticipants.filter(m => m.status === "ACCEPTED").length;
    const rejected = individualParticipants.filter(m => m.status === "REJECTED").length;
    const pending = total - confirmed - rejected;

    const units = selectedUnits.filter(u => u.types === 'organization_unit');
    const unitsTotal = units.length;
    const unitsConfirmed = units.filter(u => u.status === "ACCEPTED").length;
    const unitsRejected = units.filter(u => u.status === "REJECTED").length;

    return { total, confirmed, rejected, pending, unitsTotal, unitsConfirmed, unitsRejected };
  }, [selectedUnits, meetingData]);

  const chairman = React.useMemo(() => selectedUnits.find(u => u.roles?.chair), [selectedUnits]);
  const secretary = React.useMemo(() => selectedUnits.find(u => u.roles?.secretary), [selectedUnits]);

  // const handleAddTaskToGroup = useCallback((e, group) => {
  //   e.stopPropagation();
  //   handleOpenPrepareDocs(group._originalUnit || { id: group.id, name: group.name, types: 'organization_unit' });
  // }, [handleOpenPrepareDocs]);

  // const handleAddTaskToMember = useCallback((member) => {
  //   handleOpenPrepareDocs(member);
  // }, [handleOpenPrepareDocs]);

  const handlePrepareDocsSave = (docData) => {
    if (!docAssignee) return;

    setSelectedUnits(prev => {
      const assigneeId = docAssignee.id || docAssignee._id;
      const exists = prev.some(item => (item.id || item._id) === assigneeId);

      if (exists) {
        return prev.map(item => {
          if ((item.id || item._id) === assigneeId) {
            return {
              ...item,
              tasks: [...(item.tasks || []), docData]
            };
          }
          return item;
        });
      } else {
        // If it doesn't exist (e.g. a unit that wasn't explicitly selected in the tree but we want to assign a task to it)
        return [...prev, { ...docAssignee, tasks: [docData] }];
      }
    });
  };






  const handleDateChange = useCallback((onChange) => {
    return (date) => {
      onChange(date);
    };
  }, []);

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
          meetingMode: "BOTH",
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
      dispatch(getCommentsByDocument({ documentId: meetingId, type: "meeting" }));
    }
  }, [open, meetingId, dispatch]);

  // Fetch participants
  const fetchParticipants = useCallback(async (customParams = {}) => {
    if (open && meetingId) {
      try {
        const params = {
          page: 1,
          limit: 1000,
          ...customParams
        };
        // Updated to use the new API endpoint
        const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/participants`, {
          params: params
        });

        // Handle response structure { success: true, data: { participants: [...] } }
        const data = response?.data?.data || response?.data || response;
        const participantList = data?.participants || [];

        if (Array.isArray(participantList)) {
          // Normalize data for child components
          const formattedParticipants = participantList.map(item => ({
            id: item.user?.id,
            participantId: item.participantId,
            name: item.user?.name,
            // Map participantRole array to a string title
            title: Array.isArray(item.participantRole) ? item.participantRole.join(", ") : item.participantRole,
            position: Array.isArray(item.participantRole) ? item.participantRole.join(", ") : item.participantRole, // Fallback
            organizationUnit: {
              id: item.orgUnit?.id,
              name: item.orgUnit?.name,
            },
            // Map attendanceState to status (Keep raw HTML for UI)
            status: item.isConfirmed === true ? 'ACCEPTED' : (item.isConfirmed === false ? 'REJECTED' : item.attendanceState),
            notCheck: item.notCheck,
            // Keep original for reference if needed
            _original: item
          }));

          setParticipants(formattedParticipants);
          setTotalParticipants(data?.totalParticipants || 0);
          // Set attendance stats from API
          setCheckInStats({
            total: data?.totalParticipants || 0,
            noNeed: data?.notCheckCount || 0,
            present: data?.presentCount || 0,
            absent: data?.absentCount || 0,
            waiting: data?.notCheckedInCount || 0,
          });
        }
      } catch (error) {
        logger.error("Error fetching participants:", error);
      }
    }
  }, [open, meetingId]);

  useEffect(() => {

    fetchParticipants();
  }, [fetchParticipants]);

  // Fetch specialized meeting tasks (UNIT type)
  // Fetch specialized meeting tasks (UNIT type)
  const fetchMeetingTasks = useCallback(async () => {
    if (open && meetingId) {
      try {
        const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/tasks?type=user`);
        if (Array.isArray(response)) {
          setMeetingTasks(response);
        } else if (response?.success && response?.data) {
          setMeetingTasks(response.data);
        }
      } catch (error) {
        logger.error("Error fetching meeting tasks:", error);
      }
    }
  }, [open, meetingId]);

  useEffect(() => {
    fetchMeetingTasks();
  }, [fetchMeetingTasks]);





  // Fetch data when meetingId is provided
  const fetchMeetingDetails = useCallback(async () => {
    if (open && meetingId) {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}`, {
          params: {
            listparammeeting: listparammeeting || undefined,
          }
        });
        // console.log(response, "response")
        if (response && response.meeting) {
          const data = response.meeting;
          // console.log(data, "data")

          // Extract times for display in tabs
          if (data.meetingTime) {
            const [startTime, endTime] = data.meetingTime.split("-");
            data.startTime = startTime;
            data.endTime = endTime;
          }

          setMeetingData({
            ...data,
            isChairman: !!(response.isChairman || response.data?.isChairman || response.meeting?.isChairman),
            isSecretary: !!(response.isSecretary || response.data?.isSecretary || response.meeting?.isSecretary),
            isParticipant: !!(response.isParticipant || response.data?.isParticipant || response.meeting?.isParticipant),
          });
          const roles = {
            isShowButtonCreateWork: !!(response.isShowButtonCreateWork || response.data?.isShowButtonCreateWork || response.meeting?.isShowButtonCreateWork),
            isChairman: !!(response.isChairman || response.data?.isChairman || response.meeting?.isChairman),
            isSecretary: !!(response.isSecretary || response.data?.isSecretary || response.meeting?.isSecretary),
            isParticipant: !!(response.isParticipant || response.data?.isParticipant || response.meeting?.isParticipant),
            isParticipantInCurrentUnit: !!(response.isParticipantInCurrentUnit || response.data?.isParticipantInCurrentUnit || response.meeting?.isParticipantInCurrentUnit),
            isPersonalApprove: !!(response.isPersonalApprove || response.data?.isPersonalApprove || response.meeting?.isPersonalApprove),
            isCreatedByMe: !!(response.isCreatedByMe || response.data?.isCreatedByMe || response.meeting?.isCreatedByMe),
            isMeetingApproved: !!((response.isMeetingApproved || response.data?.isMeetingApproved || response.meeting?.isMeetingApproved) && (response.isCreatedByMe || response.data?.isCreatedByMe || response.meeting?.isCreatedByMe)),
            isSeatAssignment: !!(response.isSeatAssignment || response.data?.isSeatAssignment || response.meeting?.isSeatAssignment),
            isApproverListed: !!((response.isApproverList || response.data?.isApproverList || response.meeting?.isApproverList) && (response.isMeetingApproved || response.data?.isMeetingApproved || response.meeting?.isMeetingApproved)),
            isDelegating: !!(response.isDelegating || response.data?.isDelegating || response.meeting?.isDelegating),
            proceesMeeting: !!(response.proceesMeeting || response.data?.proceesMeeting || response.meeting?.proceesMeeting || response.canProcessMeeting || response.data?.canProcessMeeting),
            isMeetingApprovedSimple: !!(response.isMeetingApproved || response.data?.isMeetingApproved || response.meeting?.isMeetingApproved),
            isCompanyUnitDetail: !!(response.isCompanyUnitDetail || response.data?.isCompanyUnitDetail || response.meeting?.isCompanyUnitDetail),
          };
          setUserRoles(roles);
          setAvailableActions(response.availableActions || []);
          setWorkItem(response.workItem || null);
          setAttendanceStatus(response.attendanceStatus || response.data?.attendanceStatus || response.meeting?.attendanceStatus);

          if (Object.prototype.hasOwnProperty.call(response, 'canAccessMeetingTabs')) {
            setCanAccessMeetingTabs(response.canAccessMeetingTabs);
          } else if (response.data && Object.prototype.hasOwnProperty.call(response.data, 'canAccessMeetingTabs')) {
            setCanAccessMeetingTabs(response.data.canAccessMeetingTabs);
          } else if (response.meeting && Object.prototype.hasOwnProperty.call(response.meeting, 'canAccessMeetingTabs')) {
            setCanAccessMeetingTabs(response.meeting.canAccessMeetingTabs);
          }

          // Reconstruct selectedUnits
          const reconstructed = reconstructSelectedUnits(data);
          setSelectedUnits(reconstructed);

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
            isCompany: data.isCompany || false,
            meetingDate: data.meetingDate ? dayjs(data.meetingDate) : null,
            startTime: startT,
            endTime: endT,
            meetingMode: data.meetingMode || "BOTH",
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
              // Add other recurrence fields if needed
            },
          });
        }
      } catch (error) {
        toast(error?.response?.data?.message || error?.message || error?.message || "Lỗi khi tải thông tin lịch họp", "error");
      } finally {
        setIsLoading(false);
      }
    }
  }, [open, meetingId, listparammeeting, reset, toast]);

  useEffect(() => {
    fetchMeetingDetails();
  }, [fetchMeetingDetails]);

  const fetchMeetingTasksList = useCallback(async () => {
    if (open && meetingId) {
      setIsTasksListLoading(true);
      try {
        const response = await axiosInstance.get(`${API_JOB_TO_MEETING}/${meetingId}/tasks`);
        const responseData = response.data || response;
        const tasks = responseData.data || responseData || [];
        setMeetingTasksListData(tasks);
        if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          setTaskSummary({
            total: responseData.totalCount || responseData.total || tasks.length,
            completed: responseData.completedCount || responseData.completeCount || 0,
            processing: responseData.processingCount || 0,
            overdue: responseData.overdueCount || 0,
          });
        }
        fetchMeetingDetails();
      } catch (error) {
        logger.error("Error fetching meeting tasks list:", error);
      } finally {
        setIsTasksListLoading(false);
      }
    }
  }, [open, meetingId, fetchMeetingDetails]);

  useEffect(() => {
    fetchMeetingTasksList();
  }, [fetchMeetingTasksList]);

  const reconstructSelectedUnits = (data) => {
    const units = [];
    if (!data.units) return units;

    // BE now returns chairman and secretary as arrays of objects
    const chairInfo = (data.chairman && data.chairman.length > 0) ? data.chairman[0] : null;
    const secInfo = (data.secretary && data.secretary.length > 0) ? data.secretary[0] : null;

    const targetChairId = (chairInfo?.userId || data.chairmanId || "").toString().trim();
    const targetSecId = (secInfo?.userId || data.secretaryId || "").toString().trim();

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
        delegateInfo: u.delegateInfo || null,
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
            isConfirmed: p.isConfirmed,
            isNotParticipant: p.isNotParticipant,
            status: p.isConfirmed === true ? 'ACCEPTED' : (p.isConfirmed === false ? 'REJECTED' : (p.participantState || p.attendanceState || p.status)),
            seatNumber: roleInfo?.seatNumber || p.seatNumber,
            roomId: roleInfo?.roomId || p.roomId,
            tasks: roleInfo?.tasks || p.tasks || [],
            delegateInfo: roleInfo?.delegateInfo || p.delegateInfo || null,
            delegateFromPosition: roleInfo?.delegateFromPosition || p.delegateFromPosition || "",
            isDelegated: roleInfo?.isDelegated || p.isDelegated || false,
            isNotConfirmed: roleInfo?.isNotConfirmed || p.isNotConfirmed || false
          });
        });
      }
    });

    // 3. Fallback: Ensure Chairman and Secretary are represented even if they weren't in any unit's participants
    const addRoleIfMissing = (info, roleKey, fallbackId) => {
      const userId = (info?.userId || fallbackId || "").toString().trim();
      if (!userId) return;

      const existing = units.find(u => u.id?.toString().trim() === userId);
      if (existing) {
        existing.roles[roleKey] = true;
        // Chỉ set participant = false nếu chưa có vai trò nào được gán hoặc chưa phải là người tham gia
        if (existing.roles.participant === undefined) {
          existing.roles.participant = false;
        }
        if (info) {
          existing.seatNumber = info.seatNumber || existing.seatNumber;
          existing.roomId = info.roomId || existing.roomId;
          const oldTasks = existing.tasks || [];
          const newTasks = info.tasks || [];
          const taskMap = new Map();
          oldTasks.forEach(t => taskMap.set(t.id, t));
          newTasks.forEach(t => taskMap.set(t.id, t));
          existing.tasks = Array.from(taskMap.values());
          // existing.tasks = info.tasks || existing.tasks;
          if (info.userName) existing.name = info.userName;
          if (info.position) existing.position = info.position;
          if (info.delegateInfo) existing.delegateInfo = info.delegateInfo;
          if (info.delegateFromPosition) existing.delegateFromPosition = info.delegateFromPosition;
          if (info.isDelegated !== undefined) existing.isDelegated = info.isDelegated;
          if (info.isNotConfirmed !== undefined) existing.isNotConfirmed = info.isNotConfirmed;
          if (info.isConfirmed !== undefined) existing.isConfirmed = info.isConfirmed;
          if (info.isNotParticipant !== undefined) existing.isNotParticipant = info.isNotParticipant;
        }
      } else {
        units.push({
          id: userId,
          _id: userId,
          name: info?.userName || userId,
          title: info?.userName || userId,
          position: info?.position || null,
          types: 'user',
          roles: { participant: false, [roleKey]: true },
          seatNumber: info?.seatNumber || null,
          roomId: info?.roomId || null,
          tasks: info?.tasks || [],
          delegateInfo: info?.delegateInfo || null,
          delegateFromPosition: info?.delegateFromPosition || "",
          isDelegated: info?.isDelegated || false,
          isNotConfirmed: info?.isNotConfirmed || false,
          isConfirmed: info?.isConfirmed,
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
          name: g.guestName,
          title: g.guestName,
          position: g.guestTitle,
          types: 'guest',
          roles: { participant: true },
          parent: 'GUEST_GROUP',
          parentName: 'Khách mời',
          status: g.isConfirmed === true ? 'ACCEPTED' : (g.isConfirmed === false ? 'REJECTED' : (g.participantState || g.attendanceState || g.status)),
          seatNumber: g.seatNumber,
          roomId: g.roomId
        }))
      });
    }

    return units;
  };



  // eslint-disable-next-line no-unused-vars
  const onSubmit = async (data) => {
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
          tasks: (user.tasks || []).map(t => ({
            attachableType: "ROLE",
            attachableId: uId,
            attachableRole: roleStr,
            content: t.content || "",
            documentName: t.documentName || "",
            deadline: t.deadline ? dayjs(t.deadline).format("YYYY-MM-DDTHH:mm:ss") : null
          })),
          roomId: user.roomId || null,
          seatNumber: user.seatNumber || null
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

        if (!uId) return;

        if (!unitMap[uId]) {
          unitMap[uId] = {
            unitId: uId,
            participants: [],
            tasks: [],
            sittingPosition: []
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

        // Xử lý chuẩn bị tài liệu (tasks)
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

      const payload = {
        title: data.title,
        meetingType: data.meetingType,
        priority: data.priority,
        meetingDate: data.meetingDate ? dayjs(data.meetingDate).format("YYYY-MM-DD") : null,
        meetingTime: (data.startTime && data.endTime)
          ? `${dayjs(data.startTime).format("HH:mm")}-${dayjs(data.endTime).format("HH:mm")}`
          : null,
        meetingMode: data.meetingMode,
        roomIds: meetingData?.roomIds?.map(r => r.id) || [],
        content: data.content,
        chairman: chairmanPayload,
        secretary: secretaryPayload,
        directCommand: data.directCommand,
        onlineMeeting: {
          platform: data.onlineMeeting?.platform,
          meetingLink: data.onlineMeeting?.meetingLink,
          passcode: data.onlineMeeting?.passcode,
        },
        recurrence: data.recurrence?.type ? {
          type: data.recurrence?.type?.toUpperCase(),
          interval: Number(data.recurrence?.interval) || 1,
          startDate: data.recurrence?.startDate ? dayjs(data.recurrence.startDate).format("YYYY-MM-DD") : null,
          endDate: data.recurrence?.endDate ? dayjs(data.recurrence.endDate).format("YYYY-MM-DD") : null,
        } : null,
        tasks: [], // Giao tài liệu cấp cuộc họp
        units: Object.values(unitMap),
      };

      const response = await axiosInstance.post(API_ADD_MEETING_SCHEDULE, payload);
      const newMeetingId = response?.data?._id || response?._id || response?.id;

      if (!newMeetingId) {
        throw new Error("Không nhận được ID lịch họp sau khi tạo.");
      }

      // Xử lý upload file cho tài liệu chuẩn bị
      // const uploadPromises = [];
      // Object.keys(taskFiles).forEach(taskId => {
      //   const filesForTask = taskFiles[taskId] || [];
      //   filesForTask.forEach(item => {
      //     uploadPromises.push(
      //       apiUploadFile(item.file, "RecordMeeting", newMeetingId)
      //     );
      //   });
      // });

      // if (uploadPromises.length > 0) {
      //   await Promise.all(uploadPromises);
      // }

      toast("Tạo lịch họp thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // const handleSaveConclusion = async () => {
  //   if (!meetingConclusionRef.current) return;
  //   setIsLoading(true);
  //   try {
  //     const { isUpdateMode, ...payload } = meetingConclusionRef.current.getConclusionData();

  //     if (isUpdateMode) {
  //         await axiosInstance.patch(`${API_UPDATE_MEETING_CONCLUSION}/${meetingId}`, payload);
  //     } else {
  //         await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/create/conclusions`, payload);
  //     }
  //     toast("Lưu kết luận cuộc họp thành công!", "success");
  //     // onSuccess?.();
  //     // onClose();
  //   } catch (error) {
  //     toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi lưu kết luận!", "error");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleOpenLockConfirm = useCallback(() => {
    setOpenLockConfirm(true);
  }, []);

  const handleCloseLockConfirm = useCallback(() => {
    setOpenLockConfirm(false);
  }, []);

  const handleConfirmLockAttendance = useCallback(async () => {
    if (!meetingId) return;
    setIsLoading(true);
    try {
      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/attendance/lock`);
      toast("Khóa điểm danh thành công!", "success");
      fetchParticipants(); // Refresh participant data
      fetchMeetingDetails(); // Refresh meeting detail
      handleCloseLockConfirm();
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi khóa điểm danh!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, fetchParticipants, fetchMeetingDetails, toast]);

  // Determine actions and flags for FormButton
  const dataForFormButton = React.useMemo(() => {
    // Flatten available actions
    let flatActions = [];
    if (availableActions && Array.isArray(availableActions)) {
      availableActions.forEach(action => {
        if (action?.subActions && Array.isArray(action?.subActions) && action?.subActions?.length > 0) {
          action?.subActions.forEach(sub => {
            if (sub.actions && Array.isArray(sub.actions)) {
              flatActions = [...flatActions, ...sub.actions];
            }
          });
        } else {
          flatActions.push(action);
        }
      });
    }

    // Generate flags dynamically based on types
    const flags = {};
    flatActions.forEach(a => {
      const flagName = typeFlagMap[a?.type];
      if (flagName) flags[flagName] = true;
    });

    return {
      ...meetingData,
      workItem: workItem,
      documentId: meetingId, // FormButton uses this
      availableActions: flatActions,
      flags: {
        ...flags,
        canEdit: flags.canEdit || false,
      }
    };
  }, [availableActions, meetingData, workItem, meetingId]);




  const [openUpdateMeeting, setOpenUpdateMeeting] = React.useState(false);


  const handleCustomAction = (type, { action } = {}) => {
    if (type === "edit" || type === "edit_meeting") {
      setOpenUpdateMeeting(true);
      return;
    }
    if (type === "process_meeting") {
      handleOpenParticipatingUnits();
    }
    if (type === "process_meeting_user" || type === "update_meeting_person") {
      const selectedActionCode = action?.code;
      if (!selectedActionCode) {
        toast("Không xác định được mã hành động", "error");
        return;
      }

      const processMeetingUser = async () => {
        try {
          setIsLoading(true);
          await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/user-processing`);
          setPersonalMeetingActionCode(selectedActionCode);
          setOpenHandleMeetingSchedules(true);
        } catch (error) {
          toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
        } finally {
          setIsLoading(false);
        }
      }
      processMeetingUser();
    }
  };

  const handleSuccessHandleMeetingSchedules = useCallback(() => {
    setOpenHandleMeetingSchedules(false);
    fetchMeetingDetails();
    fetchMeetingTasks();
    fetchParticipants();
    fetchMeetingTasksList();
  }, [fetchMeetingDetails, fetchMeetingTasks, fetchParticipants, fetchMeetingTasksList]);

  const handleCloseHandleMeetingSchedules = useCallback(() => {
    setOpenHandleMeetingSchedules(false);
    fetchMeetingDetails();
    fetchMeetingTasks();
    fetchParticipants();
    fetchMeetingTasksList();
  }, [fetchMeetingDetails, fetchMeetingTasks, fetchParticipants, fetchMeetingTasksList]);

  const handleCloseUpdate = useCallback(() => {
    setOpenUpdateMeeting(false);
  }, []);

  const handleReloadAll = useCallback(() => {
    fetchMeetingDetails();
    fetchMeetingTasks();
    fetchParticipants();
    fetchMeetingTasksList();
    onSuccess?.();
  }, [fetchMeetingDetails, fetchMeetingTasks, fetchParticipants, fetchMeetingTasksList, onSuccess]);

  const handleUpdateSuccess = useCallback(() => {
    setOpenUpdateMeeting(false);
    handleReloadAll();
  }, [handleReloadAll]);

  const handleClose = useCallback(() => {
    onSuccess?.();
    onClose();
  }, [onSuccess, onClose]);

  /* eslint-disable react/forbid-component-props */
  return (
    <CustomDialog
      open={open}
      onClose={handleClose}
      title={title}
      size="xl"
      hideFooter
      customTitleContent={
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          backgroundColor: "#2364B0",
          color: "#ffffff",
          borderBottom: "1px solid #e0e0e0",
          position: "relative"
        }}>
          <Typography variant="h6" style={{ fontWeight: "bold" }}>
            {title}
          </Typography>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "40px" }}>
            <StyledGridActions container spacing={1}>
              {(meetingData?.isParticipant || meetingData?.isChairman || meetingData?.isSecretary) && !meetingData?.isRejectUser && (
                <Grid item>
                  <ProcessingStatusBadge status={meetingData} />
                </Grid>
              )}
              {activeTabId === 'management' && !meetingData?.attendanceLocked && (
                <Grid item>
                  <ButtonOutline
                    onClick={handleOpenLockConfirm}
                    disabled={isLoading || userRoles.isDelegating || meetingData?.meetingState !== "DANG_HOP"}
                    variant="outlined"
                    style={{ color: "#ffffff", borderColor: "#ffffff" }}
                  >
                    Khoá điểm danh
                  </ButtonOutline>
                </Grid>
              )}
              {activeTabId === 'info' && (
                <Grid item>
                  <FormButton
                    dataDetail={dataForFormButton}
                    onAction={handleCustomAction}
                    setReloadData={handleReloadAll}
                  />
                </Grid>
              )}
            </StyledGridActions>
          </div>
          <IconButton
            onClick={handleClose}
            style={{
              position: "absolute",
              right: 8,
              top: 12,
              color: "#ffffff"
            }}
          >
            <CloseIcon />
          </IconButton>
        </div>
      }
    >
      {(canAccessMeetingTabs === true || canAccessMeetingTabs === "true") && (
        <CustomTabsWithBadge
          tabs={tabs}
          value={tabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        />
      )}

      <JobMainContent>
        {activeTabId === 'info' && (
          <>
            {(userRoles.isChairman || userRoles.isSecretary || userRoles.isCreatedByMe) &&
              meetingData?.meetingStatusStatistics &&
              Object.keys(meetingData.meetingStatusStatistics).length > 0 && (

                <StyledBoxContainerContent>
                  {/* THỐNG KÊ TRẠNG THÁI CUỘC HỌP */}

                  <MeetingStatsBanner type={meetingData.meetingStatusStatistics.overallStatus?.type}>
                    <div className="dot" />
                    {meetingData.meetingStatusStatistics.overallStatus?.text}
                  </MeetingStatsBanner>

                  <MeetingStatsDetailsRow>
                    {meetingData.meetingStatusStatistics?.details?.map((item, index) => (
                      <MeetingStatPill key={index} status={item?.status}>
                        {item?.status === 'SUCCESS' ? <CheckIcon /> : <WarningIcon />}
                        {item?.label} {(item?.current !== undefined || item?.total !== undefined) && ` ${item.current ?? 0}/${item.total ?? 0}`}
                      </MeetingStatPill>
                    ))}
                  </MeetingStatsDetailsRow>


                </StyledBoxContainerContent>
              )}

            {/* THÔNG TIN CHUNG */}
            <StyledGridContainer container spacing={2}>
              <StyledGridColumn item xs={12} md={8}>
                <StyledBoxContainerContent fullHeight>
                  <Grid item xs={12}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <StyledIconWrapper>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0" />
                            <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0" />
                            <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0" />
                            <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0" />
                            <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0" />
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
                                disabled
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
                                required
                                error={!!errors.title}
                                helperText={errors.title?.message}
                                disabled
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
                              <DateTimePicker
                                label="Ngày họp"
                                value={field.value}
                                onChange={handleDateChange(field.onChange)}
                                showTime={false}
                                error={!!errors.meetingDate}
                                helperText={errors.meetingDate?.message}
                                required
                                disabled
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
                                disabled
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
                                disabled
                              />
                            )}
                          />
                        </Grid>
                        {/* Định kỳ */}
                        <Grid item xs={12} sm={6} md={6}>
                          <Controller
                            name="recurrence.type"
                            control={control}
                            render={({ field }) => (
                              <InputComponents
                                select
                                label="Lịch lặp"
                                placeholder="Chọn lịch lặp..."
                                options={optionModeOfWork}
                                customLabel="title"
                                customValue="value"
                                {...field}
                                disabled
                              />
                            )}
                          />
                          {recurrenceSummary && (
                            <RecurrenceSummaryBox>
                              <RecurrenceSummaryText>
                                {recurrenceSummary}
                              </RecurrenceSummaryText>
                            </RecurrenceSummaryBox>
                          )}
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
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
                                disabled
                                required
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
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
                                disabled
                              // required
                              />
                            )}
                          />
                        </Grid>



                        {/*                           
                            <Grid item xs={12} sm={6} md={6}>
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
                                    disabled
                                  />
                                )}
                              />
                            </Grid> */}
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <AbstractSummaryBox>
                      <StyledInfoIcon />
                      <AbstractSummaryContent>
                        <AbstractSummaryTitle>Nội dung họp</AbstractSummaryTitle>
                        <AbstractSummaryText>
                          {watch("content") || "-"}
                        </AbstractSummaryText>
                      </AbstractSummaryContent>
                    </AbstractSummaryBox>
                  </Grid>
                </StyledBoxContainerContent>
              </StyledGridColumn>

              <StyledGridColumn item xs={12} md={4}>
                <CommentContainer fullHeight>
                  <CustomComment
                    documentId={meetingId}
                    comments={comments}
                    type="meeting"
                    styledMaxHeightCommentListContainer="630px"
                    isDetailMeeting
                  />
                </CommentContainer>
              </StyledGridColumn>
            </StyledGridContainer>

            {/* CÔNG VIỆC TỪ LỊCH HỌP */}
            {(!userRoles.isSeatAssignment && !userRoles.proceesMeeting && !userRoles.isPersonalApprove) && userRoles.isMeetingApprovedSimple && (
              <StyledBoxContainerContent>
                <FlexSpaceBetweenCenterBox>
                  <StyledHeaderContent variant="h6" mt={0} mb={0}>
                    Công việc từ lịch họp
                  </StyledHeaderContent>
                  <StatsSummary>
                    <StatText colorType="blue">Tổng số công việc : {taskSummary.total}</StatText>
                    <StatText colorType="green">| Hoàn thành : {taskSummary.completed}</StatText>
                    <StatText colorType="blue">| Đang thực hiện : {taskSummary.processing}</StatText>
                    <StatText colorType="red">| Quá hạn : {taskSummary.overdue}</StatText>
                  </StatsSummary>
                </FlexSpaceBetweenCenterBox>
                <StyledDivider />
                <TaskActionBox>
                  {(userRoles.isShowButtonCreateWork) && (
                    <ButtonOutline onClick={handleOpenAddJob} variant="outlined" startIcon={<AddIcon />}>
                      Tạo công việc
                    </ButtonOutline>
                  )}
                </TaskActionBox>
                <UppercaseBoldSubtitle variant="subtitle2">
                  DANH SÁCH CÔNG VIỆC
                </UppercaseBoldSubtitle>
                <CustomTableBorderTree
                  data={meetingTasksListData}
                  loading={isTasksListLoading}
                  customMaxHeight={500}
                  type="meeting_tasks_tree"
                  item={{
                    props: {
                      isShowSTT: false,
                      hideCheckbox: true,
                      configs: [
                        {
                          id: "view-job-detail",
                          config: {
                            icon: "Visibility",
                            displayName: "Xem chi tiết",
                            actionType: "view",
                            color: "primary",
                          },
                        },
                      ]
                    }
                  }}
                  dataColumn={[
                    { label: "Tên công việc", key: "name", name: "name", width: "400px" },
                    { label: "Tiến độ", key: "progressView", name: "progressView", width: "180px", margin: "center" },
                    { label: "Bắt đầu", key: "startDate", name: "startDate", width: "120px", margin: "center" },
                    { label: "Hạn kết thúc", key: "endDate", name: "endDate", width: "120px", margin: "center" },
                    { label: "Người chủ trì", key: "director", name: "director", width: "180px" },
                    { label: "Trạng thái", key: "processStatusUi", name: "processStatusUi", width: "150px", margin: "center" },
                  ]}
                  onAction={handleTaskAction}
                />
              </StyledBoxContainerContent>
            )}

            <ParticipatingUnits
              open={openParticipatingUnits}
              onClose={handleCloseParticipatingUnits}
              onSave={setSelectedUnits}
              initialSelectedUnits={selectedUnits}
              dialogKey="internalUnit"
              control={control}
              excludeMeetingId={meetingId}
            />

            <PrepareDocuments
              open={openPrepareDocs}
              onClose={handleClosePrepareDocs}
              onSave={handlePrepareDocsSave}
              targetName={docAssignee ? (docAssignee.title || docAssignee.name) : ""}
              sharedComponents={sharedComponents}
            />

            <RegisterForMeetingRooms
              control={control}
              errors={errors}
              sharedComponents={sharedComponents}
              selectedUnits={selectedUnits}
              onOpenParticipatingUnits={handleOpenParticipatingUnits}
              isView
              meetingData={meetingData}
              initialRooms={meetingData?.roomIds?.length ? meetingData.roomIds : [{ id: 'strongboy', name: 'PHÒNG HỌP STRONGBOY', capacity: 50, image: '', stage: 'Sẵn sàng' }]}
              userRoles={userRoles}
              meetingId={meetingId}
              onSuccess={onSuccess}
              onUpdateParticipants={setSelectedUnits}
              onOpenPrepareDocs={handleOpenPrepareDocs}
            />


            {/* TÀI LIỆU HỌP CẦN CHUẨN BỊ */}
            {meetingTasks?.length > 0 && userRoles.isParticipant && (
              <MeetingTasksPreparation tasks={meetingTasks} meetingData={meetingData} />
            )}



            {/* THÔNG TIN NGƯỜI THAM GIA */}
            {(hasAnyRole || !(userRoles.isPersonalApprove || userRoles.isCreatedByMe || meetingData?.isPersonalApprove || meetingData?.isCreatedByMe)) && (
              <StyledBoxContainerContent>
                <ParticipantHeader>
                  <FlexAlignCenterGap>
                    <StyledPeopleIcon />
                    <StyledHeaderContent variant="h6">
                      Đơn vị tham gia
                    </StyledHeaderContent>
                  </FlexAlignCenterGap>
                  <ParticipantStats>
                    <StatItem colorType="blue">
                      Đơn vị đã xác nhận tham gia : <span>{attendanceStats.unitsConfirmed} / {attendanceStats.unitsTotal}</span>
                    </StatItem>
                  </ParticipantStats>
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
                    <BoardSection>
                      <SectionSubtitle variant="subtitle2" $blue>
                        BAN ĐIỀU HÀNH
                      </SectionSubtitle>
                      <BoardGridContainer>
                        <BoardGrid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <BoardLabel>NGƯỜI CHỦ TRÌ</BoardLabel>
                            <BoardCard type="chair">
                              <BoardAvatar src={chairman?.avatar || ""} alt={chairman?.name}>
                                {(chairman?.title || chairman?.name || "?").charAt(0)}
                              </BoardAvatar>
                              <BoardInfo>
                                <BoardName $small>{chairman ? (chairman.title || chairman.name) : "Chưa chọn người chủ trì"}</BoardName>
                                <BoardTitle>
                                  {chairman?.position || chairman?.parentName || "---"}
                                </BoardTitle>

                                {chairman?.delegateInfo && (
                                  <GreyCaption variant="caption" $block>
                                    {`Được ủy quyền bởi ${chairman?.delegateInfo}`}
                                  </GreyCaption>
                                )}
                                {!chairman?.isDelegated && chairman?.isNotParticipant === true && <GreyCaption
                                  variant="caption"
                                  $block
                                >
                                  Xác nhận không tham gia
                                </GreyCaption>}
                                {!chairman?.isDelegated && chairman?.isConfirmed === true && <GreyCaption
                                  variant="caption"
                                  $block
                                >
                                  Đã xác nhận tham gia
                                </GreyCaption>}
                                {!chairman?.isDelegated && chairman?.isNotConfirmed === true && <GreyCaption
                                  variant="caption"
                                  $block
                                >
                                  Chưa xác nhận tham gia
                                </GreyCaption>}

                              </BoardInfo>
                            </BoardCard>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <BoardLabel>THƯ KÝ CUỘC HỌP</BoardLabel>
                            <BoardCard type="secretary">
                              <BoardAvatar src={secretary?.avatar || ""} alt={secretary?.name}>
                                {(secretary?.title || secretary?.name || "?").charAt(0)}
                              </BoardAvatar>
                              <BoardInfo>
                                <BoardName $small>{secretary ? (secretary.title || secretary.name) : "Chưa chọn thư ký"}</BoardName>
                                <BoardTitle>
                                  {secretary?.position || secretary?.parentName || "---"}
                                </BoardTitle>

                                {secretary?.delegateInfo && (
                                  <GreyCaption variant="caption" $block>
                                    {` Được ủy quyền bởi ${secretary?.delegateInfo}`}
                                  </GreyCaption>
                                )}
                                {!secretary?.isDelegated && secretary?.isNotParticipant === true && <GreyCaption
                                  variant="caption"
                                  $block
                                >
                                  Xác nhận không tham gia
                                </GreyCaption>}
                                {!secretary?.isDelegated && secretary?.isConfirmed === true && <GreyCaption
                                  variant="caption"
                                  $block
                                >
                                  Đã xác nhận tham gia
                                </GreyCaption>}
                                {!secretary?.isDelegated && secretary?.isNotConfirmed === true && <GreyCaption
                                  variant="caption"
                                  $block
                                >
                                  Chưa xác nhận tham gia
                                </GreyCaption>}

                              </BoardInfo>
                            </BoardCard>
                          </Grid>
                        </BoardGrid>
                      </BoardGridContainer>
                    </BoardSection>

                    <AttendanceSection>
                      <FlexJustifyBetweenAlignCenterMargin mt={2.5}>
                        <SectionSubtitle variant="subtitle2" $blue $noMargin>
                          THAM DỰ
                        </SectionSubtitle>
                        <FlexGap>
                          <StatChip colorType="grey" $noBackground>Tổng số: {attendanceStats.total}</StatChip>
                          <StatChip colorType="red" $noBackground>Không tham gia: {attendanceStats.rejected}</StatChip>
                          <StatChip colorType="blue" $noBackground>Khách mời: {attendanceStats.totalGuests}</StatChip>
                          <StatChip colorType="green" $noBackground>Có mặt: {attendanceStats.confirmed}</StatChip>
                          <StatChip colorType="grey" $noBackground>Chưa xác nhận: {attendanceStats.pending}</StatChip>
                        </FlexGap>
                      </FlexJustifyBetweenAlignCenterMargin>

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
                            onAddTaskToMember={handleAddTaskToMember}
                          />
                        );
                      })}

                      {guests.length > 0 && (
                        <DepartmentAccordion>
                          <DepartmentHeader onClick={handleToggleGuests}>
                            <DepartmentTitle $full>
                              <DepartmentName $uppercase>Khách mời tham dự</DepartmentName>
                              <DepartmentStats>
                                <StatChip colorType="blue" $noBackground>Số lượng khách mời: {guests.length}</StatChip>
                              </DepartmentStats>
                            </DepartmentTitle>
                            {expandedSections.includes('guests') ? <ArrowUpIcon /> : <ArrowDownIcon />}
                          </DepartmentHeader>
                          {expandedSections.includes('guests') && (
                            <DepartmentContent $slate>
                              <Grid container spacing={2}>
                                {guests.map((guest, idx) => (
                                  <MemberItem
                                    key={`guest-${idx}`}
                                    member={guest}
                                    onAddTaskToMember={handleAddTaskToMember}
                                    noStatus
                                  />
                                ))}
                              </Grid>
                            </DepartmentContent>
                          )}
                        </DepartmentAccordion>
                      )}

                      {attendanceGroups.length === 0 && guests.length === 0 && (
                        <EmptyStateText>
                          Chưa có đơn vị, cá nhân tham dự
                        </EmptyStateText>
                      )}
                    </AttendanceSection>
                  </>
                )}
              </StyledBoxContainerContent>
            )}
            {(hasAnyRole || !(userRoles.isPersonalApprove || userRoles.isCreatedByMe || meetingData?.isPersonalApprove || meetingData?.isCreatedByMe)) && (
              <MeetingDocuments
                meetingData={meetingData}
                isView
              />
            )}
          </>
        )}
        {activeTabId === 'attendance' && (
          <MeetingAttendance
            meetingData={meetingData}
            sharedComponents={sharedComponents}
            participants={participants}
            attendanceStats={checkInStats}
            onFetchData={fetchParticipants}
            onRefreshMeeting={fetchMeetingDetails}
            totalTotal={totalParticipants}
            attendanceStatus={attendanceStatus}
            isChairman={userRoles.isChairman}
            isSecretary={userRoles.isSecretary}
            isDelegating={userRoles.isDelegating}
          />
        )}

        {activeTabId === 'management' && (
          <MeetingManagement
            meetingData={meetingData}
            sharedComponents={sharedComponents}
            selectedUnits={selectedUnits}
            participants={participants}
            attendanceStats={checkInStats}
            onFetchData={fetchParticipants}
            onRefreshMeeting={fetchMeetingDetails}
            totalTotal={totalParticipants}
            attendanceStatus={attendanceStatus}
            isChairman={userRoles.isChairman}
            isSecretary={userRoles.isSecretary}
            isDelegating={userRoles.isDelegating}
          />
        )}

        {activeTabId === 'conclusion' && (
          <MeetingConclusion
            ref={meetingConclusionRef}
            meetingData={meetingData}
            userRoles={userRoles}
            sharedComponents={sharedComponents}
            isDelegating={userRoles.isDelegating}
          />
        )}
      </JobMainContent>

      {openUpdateMeeting && (
        <UpdateMeetingSchedule
          open={openUpdateMeeting}
          onClose={handleCloseUpdate}
          onSuccess={handleUpdateSuccess}
          meetingId={meetingId}
          sharedComponents={sharedComponents}
        />
      )}

      <CustomDialog
        open={openLockConfirm}
        onClose={handleCloseLockConfirm}
        onSave={handleConfirmLockAttendance}
        title="Xác nhận khóa điểm danh cuộc họp"
        titleButton="Xác nhận"
        cancelButtonText="Hủy"
      >
        <SkyBox>
          <SkyTypography>
            Bạn xác nhận khóa điểm danh cuộc họp “<b>{meetingData?.title}</b>”.
          </SkyTypography>
        </SkyBox>
      </CustomDialog>

      {openAddJob && (
        <AddNewJob
          open={openAddJob}
          onClose={handleCloseAddJob}
          onSuccess={fetchMeetingTasksList}
          sharedComponents={sharedComponents}
          meetingData={meetingData}
          title="Thêm công việc từ cuộc họp"
          meetingId={meetingId}
          meetingDate={meetingData?.meetingDate}
          meetingTime={meetingData?.meetingTime}
        />
      )}

      {openViewJob && (
        <ViewJobToMeeting
          open={openViewJob}
          onClose={handleCloseViewJob}
          data={viewingJob}
          sharedComponents={sharedComponents}
          setReloadData={fetchMeetingTasksList}
        />
      )}

      {openHandleMeetingSchedules && (
        <ManagePersonalMeetingSchedules
          open={openHandleMeetingSchedules}
          onClose={handleCloseHandleMeetingSchedules}
          onSuccess={handleSuccessHandleMeetingSchedules}
          meetingId={meetingId}
          actionCode={personalMeetingActionCode}
          sharedComponents={sharedComponents}
          listparammeeting={listparammeeting}
        />
      )}


    </CustomDialog>
  );
  /* eslint-enable react/forbid-component-props */
};

export default withSharedComponents(ViewMeetingSchedulePopup);
