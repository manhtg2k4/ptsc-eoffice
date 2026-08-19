import React, { useState, useCallback, useMemo, useEffect } from "react";
import { withFormWrapper } from "@components/common/FormWrapper";
import { Controller, useForm } from "react-hook-form";
import { 
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { Box, Grid, MenuItem, Typography, Popover, FormControlLabel, Checkbox, InputLabel } from "@mui/material";
import { SkyButton , 
  SkyBox, 
  SkyTypography, 
  // SkyIconButton
} from "@styles/SkyStyles";  
// import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// import ExpandLessIcon from "@mui/icons-material/ExpandLess";
// import SendIcon from "@mui/icons-material/Send";
// import FilterListIcon from "@mui/icons-material/FilterList";
import PanToolIcon from "@mui/icons-material/PanTool";
// import LockIcon from "@mui/icons-material/Lock";
import dayjs from "dayjs";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";


import {
  AttendanceContainer,
  InfoSection,
  // AttendanceStats,
  // AttendanceRow,
  // PageSizeBox,
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
  AttendanceActionBar,
  AttendanceSuccessBox,
  AttendanceSuccessText,
  AttendanceSuccessTime,
  StatusIndicator,
  AttendanceInfoWrapper,
  AttendanceLockInfo,
  AttendanceSeparator,
  AttendanceLockIcon,
  AttendanceHeaderBox,
  // AttendanceTitle,
  StatItemBlue,
  StatItemRed,
  StatItemGreen,
  StatItemGrey,
  // MemberInfoBox,
  // MemberNameText,
  // ActionsBox,
  NoAttendanceFormLabel,
  CustomCheckbox,
  // PaginationBox,
  // PageInfoText,
  NoDataBox,
  AttendanceActionButton,
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
  PaginationWrapper,
  PaginationContainerStyled,
  PaginationActionsBox,
  StyleDropDown,
  StyleNavButton,
  StyleActionPage,
  StylePageButton,
  StylePageDots,
  StyledSelect,
  SearchContainer,
  StyledSearchField,
  StyledSearchButton,
  StyledFilterButton,
  StyledInputAdornment,
  MeetingHeaderWrapper,
  IconTextWrapper,
  StatBannerItem,
  PopoverPaperProps
} from "@pages/MeetingCalendar/componentStyle/MeetingAttendance.styles";


// import {
//     InfoLabel,
//     InfoValue,
//     LinkBox,
//     // CommentBox,
//     // CommentItem
// } from "@pages/MeetingCalendar/componentStyle/MeetingManagement.styles";
// import DOMPurify from "dompurify";
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
  const currentPage = page; // currentPage is 1-indexed in our buttons
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


const MeetingAttendance = ({ meetingData, sharedComponents, participants = [], attendanceStats, onFetchData, totalTotal = 0, attendanceStatus, onRefreshMeeting, isChairman, isSecretary, isDelegating }) => {
  const {
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
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

  const canEditAttendance = !!(isChairman || isSecretary);
  const toast = useToast();
  const [isAttended, setIsAttended] = useState(false);
  // const [ At, setAttendanceTime] = useState("");
  const [openConfirm, setOpenConfirm] = useState(false);
  const [attendanceState, setAttendanceState] = useState("all");

  React.useEffect(() => {
    if (attendanceStatus) {
      setIsAttended(!!attendanceStatus.isAttended);
      if (attendanceStatus.attendanceAt) {
        // setAttendanceTime(dayjs(attendanceStatus.attendanceAt).format("DD/MM/YYYY HH:mm"));
      }
    }
  }, [attendanceStatus]);
  
  // Search and Pagination State
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [searchCriteria, setSearchCriteria] = useState({
    all: true,
    name: true,
    // position: true,
    // unit: true,
    // status: false
  });
  // Popover states
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  const handleSearchOptionClick = (event) => setSearchAnchorEl(event.currentTarget);
  const handleSearchOptionClose = () => setSearchAnchorEl(null);
  const handleFilterClick = (event) => setFilterAnchorEl(event.currentTarget);
  const handleFilterClose = () => setFilterAnchorEl(null);

  const openSearchPopover = Boolean(searchAnchorEl);
  const openFilterPopover = Boolean(filterAnchorEl);

  const handleSearchChange = useCallback((e) => {
    setSearchText(e.target.value);
  }, []);

  // Handle Search Criteria Checkbox Change
  const handleSearchCriteriaChange = (field) => (event) => {
    if (field === 'all') {
      const isChecked = event.target.checked;
      setSearchCriteria({
        all: isChecked,
        name: isChecked,
        // position: isChecked,
        // unit: isChecked,
        // status: isChecked
      });
      return;
    }

    setSearchCriteria(prev => {
      const newState = {
        ...prev,
        [field]: event.target.checked
      };
      
      const allChecked = ['name'].every(k => newState[k]);
      newState.all = allChecked;
      
      return newState;
    });
  };


  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setPage(1);
    setAttendanceState("all");
    onFetchData({ page: 1, limit: rowsPerPage, keyword: "" });
  }, [onFetchData, rowsPerPage]);

  const handleOpenConfirm = () => {
    if (isDelegating) return;
    setOpenConfirm(true);
  };

  const handleCloseConfirm = useCallback(() => {
    setOpenConfirm(false);
  }, []);

  const handleCloseNotCheckConfirm = useCallback(() => {
    setOpenNotCheckConfirm(false);
  }, []);

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

  // Handle Search
  const handleSearch = useCallback(() => {
    setPage(1); // Reset to first page
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
  }, [rowsPerPage, searchText, onFetchData, searchCriteria, attendanceState]);

  const handleAttendanceStateChange = useCallback((e) => {
    setAttendanceState(e.target.value);
  }, []);

  // const handleApplyFilter = useCallback(() => {
  //   handleSearch();
  //   handleFilterClose();
  // }, [handleSearch, handleFilterClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  // Handle Pagination
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

  const handleChangeRowsPerPage = (event) => {
    const newRows = parseInt(event.target.value, 10);
    setRowsPerPage(newRows);
    setPage(1);
    onFetchData({
      page: 1,
      limit: newRows,
      ...(searchText && { keyword: searchText }) // Simplified for rows change
    });
  };
  const totalRows = totalTotal;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  // Derived stats
  const stats = React.useMemo(() => {
    if (attendanceStats) return attendanceStats;

    // Fallback logic if stats not provided
    return participants.reduce((acc, p) => {
      if (p.status === 'present') acc.present++;
      else if (p.status === 'absent') acc.absent++;
      else acc.waiting++; 
      return acc;
    }, { total: participants.length, present: 0, absent: 0, waiting: 0, noNeed: 0 });
  }, [participants, attendanceStats]);

  return (
    <AttendanceContainer>
       {/* ACTION BAR */}
        <AttendanceActionBar>
          <AttendanceInfoWrapper>
            {isAttended && attendanceStatus?.attendanceAt ? (
              <AttendanceSuccessBox>
                <AttendanceSuccessText>Bạn đã điểm danh</AttendanceSuccessText>
                <AttendanceSuccessTime>Vào lúc : {dayjs(attendanceStatus.attendanceAt).format("DD/MM/YYYY HH:mm")}</AttendanceSuccessTime>
              </AttendanceSuccessBox>
            ) : (
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

      {/* THÔNG TIN CUỘC HỌP */}
      <InfoSection elevation={0}>
        <Grid item xs={12}>
          <MeetingHeaderWrapper>
            <IconTextWrapper>
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
            </IconTextWrapper>
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
          </MeetingHeaderWrapper>
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
      </InfoSection>

      
      {/* <InfoSection elevation={0}>
        <SectionTitle variant="h6">Tài liệu họp</SectionTitle>
        
      
        <DocumentAccordionItem>
          <DocumentAccordionHeader onClick={handleToggleUnit1}>
            <UnitTitle variant="subtitle2">Phòng công nghệ thông tin</UnitTitle>
            {isExpandedDocs['unit1'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </DocumentAccordionHeader>
          <Collapse in={isExpandedDocs['unit1']}>
            <Box p={2}>
             
              <DocumentAccordionItem>
                <TransparentAccordionHeader onClick={handleToggleDoc1}>
                  <DocTitle variant="body2">Báo cáo tiến độ</DocTitle>
                  {isExpandedDocs['doc1'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </TransparentAccordionHeader>
                <Collapse in={isExpandedDocs['doc1']}>
                    <EmptyDocBox>
                        <EmptyDocText variant="caption">Chưa có tài liệu</EmptyDocText>
                    </EmptyDocBox>
                </Collapse>
              </DocumentAccordionItem>

        
              <DocumentAccordionItem>
                <TransparentAccordionHeader onClick={handleToggleDoc2}>
                  <DocTitle variant="body2">Báo cáo doanh số</DocTitle>
                  {isExpandedDocs['doc2'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </TransparentAccordionHeader>
                <Collapse in={isExpandedDocs['doc2']}>
                    <Box p={2}>
                        <InfoLabel>Nội dung :</InfoLabel>
                        <ContentInfoValue variant="body2">
                            Tiến độ dự án xây dựng cảng 2024<br/>
                            Tiến độ thu hồi vốn đầu tư quý 3 năm 2025
                        </ContentInfoValue>
                        <InfoLabel>Danh sách tài liệu</InfoLabel>
                        
                        {[1, 2].map((i) => (
                             <FileItemBox key={i}>
                                <StyledDescriptionIcon />
                                <FileDetailsBox>
                                    <FileNameText variant="body2">Tai_lieu_hop_12_2024.pdf</FileNameText>
                                    <FileSizeText variant="caption">2.5 MB</FileSizeText>
                                </FileDetailsBox>
                                <DiscussionBox>
                                    <StyledChatIcon />
                                    <Typography variant="caption">Thảo luận (2)</Typography>
                                    <StyledExpandIcon />
                                </DiscussionBox>
                             </FileItemBox>
                        ))}

                        <DiscussionTitle variant="subtitle2">Thảo luận tài liệu</DiscussionTitle>
                        <CommentBox>
                            <CommentItem>
                                <AvatarN>N</AvatarN>
                                <Box>
                                    <CommentAuthorName variant="caption">Nguyễn Văn A (Trưởng phòng CNTT)</CommentAuthorName>
                                    <TimeText variant="caption">14:30 - 15/12/2025</TimeText>
                                    <Typography variant="body2">Tài liệu rất chi tiết và đầy đủ thông tin.</Typography>
                                </Box>
                            </CommentItem>
                            <CommentItem>
                                <AvatarT>T</AvatarT>
                                <Box>
                                    <CommentAuthorName variant="caption">Trần Thị B (Cán bộ phòng tài chính )</CommentAuthorName>
                                    <TimeText variant="caption">15:15 - 15/12/2025</TimeText>
                                    <Typography variant="body2">Cần bổ sung thêm phần phân tích chi phí ở mục 3.</Typography>
                                </Box>
                            </CommentItem>
                            
                            <CommentTextField 
                                fullWidth 
                                size="small" 
                                placeholder="Nhập ý kiến của bạn..." 
                                value={comment}
                                onChange={handleCommentChange}
                                InputProps={{
                                    endAdornment: (
                                        <StyledInputAdornment>
                                            <SendButton variant="contained" size="small" startIcon={<SendIcon />}>
                                                Gửi
                                            </SendButton>
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

        <DocumentAccordionItem>
            <DocumentAccordionHeader>
                <UnitTitle variant="subtitle2">Phòng hậu cần</UnitTitle>
                <ExpandMoreIcon />
            </DocumentAccordionHeader>
        </DocumentAccordionItem>
        <DocumentAccordionItem>
            <DocumentAccordionHeader>
                <UnitTitle variant="subtitle2">Phòng kinh doanh</UnitTitle>
                <ExpandMoreIcon />
            </DocumentAccordionHeader>
        </DocumentAccordionItem>
      </InfoSection> */}

      
      <InfoSection elevation={0}>
        {/* Header */}
        <AttendanceHeaderBox>
            <StyledHeaderContent variant="h6" noWrap>Danh sách người tham gia</StyledHeaderContent>
        </AttendanceHeaderBox>
        <StyledDivider />

        {/* Search bar */}

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
                <StyledInputAdornment>
                  {searchText && (
                    <ClearSearchIconButton size="small" onClick={handleClearSearch}>
                      <InputClearIcon />
                    </ClearSearchIconButton>
                  )}
                  <SearchOptionIconButton onClick={handleSearchOptionClick}>
                    <PremiumTuneIcon />
                  </SearchOptionIconButton>
                </StyledInputAdornment>
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
                <InputLabel variant="caption">Trạng thái điểm danh</InputLabel>
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
      </InfoSection>

          <CustomDialog
            open={openConfirm}
            onClose={handleCloseConfirm}
            onSave={handleConfirmAttendance}
            title=
                 "Xác nhận điểm danh cuộc họp"
            titleButton="Xác nhận"
          >
           <SkyBox>
              <SkyTypography variant="body1">
                  Bạn xác nhận đã có mặt và tham dự cuộc họp &quot;{meetingData?.title}&quot;
              </SkyTypography>
              </SkyBox>
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
    </AttendanceContainer>
  );
};

export default MeetingAttendance;
