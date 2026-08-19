import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { withFormWrapper } from "@components/common/FormWrapper";
import { Controller, useForm } from "react-hook-form";
import { Box, Typography, Popover, FormControlLabel, Checkbox, Grid, MenuItem, Tooltip, InputLabel, CircularProgress } from "@mui/material";
// const MuiButton = Button;
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { SkyButton, 
  // SkyBox, 
  SkyTypography, 
  // SkyIconButton
}  from "@styles/SkyStyles";
import StopIcon from "@mui/icons-material/Stop";
import PauseIcon from "@mui/icons-material/Pause";
import SaveIcon from "@mui/icons-material/Save";
import PanToolIcon from "@mui/icons-material/PanTool";
// import DescriptionIcon from "@mui/icons-material/Description";
// import LockIcon from "@mui/icons-material/Lock";

// import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// import ExpandLessIcon from "@mui/icons-material/ExpandLess";
// import SendIcon from "@mui/icons-material/Send";
// import CheckIcon from "@mui/icons-material/Check";
// import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import axiosInstance from "@utils/axiosInstance";
import { API_MEETING_RECORDING, APP_BASE, API_ADD_MEETING_SCHEDULE, API_EXPORT_REPORT } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";

// import DOMPurify from "dompurify";
import { 
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import EarlyStartWarningDialog from "./EarlyStartWarningDialog";



import {
  ManagementContainer,
  HeaderActions,
  HeaderButtons,
  StatusGroup,
  StatusChip,
  SectionPaper,
  // SectionTitle,
  // InfoLabel,
  // InfoValue,
  // DocumentAccordionItem,
  // DocumentAccordionHeader,
  // CommentBox,
  // CommentItem,
  // AttendanceRow,
  // LinkBox,
  // OnlineLinkText,
  // FileItemBox,
  // StyledAccessTimeIcon,
  // UnitTitle,
  // DocumentTitle,
  // ContentInfoValue,
  // StyledDescriptionIcon,
  // FileNameText,
  // StyledChatIcon,
  // CommentAuthor,
  // CommentAuthor,
  AttendanceHeaderBox,
  // AttendanceTitle,
  StatItemBlue,
  StatItemGreen,
  StatItemRed,
  StatItemGrey,
  // AttendanceStats,
  // InfoGrid,
  // InfoValueBold,
  // LinkInfoLabel,
  // FileSizeText,
  // Spacer,
  // StyledSendIconButton,
  // ActionsBox,
  // MemberInfoBox,
  // StyledInputAdornment,
  SearchContainer,
  StyledSearchField,
  StyledSearchButton,
  StyledFilterButton,
  FilterPopoverContent,
  PopoverTitle,
  FilterActions,
  SearchFilterGrid,
  SearchOptionIconButton,
  PremiumTuneIcon,
  ClearSearchIconButton,
  InputClearIcon,
  WhitePopoverSearchIcon,
  // WhitePopoverFilterIcon,
  PopoverSearchIcon,
  PopoverFilterIcon,
  StyledSelect,
  PaginationWrapper,
  PaginationContainerStyled,
  PaginationActionsBox,
  StyleDropDown,
  StyleNavButton,
  StyleActionPage,
  StylePageButton,
  StylePageDots,
  // PageSizeBox,
  NoDataBox,
  // MeetingHeaderWrapper,
  IconTextWrapper,
  StatBannerItem,
  PopoverPaperProps,
  StartMeetingButton,
  EndMeetingButton,
  // RecordingControls,
  RecordingButtons,
  ActionButton,
  // SaveRecordingButton,
  RecordingDurationText,
  RecordingContent,
  // AudioFileBox,
  AudioFileHeader,
  AudioPlayerWrapper,
  AudioTimeText,
  // AudioProgressBar,
  StyledMicIcon,
  AudioFileNameText,
  StyledDownloadIcon,
  // StyledPlayArrowIcon,
  // AudioDurationText,
  SmallAccessTimeIcon,
  StyledAccessTimeIcon,
  TranscriptionHeader,
  TranscriptionLabel,
  ExportIconButton,
  ExportLoadingSpinner,
  RecordingHeaderWrapper,
  RecordingControlsWrapper,
  StyledInputAdornmentEnd,
  RecordingSplitWrapper,
  RecordingTranscriptColumn,
  RecordingFilesColumn,
  AudioFileItemCard,
  NewAudioFileItemCard,
  NewStyledMicIcon,
  NewAudioFileNameText,
  NewStyledDownloadIcon,
  EmptyFilesBox,
  AudioLoadingBox,
  AudioErrorText,
} from "@pages/MeetingCalendar/componentStyle/MeetingManagement.styles";

import {
  // MemberNameText,
  NoAttendanceFormLabel,
  CustomCheckbox,
  AttendanceActionBar,
  AttendanceActionButton,
  AttendanceSuccessBox,
  AttendanceSuccessText,
  AttendanceSuccessTime,
  StatusIndicator,
  AttendanceInfoWrapper,
  AttendanceLockInfo,
  AttendanceSeparator,
  AttendanceLockIcon,
  AttendanceStatsBanner,
  AttendanceStatsBannerLabel,
  AttendanceStatsBannerRight,
  AttendanceParticipantGrid,
  AttendanceParticipantCard,
  ParticipantCardInfo,
  ParticipantCardName,
  ParticipantCardSubInfo,
  AttendanceStatusBadge,
  AttendanceTableWrapper,
} from "@pages/MeetingCalendar/componentStyle/MeetingAttendance.styles";
import { BoldCompanyLabel, CompanyCheckbox } from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";

const createPageButton = (pageNumber, currentPage, handlePageChange) => {
  const isActive = currentPage === pageNumber;
  const handleClick = (e) => handlePageChange(e, pageNumber);
  return (
    <StylePageButton
      key={pageNumber}
      size="small"
      onClick={handleClick}
      active={isActive}
    >
      {pageNumber}
    </StylePageButton>
  );
};

const createPageDots = (key) => {
  return <StylePageDots key={key}>...</StylePageDots>;
};

const generatePaginationPages = (page, totalPages, handlePageChange) => {
  const pages = [];
  const currentPage = page;
  if (totalPages === 0) return pages;
  pages.push(createPageButton(1, currentPage, handlePageChange));
  if (totalPages === 1) return pages;
  if (currentPage > 4) pages.push(createPageDots('dots-start'));
  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);
  if (currentPage <= 3) endPage = Math.min(totalPages - 1, 4);
  if (currentPage >= totalPages - 2) startPage = Math.max(2, totalPages - 3);
  for (let i = startPage; i <= endPage; i++) {
    pages.push(createPageButton(i, currentPage, handlePageChange));
  }
  if (currentPage < totalPages - 2 && totalPages > 5) pages.push(createPageDots('dots-end'));
  if (totalPages > 1) pages.push(createPageButton(totalPages, currentPage, handlePageChange));
  return pages;
};

const calcTimeLeft = (endTime) => {
  if (!endTime) return "00:00:00";
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return "00:00:00";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const useCountdownHours = (endTime, isRunning) => {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(endTime));
  const timerRef = useRef(null);

  useEffect(() => {
    // If not running, just update once and don't start timer
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(calcTimeLeft(endTime));
      return;
    }

    const tick = () => {
      const t = calcTimeLeft(endTime);
      setTimeLeft(t);
      if (t === "00:00:00" && timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [endTime, isRunning]);

  return timeLeft;
};


const getStatusConfig = (status) => {
  if (!status) return { label: 'Chưa điểm danh', statusKey: 'default' };
  if (typeof status === 'string' && status.includes('<')) {
    const text = status.replace(/<[^>]*>/g, '').trim();
    let key = 'default';
    if (text.toLowerCase().includes('vắng')) key = 'NOT_CHECKED';
    if (text.toLowerCase().includes('có mặt')) key = 'CHECKED';
    return { label: text || 'Chưa điểm danh', statusKey: key };
  }
  switch (status) {
    case 'CHECKED': return { label: 'Có mặt', statusKey: 'CHECKED' };
    case 'NOT_CHECKED': return { label: 'Vắng', statusKey: 'NOT_CHECKED' };
    case 'NO_REQUIRED': return { label: 'Không cần điểm danh', statusKey: 'NO_REQUIRED' };
    case 'ACCEPTED': return { label: 'Có mặt', statusKey: 'CHECKED' };
    case 'REJECTED': return { label: 'Vắng', statusKey: 'NOT_CHECKED' };
    default: return { label: 'Chưa điểm danh', statusKey: 'default' };
  }
};

const AttendanceRowItem = React.memo(({ member, onNotCheckChange, canEditAttendance, isDelegating }) => {
    const handleToggle = useCallback(() => {
        if (!canEditAttendance || isDelegating) return;
        onNotCheckChange(member._original);
    }, [member, onNotCheckChange, canEditAttendance, isDelegating]);

    const { label: statusLabel, statusKey } = getStatusConfig(member.status);

    return (
        <AttendanceParticipantCard>
          <ParticipantCardInfo>
            <ParticipantCardName variant="body2">{member.name}</ParticipantCardName>
            <ParticipantCardSubInfo variant="caption">
              {member.role}{member.role && member.unit ? ' · ' : ''}{member.unit}
            </ParticipantCardSubInfo>
            <NoAttendanceFormLabel
              control={
                <CustomCheckbox
                  checked={!!member.noAttendance}
                  size="small"
                  onChange={handleToggle}
                  disabled={!canEditAttendance || isDelegating}
                />
              }
              label="Không cần điểm danh"
            />
          </ParticipantCardInfo>
          <AttendanceStatusBadge $statusKey={statusKey}>
            {statusLabel}
          </AttendanceStatusBadge>
        </AttendanceParticipantCard>
    );
});
AttendanceRowItem.displayName = "AttendanceRowItem";

const AudioFileItem = ({ file, onAudioPlay }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioDuration, setAudioDuration] = useState(null);

  const formatFileDuration = (seconds) => {
    if (!seconds && seconds !== 0) return null;
    const num = Number(seconds);
    if (isNaN(num) || num <= 0) return null;
    const h = Math.floor(num / 3600);
    const m = Math.floor((num % 3600) / 60);
    const s = Math.floor(num % 60);
    return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
  };

  useEffect(() => {
  const fetchBlob = async () => {
  setIsLoading(true);
  const fileId = file.id || file._id;
  const fileUrl = `${APP_BASE}/api/files/view/${fileId}`;

  try {
    const response = await axiosInstance.get(fileUrl, { 
      responseType: 'blob',
      // Thêm timeout và validate
      timeout: 30000,
    });

    // Cách an toàn nhất
    let blob;
    if (response.data instanceof Blob) {
      blob = response.data;
    } else if (response instanceof Blob) {
      blob = response;
    } else {
      // Fallback
      blob = new Blob([response.data], { type: 'audio/webm' });
    }

    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    
    // console.log("✅ Blob created successfully, size:", blob.size, "type:", blob.type);
  } catch (err) {
    logger.error("❌ Fetch blob error:", err);
  } finally {
    setIsLoading(false);
  }
};

    fetchBlob();
  }, [file.id, file._id]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handlePlay = useCallback((e) => {
    onAudioPlay?.(e.target);
  }, [onAudioPlay]);

  // Tính duration thực tế từ audio element nếu DB không có
  const handleLoadedMetadata = useCallback((e) => {
    if (file.duration) return; // DB đã có thì không cần tính
    const audio = e.target;
    if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
      setAudioDuration(Math.floor(audio.duration));
    } else {
      // WebM workaround: seek tới cuối để trình duyệt tính duration
      audio.currentTime = 1e101;
      audio.addEventListener('timeupdate', function handler() {
        audio.removeEventListener('timeupdate', handler);
        if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
          setAudioDuration(Math.floor(audio.duration));
        }
        audio.currentTime = 0;
      });
    }
  }, [file.duration]);

  const displayDuration = file.duration || formatFileDuration(audioDuration) || "Đang tính...";

  return (
    <AudioFileItemCard>
      <AudioFileHeader>
        <StyledMicIcon />
        <AudioFileNameText variant="body2">
           {"Ghi âm cuộc họp"}
        </AudioFileNameText>
        {blobUrl && (
          <a href={blobUrl} download={file.file_name || "cuoc_hop.webm"}>
            <StyledDownloadIcon />
          </a>
        )}
      </AudioFileHeader>
      <AudioPlayerWrapper>
        {isLoading ? (
          <AudioLoadingBox>
            <CircularProgress size={20} />
            <Typography variant="caption">Đang tải...</Typography>
          </AudioLoadingBox>
        ) : blobUrl ? (
          <audio 
            controls 
            src={blobUrl} 
            className="audio-player" 
            onPlay={handlePlay} 
            onLoadedMetadata={handleLoadedMetadata} 
          />
        ) : (
          <AudioErrorText variant="caption">Không thể tải file</AudioErrorText>
        )}
      </AudioPlayerWrapper>
      <AudioTimeText variant="caption">
        <SmallAccessTimeIcon /> Thời lượng: {displayDuration} 
        {file.created_at && ` · ${dayjs(file.created_at).format("HH:mm DD/MM")}`}
      </AudioTimeText>
    </AudioFileItemCard>
  );
};

const MeetingManagement = ({ meetingData = [], sharedComponents, participants = [], attendanceStats, onFetchData, totalTotal = 0, attendanceStatus, onRefreshMeeting, isChairman, isSecretary, isDelegating }) => {
  const {
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    ButtonOutline,
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

  const [openEarlyStartDialog, setOpenEarlyStartDialog] = useState(false);
  const [earlyStartData, setEarlyStartData] = useState(null);
  const [earlyStartReason, setEarlyStartReason] = useState("");

  const { control, setValue } = useForm({
    defaultValues: {
      title: "",
      content: "",
      startTime: null,
      endTime: null,
      meetingDate: null,
      onlineLink: "",
      isCompany: false,
    }
  });

  useEffect(() => {
    if (meetingData) {
      setValue("title", meetingData.title || "");
      setValue("content", meetingData.content || "");
      // startTime/endTime từ API là chuỗi "HH:mm", cần kết hợp meetingDate để tạo dayjs object hợp lệ
      const buildTime = (timeStr) => {
        if (!timeStr) return null;
        if (typeof timeStr === 'string' && timeStr.match(/^\d{2}:\d{2}$/)) {
          const dateBase = meetingData.meetingDate ? dayjs(meetingData.meetingDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
          return dayjs(`${dateBase}T${timeStr}`);
        }
        return dayjs(timeStr).isValid() ? dayjs(timeStr) : null;
      };
      setValue("startTime", buildTime(meetingData.startTime));
      setValue("endTime", buildTime(meetingData.endTime));
      setValue("meetingDate", meetingData.meetingDate || null);
      setValue("onlineLink", meetingData.onlineMeeting?.meetingLink || "");
      setValue("isCompany", meetingData.isCompany || false);
    }
  }, [meetingData, setValue]);

  const canEditAttendance = !!(isChairman || isSecretary) && meetingData?.meetingState !== "KET_THUC";
  // const [comment, setComment] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [recordings, setRecordings] = useState([]);
  const [audioURL, setAudioURL] = useState(null); // For new recording only
  const [time, setTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBlobRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const currentPlayingAudioRef = useRef(null);
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isAttended, setIsAttended] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  // const [ setAttendanceTime] = useState("");
  const [attendanceState, setAttendanceState] = useState("all");
  const isEndingInProgress = useRef(false);
  const autoEndTimerRef = useRef(null);
  const endMeetingRef = useRef(null);
  const logger = console;



  useEffect(() => {
    if (attendanceStatus) {
      setIsAttended(!!attendanceStatus.isAttended);
      if (attendanceStatus.attendanceAt) {
        // setAttendanceTime(dayjs(attendanceStatus.attendanceAt).format("DD/MM/YYYY HH:mm"));
      }
    }
  }, [attendanceStatus]);

  const fullEndTime = useMemo(() => {
    if (meetingData?.meetingDate && meetingData?.endTime) {
      // Construction: YYYY-MM-DDTHH:mm:ss
      // meetingDate is YYYY-MM-DD or similar supported by dayjs
      const datePart = dayjs(meetingData.meetingDate).format("YYYY-MM-DD");
      return `${datePart}T${meetingData.endTime}:00`;
    }
    return null;
  }, [meetingData?.meetingDate, meetingData?.endTime]);

  const hoursLeft = useCountdownHours(fullEndTime, meetingData?.meetingState === "DANG_HOP");

  // TH2: Tự động kết thúc cuộc họp và lưu ghi âm sau 30 phút nếu quên
  useEffect(() => {
    // Chỉ xử lý khi đang trong trạng thái Đang họp và có đủ dữ liệu thời gian
    if (meetingData?.meetingState === "DANG_HOP" && fullEndTime) {
      const endDateTime = dayjs(fullEndTime);
      const now = dayjs();
      
      // Nếu hiện tại đã đến hoặc vượt quá thời gian kết thúc (tương đương hoursLeft == 0)
      if (now.isAfter(endDateTime) || hoursLeft === "00:00:00") {
        if (!autoEndTimerRef.current) {
          // Mốc thời gian tự động đóng là: Thời gian kết thúc + 30 phút
          const autoEndTime = endDateTime.add(30, 'minute');
          const diffMs = autoEndTime.diff(now);

          // Nếu đã quá mốc 30 phút rồi (diff < 0) thì kết thúc ngay, 
          // ngược lại thì hẹn giờ đúng số miligiây còn lại
          autoEndTimerRef.current = setTimeout(() => {
            endMeetingRef.current?.();
            autoEndTimerRef.current = null;
          }, Math.max(0, diffMs));
        }
      }
    } else {
      if (autoEndTimerRef.current) {
        clearTimeout(autoEndTimerRef.current);
        autoEndTimerRef.current = null;
      }
    }
    return () => {
      if (autoEndTimerRef.current) {
        clearTimeout(autoEndTimerRef.current);
      }
    };
  }, [hoursLeft, meetingData?.meetingState, fullEndTime]);

  const [searchCriteria, setSearchCriteria] = useState({
    all: true,
    name: true,
    // position: true,
    // unit: true,
    // status: false
  });

  const handleSearchCriteriaChange = (field) => (event) => {
    if (field === 'all') {
      const isChecked = event.target.checked;
      setSearchCriteria({
        all: isChecked,
        name: isChecked,
      });
      return;
    }
    setSearchCriteria(prev => {
      const newState = { ...prev, [field]: event.target.checked };
      const allChecked = ['name'].every(k => newState[k]);
      newState.all = allChecked;
      return newState;
    });
  };

  const startTimer = (reset = false) => {
    if (reset) setTime(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
  };
   const handleConfirmAttendance = async () => {
    const meetingId = meetingData?.id || meetingData?._id;
    if (!meetingId) {
      toast("Không tìm thấy thông tin cuộc họp", "error");
      return;
    }
    try {
      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/attendance/confirm`);
      toast("Điểm danh thành công!", "success");
      setIsAttended(true);
      onRefreshMeeting?.(); // Refresh the parent meeting detail
      onFetchData?.({ page, limit: rowsPerPage }); // Refresh the participant list
      // setAttendanceTime(dayjs().format("DD/MM/YYYY HH:mm"));
    } catch (error) {
      toast(error?.response?.data?.message || "Điểm danh thất bại", "error");
    } finally {
      setOpenConfirm(false);
    }
  };



  // Not Check Attendance Logic
  const [openNotCheckConfirm, setOpenNotCheckConfirm] = useState(false);
  const [selectedUserNotCheck, setSelectedUserNotCheck] = useState(null);

  const handleNotCheckChange = (user) => {
    setSelectedUserNotCheck(user);
    setOpenNotCheckConfirm(true);
  };

  const handleConfirmNotCheck = async () => {
    const meetingId = meetingData?.id || meetingData?._id;
    if (!meetingId || !selectedUserNotCheck) return;
    
    try {
        await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/attendance/not-check-bulk`, {
            participantIds: [selectedUserNotCheck.participantId],
            notCheck: !selectedUserNotCheck.notCheck
        });
        toast("Cập nhật thành công!", "success");
        onFetchData({
          page,
          limit: rowsPerPage,
          ...(searchText && { keyword: searchText }),
          ...(searchCriteria.all === false && {
            'filter[name]': searchCriteria.name ? searchText : undefined,
            // 'filter[position]': searchCriteria.position ? searchText : undefined,
            // 'filter[unitName]': searchCriteria.unit ? searchText : undefined,
          })
        });
    } catch (error) {
        toast(error?.response?.data?.message || "Cập nhật thất bại", "error");
    } finally {
        setOpenNotCheckConfirm(false);
        setSelectedUserNotCheck(null);
    }
  };

  const handleStartMeeting = useCallback(async (reason = "") => {
    if (isDelegating) return;
    const meetingId = meetingData?.id || meetingData?._id;
    if (!meetingId) {
      toast("Không tìm thấy thông tin cuộc họp", "error");
      return;
    }

    if (typeof reason !== "string") {
      reason = "";
    }

    if (!reason && !openEarlyStartDialog) {
      if (meetingData?.isStartEarly) {
        try {
          const checkRes = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/check-early-start`);
          const checkData = checkRes.data?.data || checkRes.data || checkRes;
          setEarlyStartData(checkData);
        } catch (error) {
          logger.error("Lỗi khi lấy thông tin bắt đầu sớm:", error);
          setEarlyStartData(null);
        }
        setEarlyStartReason("");
        setOpenEarlyStartDialog(true);
        return;
      }
    }

    try {
      const payload = reason ? { reason } : {};
      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/start`, payload);
      toast("Đã bắt đầu cuộc họp!", "success");
      setOpenEarlyStartDialog(false);

      // Tự động điểm danh cho người bắt đầu cuộc họp (Chủ trì hoặc Thư ký)
      try {
        await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/attendance/confirm`);
        setIsAttended(true);
      } catch (attendanceError) {
        // Có thể người dùng đã điểm danh trước đó hoặc lỗi khác, không chặn luồng chính
        // logger.error("Auto attendance error:", attendanceError);
      }

      onRefreshMeeting?.(); // Refresh the parent meeting detail to update state
      onFetchData?.({ page, limit: rowsPerPage });
    } catch (error) {
      toast(error?.response?.data?.message || "Lỗi khi bắt đầu cuộc họp", "error");
    }
  }, [isDelegating, meetingData, openEarlyStartDialog, toast, onRefreshMeeting, onFetchData, page, rowsPerPage]);

  const handleStopRecording = useCallback(() => {
    if (isDelegating) return;
    
    // Use Pause instead of Stop to allow Resume
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      // Tạo blob preview từ chunks đã thu được để user có thể nghe lại ngay
      if (audioChunksRef.current.length > 0) {
        const previewBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioBlobRef.current = previewBlob;
        const url = URL.createObjectURL(previewBlob);
        setAudioURL(url);
      }
    }

    // Stop STT
    if (recognitionRef.current) {
      setRecording(false); 
      recognitionRef.current.stop();
    }
    
    stopTimer();
  }, [isDelegating]);

  const fetchExistingRecording = useCallback(async () => {
    const mId = meetingData?._id || meetingData?.id;
    if (!mId) return;

    try {
      // 1. Fetch File
      const fileRes = await axiosInstance.get(`${APP_BASE}/api/files/by-object`, {
        params: {
          "object_type": 'audioMeeting',
          "object_id": mId
        }
      });

      // Helper to extract array from various response structures
      let files = [];
      if (Array.isArray(fileRes)) {
        files = fileRes;
      } else if (fileRes?.data && Array.isArray(fileRes.data)) {
        files = fileRes.data;
      } else if (fileRes?.data?.data && Array.isArray(fileRes.data.data)) {
         files = fileRes.data.data;
      }

      if (files.length >= 0) {
        setRecordings(files);
      }

      // 2. Fetch Transcript and Duration
      const recordingRes = await axiosInstance.get(`${API_MEETING_RECORDING}/${mId}`);

      if (recordingRes && (recordingRes.data || recordingRes)) {
         const data = recordingRes.data || recordingRes;
         const record = Array.isArray(data) ? data[0] : data;
         if (record && record.transcriptText) {
           setTranscript(record.transcriptText);
         }
         if (record && record.durationSeconds) {
           setTime(record.durationSeconds);
         }
      }
    } catch (error) {
      logger.error("Error fetching existing recording:", error);
    }
  }, [meetingData]);

  const handleSaveRecording = useCallback(async () => {
    if (isDelegating) return;

    // If still recording or paused, stop it first to finalize the blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
       mediaRecorderRef.current.stop();
       // Give it a moment to finalize the onstop callback
       await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!audioBlobRef.current) {
      toast("Vui lòng ghi âm trước khi lưu!", "warning");
      return;
    }

    const mId = meetingData?._id || meetingData?.id;
    if (!mId) {
      toast("Không tìm thấy ID cuộc họp!", "error");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Upload file
      const audioFile = new File([audioBlobRef.current], `recording_${mId}_${Date.now()}.webm`, { type: "audio/webm" });
      await apiUploadFile(audioFile, "audioMeeting", mId);
      
      // 2. Save recording details
      const payload = {
        meetingId: mId,
        durationSeconds: time,
        transcriptText: transcript,
      };

      await axiosInstance.post(API_MEETING_RECORDING, payload);
      
      toast("Lưu thông tin ghi âm thành công!", "success");
      
      // Refresh list to show new file
      await fetchExistingRecording();

      // Clear the current "un-saved" preview
      setAudioURL(null);
      audioBlobRef.current = null;
      audioChunksRef.current = [];
      
      setIsPaused(false); // Reset pause state after saving
    } catch (error) {
      logger.error("Error saving recording:", error);
      toast(error?.response?.data?.message || error?.message || "Lỗi khi lưu ghi âm", "error");
    } finally {
      setIsSaving(false);
    }
  }, [meetingData, time, transcript, toast, isDelegating, fetchExistingRecording]);

  const handleEndMeeting = useCallback(async () => {
    if (isEndingInProgress.current || isDelegating) return;

    const meetingId = meetingData?.id || meetingData?._id;
    if (!meetingId) {
      toast("Không tìm thấy thông tin cuộc họp", "error");
      return;
    }
    try {
      isEndingInProgress.current = true;
      
      // Case 1: Tự động dừng và lưu ghi âm nếu đang chạy
      if (recording) {
        handleStopRecording();
        // Chờ để đảm bảo MediaRecorder hoàn tất việc tạo blob
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Tự động lưu nếu có blob ghi âm chưa được lưu (URL blob)
      if (audioBlobRef.current && (!audioURL || audioURL.startsWith('blob:'))) {
        await handleSaveRecording();
      }

      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/end`);
      toast("Đã kết thúc cuộc họp!", "success");
      onRefreshMeeting?.(); // Refresh the parent meeting detail to update state
      onFetchData?.({ page, limit: rowsPerPage });
    } catch (error) {
      toast(error?.response?.data?.message || "Lỗi khi kết thúc cuộc họp", "error");
    } finally {
      isEndingInProgress.current = false;
    }
  }, [meetingData, recording, audioURL, handleSaveRecording, handleStopRecording, onRefreshMeeting, onFetchData, page, rowsPerPage, toast]);

  useEffect(() => {
    endMeetingRef.current = handleEndMeeting;
  }, [handleEndMeeting]);

  const handleOpenConfirm = useCallback(() => {
    setOpenConfirm(true);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "vi-VN";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + " ";
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => {
            // Remove any trailing interim part if we had one
            const base = (prev || "").split(" ... ")[0].trim();
            return base + " " + finalTranscript;
          });
        }
        
        // If there's interim text, show it with a visual cue
        if (interimTranscript) {
          setTranscript(prev => {
             const base = (prev || "").split(" ... ")[0].trim();
             return base + " ... " + interimTranscript;
          });
        }
      };

      recognition.onerror = (event) => {
        logger.error("Speech Recognition Error:", event.error);
        if (event.error === 'no-speech') {
          return;
        }
        setRecording(false);
      };

      recognition.onend = () => {
        // Only stop if we didn't mean to keep recording
        setRecording(prev => {
          if (prev) {
            // Auto-restart if it was cut off unexpectedly
            try {
              recognition.start();
            } catch (e) {
              // Ignore error if recognition is already started or restarting
            }
            return true;
          }
          return false;
        });
      };
      recognitionRef.current = recognition;
    }
  }, []);

  // Fetch existing recording when tab is opened
  useEffect(() => {
    fetchExistingRecording();
  }, [fetchExistingRecording]);

  const handleStartRecording = async () => {
    if (isDelegating) return;

    // Handle Resume case
    if (isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          logger.log("Recognition restart error:", e);
        }
      }
      setRecording(true);
      setIsPaused(false);
      startTimer(false); // Continue timer from current value
      return;
    }

    // Clear transcript for new session if it contains dummy text
    if (transcript.startsWith("Cuộc họp được tổ chức")) {
       setTranscript("");
    }

    try {
      // 1. Audio Recording (MediaRecorder)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioBlobRef.current = audioBlob;
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Thêm timeslice để ondataavailable fire định kỳ,
      // đảm bảo audioChunksRef có data khi pause()
      mediaRecorder.start(1000);

      // 2. Speech to Text
      if (recognitionRef.current) {
        try {
           recognitionRef.current.start();
        } catch (e) {
           logger.log("Recognition already started or error:", e);
        }
      }

      setRecording(true);
      setIsPaused(false);
      startTimer(true); // Reset timer for fresh recording
    } catch (error) {
      logger.error("Error starting recording:", error);
      alert("Không thể truy cập Microphone. Vui lòng kiểm tra quyền thiết bị.");
    }
  };

  const handleExportAudioTranscript = useCallback(async () => {
    const meetingId = meetingData?.id || meetingData?._id;
    if (!meetingId) {
      toast("Không tìm thấy thông tin cuộc họp", "error");
      return;
    }
    
    try {
      setIsSaving(true);
      const fileName = `Noi_dung_ghi_am_${meetingData?.title?.replace(/\s+/g, '_') || 'Cuoc_hop'}`;
      const response = await axiosInstance.get(API_EXPORT_REPORT, {
        params: {
          recordId: meetingId,
          exportType: "word",
          viewConfigCode: "AUDIO_TRANSCRIPT"
        },
        responseType: "blob",
      });
      
      const blob = new Blob([response.data || response], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast("Xuất file thành công", "success");
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi khi xuất file", "error");
    } finally {
      setIsSaving(false);
    }
  }, [meetingData, toast]);


  
  // Popover states
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  const handleSearchOptionClick = useCallback((event) => setSearchAnchorEl(event.currentTarget), []);
  const handleSearchOptionClose = useCallback(() => setSearchAnchorEl(null), []);
  const handleFilterClick = useCallback((event) => setFilterAnchorEl(event.currentTarget), []);
  const handleFilterClose = useCallback(() => setFilterAnchorEl(null), []);

  const openSearchPopover = Boolean(searchAnchorEl);
  const openFilterPopover = Boolean(filterAnchorEl);

  const handleAttendanceStateChange = useCallback((e) => {
    setAttendanceState(e.target.value);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchText(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setPage(1);
    setAttendanceState("all");
    onFetchData({ page: 1, limit: rowsPerPage, keyword: "" });
  }, [onFetchData, rowsPerPage]);

  const handleSearch = useCallback(() => {
    setPage(1);
    const params = {
      page: 1,
      limit: rowsPerPage,
    };
    if (searchText) {
      if (searchCriteria.all || searchCriteria.name) params['filter[name]'] = searchText;
    }
    if (attendanceState !== "all") {
      params['filter[attendanceState]'] = attendanceState;
    }
    onFetchData(params);
  }, [searchText, rowsPerPage, onFetchData, searchCriteria, attendanceState]);

  // const handleApplyFilter = useCallback(() => {
  //   handleSearch();
  //   handleFilterClose();
  // }, [handleSearch, handleFilterClose]);

 

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
    const params = {
      page: newPage,
      limit: rowsPerPage,
    };
    if (searchText) {
       if (searchCriteria.all || searchCriteria.name) params['filter[name]'] = searchText;
    }
    if (attendanceState !== "all") {
      params['filter[attendanceState]'] = attendanceState;
    }
    onFetchData(params);
  }, [rowsPerPage, searchText, onFetchData, searchCriteria, attendanceState]);
 const handlePrevPage = useCallback((e) => handleChangePage(e, page - 1), [handleChangePage, page]);
  const handleNextPage = useCallback((e) => handleChangePage(e, page + 1), [handleChangePage, page]);
  const handleChangeRowsPerPage = useCallback((event) => {
    const newRows = parseInt(event.target.value, 10);
    setRowsPerPage(newRows);
    setPage(1);
    onFetchData({ page: 1, limit: newRows, keyword: searchText });
  }, [onFetchData, searchText]);

    const handleCloseConfirm = useCallback(() => {
    setOpenConfirm(false);
  }, []);

  const handleCloseNotCheckConfirm = useCallback(() => {
    setOpenNotCheckConfirm(false);
  }, []);

  // const [isExpandedDocs, setIsExpandedDocs] = useState({});

  // const toggleDoc = useCallback((id) => {
  //   setIsExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
  // }, []);

  // const handleToggleUnit1 = useCallback(() => {
  //   toggleDoc('unit1');
  // }, [toggleDoc]);

  // const handleToggleDoc1 = useCallback(() => {
  //   toggleDoc('doc1');
  // }, [toggleDoc]);

  // const handleCommentChange = useCallback((e) => {
  //   setComment(e.target.value);
  // }, []);

  // Calculate attendance stats
  const stats = useMemo(() => {
    if (attendanceStats) return attendanceStats;

    return participants.reduce((acc, p) => {
      if (p.status === 'present') acc.present++;
      else if (p.status === 'absent') acc.absent++;
      else acc.waiting++; 
      return acc;
    }, { total: participants.length, present: 0, absent: 0, waiting: 0, noNeed: 0 });
  }, [participants, attendanceStats]);

  const totalRows = totalTotal;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  // Khi play 1 audio thì pause tất cả audio khác
  const handleAudioPlay = useCallback((audioElement) => {
    if (currentPlayingAudioRef.current && currentPlayingAudioRef.current !== audioElement) {
      currentPlayingAudioRef.current.pause();
    }
    currentPlayingAudioRef.current = audioElement;
  }, []);

  const handleNewRecordingPlay = useCallback((e) => {
    handleAudioPlay(e.target);
  }, [handleAudioPlay]);

  const handleCloseEarlyStartDialog = useCallback(() => {
    setOpenEarlyStartDialog(false);
  }, []);

  const handleConfirmEarlyStart = useCallback(() => {
    handleStartMeeting(earlyStartReason);
  }, [handleStartMeeting, earlyStartReason]);

  return (
    <ManagementContainer>
      {/* HEADER SECTION */}
      <HeaderActions>
        <HeaderButtons>
          <StartMeetingButton 
            variant="contained" 
            startIcon={<PlayArrowIcon />}
            onClick={handleStartMeeting}
            disabled={meetingData?.meetingState === "DANG_HOP" || meetingData?.meetingState === "KET_THUC" || isDelegating}
          >
            Bắt đầu cuộc họp
          </StartMeetingButton>
          <EndMeetingButton 
            variant="contained" 
            startIcon={<StopIcon />}
            onClick={handleEndMeeting}
            disabled={meetingData?.meetingState !== "DANG_HOP" || isDelegating}
          >
            Kết thúc cuộc họp
          </EndMeetingButton>
        </HeaderButtons>
        <StatusGroup>
          <StatusChip type="success">
            Trạng thái: {meetingData?.meetingDuration?.stateLabel || "Đang diễn ra"}
          </StatusChip>
          <StatusChip type="info">
            <StyledAccessTimeIcon /> Còn lại: {hoursLeft}
          </StatusChip>
        </StatusGroup>
      </HeaderActions>
        <AttendanceActionBar>
          <AttendanceInfoWrapper>
            {isAttended && attendanceStatus?.attendanceAt ? (
              <AttendanceSuccessBox>
                <AttendanceSuccessText>Bạn đã điểm danh</AttendanceSuccessText>
                <AttendanceSuccessTime>Vào lúc : {dayjs(attendanceStatus.attendanceAt).format("DD/MM/YYYY HH:mm")}</AttendanceSuccessTime>
              </AttendanceSuccessBox>
            ) : (
              meetingData?.meetingState === "KET_THUC" ? null : 
              <AttendanceActionButton
                variant="contained" 
                startIcon={<PanToolIcon />}
                onClick={handleOpenConfirm}
                isGray={meetingData?.meetingState !== "DANG_HOP" || meetingData?.attendanceLocked || (isAttended && !attendanceStatus?.attendanceAt) || isDelegating}
                disabled={meetingData?.meetingState !== "DANG_HOP" || meetingData?.attendanceLocked || (isAttended && !attendanceStatus?.attendanceAt) || isDelegating}
              >
                  Điểm danh
              </AttendanceActionButton>
              
            )}

            {meetingData?.attendanceLocked && (
              <AttendanceLockInfo>
                <AttendanceSeparator component="span">|</AttendanceSeparator>
                <AttendanceLockIcon />
                Cuộc họp đã khóa điểm danh
              </AttendanceLockInfo>
            )}
          </AttendanceInfoWrapper>

          <StatusIndicator>
              Trạng thái: {meetingData?.meetingDuration?.stateLabel || "Cuộc họp đang diễn ra"}
          </StatusIndicator>
        </AttendanceActionBar>

      {/* INFO SECTION */}
      <SectionPaper elevation={0}>
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
                                                // onChange={handleIsCompanyChange}
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
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <InputComponents
                  label="Tiêu đề cuộc họp"
                  {...field}
                  required
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="startTime"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Thời gian bắt đầu"
                  value={field.value}
                  timeOnly
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="endTime"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Thời gian kết thúc"
                  value={field.value}
                  timeOnly
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <InputComponents
                  label="Nội dung cuộc họp"
                  multiline
                  rows={4}
                  {...field}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="onlineLink"
              control={control}
              render={({ field }) => (
                <InputComponents
                  label="Link tham gia cuộc họp online"
                  {...field}
                />
              )}
            />
          </Grid>
        </Grid>
      </SectionPaper>

      {/* RECORDING SECTION */}
      <SectionPaper elevation={0}>
        <RecordingHeaderWrapper>
          <IconTextWrapper>
            <StyledIconWrapper>
              <StyledMicIcon />
            </StyledIconWrapper>
            <StyledHeaderContent variant="h6" noWrap>
              Ghi âm cuộc họp
            </StyledHeaderContent>
          </IconTextWrapper>
          {meetingData?.meetingState !== "KET_THUC" && (
            <RecordingControlsWrapper>
              <RecordingDurationText variant="caption">
                Thời lượng ghi âm: {formatDuration(time)}
              </RecordingDurationText>
              <RecordingButtons>
                <ActionButton 
                  variant="contained" 
                  variantType="start" 
                  startIcon={<PlayArrowIcon />} 
                  size="small"
                  onClick={handleStartRecording}
                  disabled={meetingData?.meetingState !== "DANG_HOP" || (recording && !isPaused) || isDelegating}
                >
                  {recording ? "Đang ghi..." : (isPaused ? "Tiếp tục ghi" : "Bắt đầu ghi âm")}
                </ActionButton>
                <ActionButton 
                  variant="contained" 
                  variantType="end" 
                  startIcon={<PauseIcon />} 
                  size="small"
                  onClick={handleStopRecording}
                  disabled={meetingData?.meetingState !== "DANG_HOP" || !recording || isDelegating}
                >
                  Tạm dừng
                </ActionButton>
                <ButtonOutline 
                  variant="contained" 
                  startIcon={<SaveIcon />} 
                  size="small"
                  onClick={handleSaveRecording}
                  disabled={meetingData?.meetingState !== "DANG_HOP" || isSaving || (recording && !isPaused) || !audioBlobRef.current && !isPaused || isDelegating}
                >
                  {isSaving ? "Đang lưu..." : "Lưu ghi âm"}
                </ButtonOutline>
              </RecordingButtons>
            </RecordingControlsWrapper>
          )}
          
        </RecordingHeaderWrapper>
        <StyledDivider />
        <RecordingSplitWrapper>
          {/* LEFT COLUMN: TRANSCRIPT */}
          <RecordingTranscriptColumn>
            <TranscriptionHeader>
              <TranscriptionLabel>NỘI DUNG GHI ÂM</TranscriptionLabel>
              {meetingData?.meetingState === "KET_THUC" && (
                <Tooltip title="Xuất file">
                  <ExportIconButton 
                    onClick={handleExportAudioTranscript}
                    disabled={!transcript || isSaving}
                  >
                    {isSaving ? <ExportLoadingSpinner /> : <StyledDownloadIcon />}
                  </ExportIconButton>
                </Tooltip>
              )}
            </TranscriptionHeader>
            <RecordingContent>
              {transcript || ""}
            </RecordingContent>
          </RecordingTranscriptColumn>

          {/* RIGHT COLUMN: FILES */}
          <RecordingFilesColumn>
            <TranscriptionHeader>
              <TranscriptionLabel>FILE GHI ÂM</TranscriptionLabel>
            </TranscriptionHeader>
            
            {/* New live recording player if exists */}
            {audioURL && (
              <NewAudioFileItemCard>
                <AudioFileHeader>
                  <NewStyledMicIcon />
                  <NewAudioFileNameText variant="body2">
                    Bản ghi âm mới (Chưa lưu)
                  </NewAudioFileNameText>
                  <a href={audioURL} download="new_recording.webm">
                    <NewStyledDownloadIcon />
                  </a>
                </AudioFileHeader>
                <AudioPlayerWrapper>
                  <audio controls src={audioURL} className="audio-player" onPlay={handleNewRecordingPlay} />
                </AudioPlayerWrapper>
                <AudioTimeText variant="caption">
                  <SmallAccessTimeIcon /> Vừa mới ghi
                </AudioTimeText>
              </NewAudioFileItemCard>
            )}

            {/* List of saved recordings */}
            {recordings.length > 0 ? (
              recordings.map((file, idx) => (
                <AudioFileItem key={file.id || file._id || idx} file={file} onAudioPlay={handleAudioPlay} />
              ))
            ) : !audioURL && (
              <EmptyFilesBox>
                <Typography variant="body2">Chưa có file ghi âm nào</Typography>
              </EmptyFilesBox>
            )}
          </RecordingFilesColumn>
        </RecordingSplitWrapper>
      </SectionPaper>


      {/* DOCUMENTS SECTION */}
      {/* <SectionPaper elevation={0}>
        <SectionTitle variant="h6">Tài liệu họp</SectionTitle>
        <DocumentAccordionItem>
          <DocumentAccordionHeader onClick={handleToggleUnit1}>
            <UnitTitle variant="subtitle2">Phòng công nghệ thông tin</UnitTitle>
            {isExpandedDocs['unit1'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </DocumentAccordionHeader>
          <Collapse in={isExpandedDocs['unit1']}>
            <Box p={2}>
  
              <DocumentAccordionItem>
                <DocumentAccordionHeader onClick={handleToggleDoc1} isNested>
                  <DocumentTitle variant="body2">Báo cáo tiến độ</DocumentTitle>
                  {isExpandedDocs['doc1'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </DocumentAccordionHeader>
                <Collapse in={isExpandedDocs['doc1']}>
                  <Box p={2} pt={0}>
                    <InfoLabel>Nội dung:</InfoLabel>
                    <ContentInfoValue variant="body2">Tiến độ dự án xây dựng cảng 2024...</ContentInfoValue>
                    <FileItemBox>
                      <StyledDescriptionIcon />
                      <FileNameText variant="caption">Tai_lieu_hop_12_2024.pdf</FileNameText>
                      <FileSizeText variant="caption">(2.5 MB)</FileSizeText>
                      <Spacer />
                      <IconButton size="small"><StyledChatIcon /></IconButton>
                    </FileItemBox>
                    <CommentBox>
                      <CommentItem>
                        <div className="avatar">N</div>
                        <Box>
                          <CommentAuthor variant="caption">Nguyễn Văn A (Trưởng phòng CNTT)</CommentAuthor>
                          <Typography variant="body2">Tài liệu rất chi tiết và đầy đủ thông tin.</Typography>
                        </Box>
                      </CommentItem>
                      <TextField 
                        fullWidth 
                        size="small" 
                        placeholder="Nhập ý kiến của bạn..." 
                        value={comment}
                        onChange={handleCommentChange}
                        InputProps={{
                          endAdornment: (
                            <StyledInputAdornment>
                              <StyledSendIconButton size="small"><SendIcon /></StyledSendIconButton>
                            </StyledInputAdornment>
                          )
                        }}
                      />
                    </CommentBox>
                  </Box>
                </Collapse>
              </DocumentAccordionItem>
            </Box>
          </Collapse>
        </DocumentAccordionItem>
      </SectionPaper> */}

      {/* ATTENDANCE SECTION */}
      <SectionPaper elevation={0}>
        {/* Header */}
        <AttendanceHeaderBox>
          <StyledHeaderContent variant="h6" noWrap>Danh sách người tham gia</StyledHeaderContent>
        </AttendanceHeaderBox>
        <StyledDivider />
        <SearchContainer>
          <StyledFilterButton 
            startIcon={<PopoverFilterIcon />}
            onClick={handleFilterClick}
          >
            Bộ lọc
          </StyledFilterButton>
          <StyledSearchField
            placeholder="Tìm kiếm..."
            value={searchText}
            onChange={handleSearchChange}
            onKeyPress={handleKeyDown}
            InputProps={{
              endAdornment: (
                <StyledInputAdornmentEnd>
                  {searchText && (
                    <ClearSearchIconButton size="small" onClick={handleClearSearch}>
                      <InputClearIcon />
                    </ClearSearchIconButton>
                  )}
                  <SearchOptionIconButton onClick={handleSearchOptionClick}>
                    <PremiumTuneIcon />
                  </SearchOptionIconButton>
                </StyledInputAdornmentEnd>
              )
            }}
          />
          <StyledSearchButton onClick={handleSearch}>
            <WhitePopoverSearchIcon />
          </StyledSearchButton>
        </SearchContainer>

        <Popover
          open={openSearchPopover}
          anchorEl={searchAnchorEl}
          onClose={handleSearchOptionClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={PopoverPaperProps}
        >
          <FilterPopoverContent>
            <PopoverTitle><PopoverSearchIcon /> Lọc tìm kiếm</PopoverTitle>
            <SearchFilterGrid>
                <FormControlLabel
                  control={<Checkbox checked={searchCriteria.name} onChange={handleSearchCriteriaChange('name')} size="small" />}
                  label="Họ tên"
                />
            </SearchFilterGrid>
            <FilterActions>
              <SkyButton onClick={handleSearchOptionClose} size="small">Hủy</SkyButton>
              <SkyButton variant="contained" onClick={handleSearch} size="small">Áp dụng</SkyButton>
            </FilterActions>
          </FilterPopoverContent>
        </Popover>

        <Popover
          open={openFilterPopover}
          anchorEl={filterAnchorEl}
          onClose={handleFilterClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={PopoverPaperProps}
        >
          <FilterPopoverContent>
            <PopoverTitle><PopoverFilterIcon /> Bộ lọc</PopoverTitle>
            <Box>
                <InputLabel>Trạng thái điểm danh</InputLabel>
                <StyledSelect
                  fullWidth
                  value={attendanceState}
                  onChange={handleAttendanceStateChange}
                  size="small"
                >
                 <MenuItem value="all">Tất cả trạng thái</MenuItem>
                    <MenuItem value="CHECKED">Đã điểm danh</MenuItem>
                    <MenuItem value="NOT_CHECKED">Vắng mặt</MenuItem>
                    <MenuItem value="NO_REQUIRED">Không cần điểm danh</MenuItem>
                    <MenuItem value="RECEIVED">Chưa điểm danh</MenuItem>
                </StyledSelect>
            </Box>
            <FilterActions>
              <SkyButton onClick={handleFilterClose} size="small">Hủy</SkyButton>
              <SkyButton variant="contained" onClick={handleSearch} size="small">Áp dụng</SkyButton>
            </FilterActions>
          </FilterPopoverContent>
        </Popover>

        <AttendanceTableWrapper>
          {/* Stats Banner */}
          <AttendanceStatsBanner>
            <AttendanceStatsBannerLabel>Trạng thái điểm danh</AttendanceStatsBannerLabel>
            <AttendanceStatsBannerRight>
              <span>Tổng số:&nbsp;<span className="stat-val">{stats.total}</span></span>
              <StatBannerItem>
                <span className="stat-sep" style={{ backgroundColor:'#3b82f6' }} />
                <StatItemBlue>Không cần điểm danh:&nbsp;<span className="stat-val">{stats.noNeed}</span></StatItemBlue>
              </StatBannerItem>
              <StatBannerItem>
                <span className="stat-sep" style={{ backgroundColor:'#10b981' }} />
                <StatItemGreen>Có mặt:&nbsp;<span className="stat-val">{stats.present}</span></StatItemGreen>
              </StatBannerItem>
              <StatBannerItem>
                <span className="stat-sep" style={{ backgroundColor:'#ef4444' }} />
                <StatItemRed>Vắng:&nbsp;<span className="stat-val">{stats.absent || 0}</span></StatItemRed>
              </StatBannerItem>
              {meetingData?.meetingState !== "KET_THUC" && (
                <StatBannerItem>
                  <span className="stat-sep" style={{ backgroundColor:'#64748b' }} />
                  <StatItemGrey>Chưa điểm danh:&nbsp;<span className="stat-val">{stats.waiting}</span></StatItemGrey>
                </StatBannerItem>
              )}
            </AttendanceStatsBannerRight>
          </AttendanceStatsBanner>

          {/* Participant 2-col grid */}
          <AttendanceParticipantGrid>
            {participants.map((p, i) => {
                const m = {
                    name: p.name,
                    role: p.title || p.position || "",
                    unit: p.organizationUnit?.name || "",
                    status: p.status,
                    id: p.participantId || p.id,
                    noAttendance: !!p.notCheck,
                    _original: p
                };

                return (
                    <AttendanceRowItem 
                        key={m.id || i}
                        member={m}
                        onNotCheckChange={handleNotCheckChange}
                        canEditAttendance={canEditAttendance}
                        isDelegating={isDelegating}
                    />
                );
            })}
            {participants.length === 0 && (
              <NoDataBox isGrid>
                <Typography variant="body2">Không tìm thấy kết quả</Typography>
              </NoDataBox>
            )}
          </AttendanceParticipantGrid>
        </AttendanceTableWrapper>

        <PaginationWrapper>
          <PaginationContainerStyled>
            <span>
              Hiển thị {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, totalRows)} trong tổng số {totalRows} bản ghi
            </span>

            <PaginationActionsBox>
              <StyleDropDown>
                <span>Hiển thị</span>
                <StyledSelect
                  value={rowsPerPage}
                  onChange={handleChangeRowsPerPage}
                  size="small"
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </StyledSelect>
              </StyleDropDown>

              <StyleNavButton
                onClick={handlePrevPage}
                disabled={page === 1}
              >
                Trước
              </StyleNavButton>

              <StyleActionPage>
                {generatePaginationPages(page, totalPages, handleChangePage)}
              </StyleActionPage>

              <StyleNavButton
                onClick={handleNextPage}
                disabled={page >= totalPages}
              >
                Sau
              </StyleNavButton>
            </PaginationActionsBox>
          </PaginationContainerStyled>
        </PaginationWrapper>
      </SectionPaper>

      <CustomDialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        onSave={handleConfirmAttendance}
        title=
             "Xác nhận điểm danh cuộc họp"
        
        titleButton="Xác nhận"
      >
          <SkyTypography variant="body1">
              Bạn xác nhận đã có mặt và tham dự cuộc họp &quot;{meetingData?.title}&quot;
          </SkyTypography>
      </CustomDialog>

      <CustomDialog
        open={openNotCheckConfirm}
        onClose={handleCloseNotCheckConfirm}
        onSave={handleConfirmNotCheck}
        title={selectedUserNotCheck?.notCheck ? "Xác nhận cần điểm danh" : "Xác nhận không cần điểm danh"}
        titleButton="Xác nhận"
      >
          <SkyTypography variant="body1">
              Xác nhận thành viên <b>{selectedUserNotCheck?.name}</b> {selectedUserNotCheck?.notCheck ? "cần điểm danh" : "không cần điểm danh"}?
          </SkyTypography>
      </CustomDialog>

      <EarlyStartWarningDialog 
        open={openEarlyStartDialog}
        onClose={handleCloseEarlyStartDialog}
        onConfirm={handleConfirmEarlyStart}
        data={earlyStartData}
        reason={earlyStartReason}
        setReason={setEarlyStartReason}
      />
    </ManagementContainer>
  );
};

export default MeetingManagement;
