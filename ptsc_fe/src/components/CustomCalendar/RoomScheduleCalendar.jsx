import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';

// --- MUI ICONS ---
import { Search, FilterAlt, Tune, CenterFocusStrong, CenterFocusWeak, ChevronLeft, ChevronRight, Close } from '@mui/icons-material';
import { FormControlLabel, ClickAwayListener } from '@mui/material';
import api from '@services/api'; 
import Loading from '@components/Loading/Loading'; 
import {
    Container,
    Toolbar,
    SearchBarWrapper,
    UnifiedSearchGroup,
    FilterTrigger,
    FilterTriggerBox,
    UnifiedInput,
    TuneIconBox,
    TuneTriggerContainer,
    ClearIconButton,
    SearchAdornmentStack,
    SearchButton,
    ActionsGroup,
    IconButtonBlue,
    FilterBox,
    StyleBoxActionDropDown,
    SearchIconBlue,
    StyleActionAllCheckBox,
    StyleActionCellCheckBox,
    StyledCheckbox,
    CheckboxLabel,
    StyleActionButton,
    ButtonCancel,
    ButtonReset,
    ButtonCancelModal,
    ButtonApply,
    ButtonApplyModal,
    NavBar,
    NavLeft,
    NavWeekBox,
    TodayButton,
    NavArrowButton,
    NavWeekLabel,
    CurrentLabel,
    ViewSwitcher,
    ViewSwitchButton,
    ContentArea,
    DayViewContainer,
    DayViewHeader,
    HeaderCircle,
    DaySummaryBar,
    DayViewBody,
    TimeAxis,
    TimeLabel,
    EventsTrack,
    GridLine,
    EventBox,
    WeekViewContainer,
    WeekHeaderRow,
    WeekHeaderTimeLabel,
    DayColHeader,
    DayNameText,
    WeekDateNumber,
    WeekBody,
    TimeColumn,
    TimeSlot,
    DayColumn,
    MEETING_STATUS_STYLES,
    DEFAULT_STATUS_STYLE,
    WeekEventChip,
    ChipTitle,
    ChipText,
    MonthViewContainer,
    MonthHeader,
    MonthHeaderItem,
    MonthGrid,
    MonthCell,
    DateNumber,
    MonthEventChip,
    MoreEventsIndicator,
    Footer,
    FooterSection,
    LegendGrid,
    LegendItem,
    LegendBox,
    Overlay,
    PopupContainerDetail,
    StyledPopover,
    HoverDetailContainer,
    FilterDropdownContainer,
    FilterRowGrid,
    StyledSelectCustom,
    FilterLabel,
    PopupContainerDaySummary,
    PopupHeader,
    FilterPopupHeader,
    CloseButton,
    AbsoluteCloseButton,
    DetailRow,
    DetailRowCentered,
    DetailLabel,
    DetailValue,
    FilterGroup,
    EventTitle,
    EventTime,
    FlexRowGap8,
    FlexColumnGap10,
    FilterPopupTitle,
    FilterIconBlue,
    PopupTitleLarge,
    DayViewTitle,
    DayViewSubTitle,
    DateCircleText,
    DaySummaryHeader,
    DaySummaryDate,
    DaySummaryDayName,
    DaySummaryList,
    DaySummaryItem,
    DaySummaryEmpty,
    StatsText,
    StatValueBlue,
    StatValueGreen,
    StatValueRed,
    FilterFooterStyled,
    FilterFooterRight,
    StatsGrid,
    StatsColumn,
    StatsDivider,
    StatItem,
} from '@styles/RoomScheduleCalendar.styles';

// --- CONSTANTS & HELPERS ---
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => i);
const WEEK_DAYS_HEADER = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];

const formatDateStr = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

const formatDayAndDate = (date) => {
    const dayIndex = date.getDay();
    const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dayName = dayNames[dayIndex];
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${dayName} ${d}/${m}/${y}`;
};

const getWeekDays = (currentDate) => {
    const tempDate = new Date(currentDate);
    const day = tempDate.getDay();
    const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(tempDate.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        week.push(d);
    }
    return week;
};

const getMonthDays = (year, month) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let startDay = firstDayOfMonth.getDay();
    if (startDay === 0) startDay = 7;

    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    const daysToPadPrev = startDay - 1;
    for (let i = 0; i < daysToPadPrev; i++) {
        days.unshift(new Date(year, month - 1, prevMonthDays - i));
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
        for (let i = 1; i <= remaining; i++) {
             days.push(new Date(year, month + 1, i));
        }
    }
    return days;
};

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const calculateEventPosition = (timeStr) => {
    const [startStr, endStr] = timeStr.split('-');
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const top = (startH * 60) + startM;
    const duration = (endH * 60 + endM) - (startH * 60 + startM);
    return { posTop: top, duration };
};

const STATUS_OPTIONS = [
    { value: 'DU_KIEN', label: 'Dự kiến' },
    { value: 'CHUAN_BI', label: 'Chuẩn bị' },
    { value: 'DANG_HOP', label: 'Đang họp' },
    { value: 'DA_KET_THUC', label: 'Kết thúc' },
    { value: 'DA_HUY', label: 'Đã hủy' }
];

const MEETING_TYPES = [
    { value: 'NB', label: 'Nội bộ' },
    { value: 'LPB', label: 'Đơn vị' },
    { value: 'DT', label: 'Tổng công ty' }
];

const DayEventItem = React.memo(({ evt, onClick, onMouseEnter, onMouseLeave }) => {
    const { posTop, duration } = calculateEventPosition(evt.meetingTime);
    const handleClick = useCallback((e) => onClick(e, evt), [evt, onClick]);
    const handleMouseEnter = useCallback((e) => onMouseEnter && onMouseEnter(e, evt), [evt, onMouseEnter]);

    return (
        <EventBox
            status={evt.status}
            meetingState={evt.meetingState}
            posTop={posTop}
            posHeight={duration}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <EventTitle>{evt.title || 'Trống'}</EventTitle>
            <EventTime>{evt.meetingTime || 'Trống'}</EventTime>
            <EventTime>Phòng ban tổ chức :{evt.dept_name || evt.organizationalUnit || evt.createdByOrg || ''}</EventTime>
        </EventBox>
    );
});
DayEventItem.displayName = 'DayEventItem';

const WeekEventItem = React.memo(({ evt, onClick, onMouseEnter, onMouseLeave }) => {
    const { posTop, duration } = calculateEventPosition(evt.meetingTime);
    const handleClick = useCallback((e) => onClick(e, evt), [evt, onClick]);
    const handleMouseEnter = useCallback((e) => onMouseEnter && onMouseEnter(e, evt), [evt, onMouseEnter]);

    return (
        <WeekEventChip
            status={evt.status}
            meetingState={evt.meetingState}
            posTop={posTop}
            posHeight={duration}
            onClick={handleClick}
            title={`${evt.title}\n${evt.meetingTime}\nPhòng ban tổ chức: ${evt.dept_name || evt.organizationalUnit || evt.createdByOrg || ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <ChipTitle>{evt.title}</ChipTitle>
            <ChipText>{evt.meetingTime}</ChipText>
            <ChipText>Phòng ban tổ chức :{evt.dept_name || evt.organizationalUnit || evt.createdByOrg || ''}</ChipText>
        </WeekEventChip>
    );
});
WeekEventItem.displayName = 'WeekEventItem';

const MonthEventItem = React.memo(({ evt, onClick, onMouseEnter, onMouseLeave }) => {
    const handleClick = useCallback((e) => onClick(e, evt), [evt, onClick]);
    const handleMouseEnter = useCallback((e) => onMouseEnter && onMouseEnter(e, evt), [evt, onMouseEnter]);

    return (
        <MonthEventChip status={evt.status} meetingState={evt.meetingState} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={onMouseLeave}>
            {evt.title}
        </MonthEventChip>
    );
});
MonthEventItem.displayName = 'MonthEventItem';

const MoreEventsButton = React.memo(({ count, date, onClick }) => {
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        onClick(e, date);
    }, [date, onClick]);
    
    return (
        <MoreEventsIndicator onClick={handleClick}>
            +{count} khác
        </MoreEventsIndicator>
    );
});
MoreEventsButton.displayName = 'MoreEventsButton';

const MonthDateNumber = React.memo(({ date, isToday, isOtherMonth, onClick }) => {
    const handleClick = useCallback((e) => onClick(e, date), [date, onClick]);
    return <DateNumber onClick={handleClick} isToday={isToday} isOtherMonth={isOtherMonth}>{date.getDate()}</DateNumber>;
});
MonthDateNumber.displayName = 'MonthDateNumber';

const DaySummaryItemComp = React.memo(({ evt, onClose, onEventClick }) => {
    const handleClick = useCallback((e) => {
        onClose();
        onEventClick(e, evt);
    }, [evt, onClose, onEventClick]);
    
    return (
        <DaySummaryItem status={evt.status} meetingState={evt.meetingState} onClick={handleClick}>
            {evt.title}
        </DaySummaryItem>
    );
});
DaySummaryItemComp.displayName = 'DaySummaryItemComp';

// ==========================================
// COMPONENT LOGIC
// ==========================================

// Helper dùng chung cho cả click lẫn hover — map raw API item sang display fields
const mapMeetingForDisplay = (meeting) => {
    const statusLabel =
        (meeting.meetingState && meeting.meetingState.status)
            ? meeting.meetingState.status
            : (MEETING_STATUS_STYLES[meeting.status] || DEFAULT_STATUS_STYLE).label;

    return {
        ...meeting,
        meetingMode: meeting.meetingMode === 'OFFLINE' ? 'Trực tiếp' : 'Trực tuyến',
        chairmanName: meeting.chairmanName || meeting.chairmanId || '',
        deptName: meeting.deptName || meeting.dept_name || meeting.organizationalUnit || meeting.createdByOrg || 'Trống',
        roomNames: meeting.roomNames || meeting.roomIds || 'Chưa chọn phòng',
        statusLabel,
    };
};

const RoomScheduleCalendar = ({ roomId, onEventClick }) => {
    const [viewMode, setViewMode] = useState('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [meetings, setMeetings] = useState([]);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // STATE POPUPS
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [daySummaryData, setDaySummaryData] = useState(null);

    // FILTER STATES
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [searchFilters, setSearchFilters] = useState({
        title: true,
        type: false,
        chairman: false,
        dept: false,
        status: false
    });
    // Main Filter Params State
    const [filterParams, setFilterParams] = useState({
        status: '',
        type: '',
        dept: ''
    });
    const [tempFilterParams, setTempFilterParams] = useState({
        status: '',
        type: '',
        dept: ''
    });

    // HANDLERS DEFINED WITH USECALLBACK
    const handleCloseModal = useCallback(() => {
        setSelectedMeeting(null);
        setShowFilterModal(false);
        setDaySummaryData(null);
    }, []);

    // HOVER POPOVER STATE & HANDLERS
    const [hoveredMeeting, setHoveredMeeting] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);

    const handlePopoverOpen = useCallback((event, meeting) => {
        setAnchorEl(event.currentTarget);
        setHoveredMeeting(mapMeetingForDisplay(meeting));
    }, []);

    const handlePopoverClose = useCallback(() => {
        setAnchorEl(null);
        setHoveredMeeting(null);
    }, []);

    // FETCH DATA
    //backend limit 100 nếu nếu hơn trả về lỗi 400, fix cho gọi nhiều paging liên tục.
    const fetchData = useCallback(async () => {
        if (!roomId) return;
        setIsLoading(true);
        try {
            // Construct query params
            // const limit = 1000;
            const limit = 100;
            const params = {
                roomId,
                page: 1,
                limit, 
                processFn: 'LICHSUDUNGPHONG',
                type: viewMode,
                [viewMode === 'day' ? 'currentDate' : viewMode === 'week' ? 'currentWeek' : 'currentMonth']: `${currentDate.getFullYear()}-${(currentDate.getMonth()+1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`,
            };

            // Add Filters
            if (appliedSearchText) {
                if (searchFilters.title) params['filter[title]'] = appliedSearchText;
            }

            // Main Filter Params
            if (filterParams.status) params['filter[meeting_state]'] = filterParams.status;
            if (filterParams.type) params['filter[meeting_type]'] = filterParams.type;
            if (filterParams.dept) params['filter[dept_name]'] = filterParams.dept; 

            // 1. Fetch the first page
            const response = await api.get(`api/meetings/unit-history`, { params });
            const data = response.data;
            if (data && data.success) {
                let allItems = data.items || [];
                const totalPages = data.totalPages || 1;

                // 2. If there are more pages, fetch them in parallel
                if (totalPages > 1) {
                    const promises = [];
                    for (let p = 2; p <= totalPages; p++) {
                        promises.push(
                            api.get(`api/meetings/unit-history`, {
                                params: { ...params, page: p }
                            })
                        );
                    }

                    const responses = await Promise.all(promises);
                    responses.forEach(res => {
                        if (res.data && res.data.success) {
                            allItems = [...allItems, ...(res.data.items || [])];
                        }
                    });
                }

                // 3. Map meeting states and update state
                const mappedItems = allItems.map(item => ({
                    ...item,
                    meetingState: item.meetingState || null,
                }));
                setMeetings(mappedItems);
            }
        } catch (error) {
            // console.error("Failed to fetch meeting history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [roomId, viewMode, currentDate, appliedSearchText, searchFilters, filterParams]);

    const handleOpenFilter = useCallback(() => {
        setTempFilterParams(filterParams);
        setShowFilterModal(prev => !prev); // Toggle
    }, [filterParams]);

    const handleCloseFilterPopup = useCallback(() => {
        setShowFilterModal(false);
    }, []);

    const handleResetFilter = useCallback(() => {
        setTempFilterParams({ status: '', type: '', dept: '' });
    }, []);

    // FILTER LOGIC
    const handleApplySearch = useCallback(() => {
        setAppliedSearchText(searchText);
    }, [searchText]);

    const applyMainFilters = useCallback(() => {
        setFilterParams(tempFilterParams);
        handleCloseModal();
    }, [handleCloseModal, tempFilterParams]);

    const handleMainFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setTempFilterParams(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleKeyDownSearch = useCallback((e) => { if (e.key === 'Enter') handleApplySearch(); }, [handleApplySearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setFilteredMeetings(meetings);
    }, [meetings]);

    // --- NAVIGATION HANDLERS ---
    const handleNext = useCallback(() => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (viewMode === 'day') newDate.setDate(prev.getDate() + 1);
            else if (viewMode === 'week') newDate.setDate(prev.getDate() + 7);
            else newDate.setMonth(prev.getMonth() + 1);
            return newDate;
        });
    }, [viewMode]);

    const handlePrev = useCallback(() => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (viewMode === 'day') newDate.setDate(prev.getDate() - 1);
            else if (viewMode === 'week') newDate.setDate(prev.getDate() - 7);
            else newDate.setMonth(prev.getMonth() - 1);
            return newDate;
        });
    }, [viewMode]);

    const handleSetViewMonth = useCallback(() => setViewMode('month'), []);
    const handleSetViewWeek = useCallback(() => setViewMode('week'), []);
    const handleSetViewDay = useCallback(() => setViewMode('day'), []);

    const handleToday = useCallback(() => setCurrentDate(new Date()), []);

    const handleEventClick = useCallback((e, meeting) => {
        e.stopPropagation();
        if (onEventClick) onEventClick(meeting);
        setSelectedMeeting(mapMeetingForDisplay(meeting));
    }, [onEventClick]);

    const handleDateNumberClick = useCallback((e, date) => {
        e.stopPropagation();
        const dStr = formatDateStr(date);
        const events = filteredMeetings.filter(m => m.meetingDate === dStr);
        setDaySummaryData({ date, events });
    }, [filteredMeetings]);

    const FILTER_COLUMNS = [
        { code: 'title', name: 'Tiêu đề lịch' },
        { code: 'chairman', name: 'Người chủ trì' },
        // { code: 'type', name: 'Loại lịch' },
        // { code: 'dept', name: 'Đơn vị' },
        // { code: 'status', name: 'Trạng thái' },
    ];
    
    const [selectedColumns, setSelectedColumns] = useState(FILTER_COLUMNS.map(c => c.name));
    const [tempSelectedColumns, setTempSelectedColumns] = useState(FILTER_COLUMNS.map(c => c.name));
    const [openFilter, setOpenFilter] = useState(false);

    const handleInputChange = (e) => setSearchText(e.target.value);
    
    const handleSearchButtonClick = () => {
        handleApplySearch();
    };

    const handleClearSearch = useCallback(() => {
        setSearchText('');
        setAppliedSearchText('');
    }, []);

    const handleFilterToggle = () => {
        setTempSelectedColumns(selectedColumns);
        setOpenFilter(!openFilter);
    };

    const handleFilterAway = () => {
        setOpenFilter(false);
    };

    const handleSelectAllColumns = (e) => {
        if (e.target.checked) {
            setTempSelectedColumns(FILTER_COLUMNS.map(c => c.name));
        } else {
            setTempSelectedColumns([]);
        }
    };

    const handleColumnFilterChangeDirect = (name) => (e) => {
        const checked = e.target.checked;
        if (checked) {
            setTempSelectedColumns(prev => [...prev, name]);
        } else {
            setTempSelectedColumns(prev => prev.filter(c => c !== name));
        }
    };

    const handleApplyFilter = () => {
        setSelectedColumns(tempSelectedColumns);
        const newFilters = {
            title: tempSelectedColumns.includes('Tiêu đề lịch'),
            type: tempSelectedColumns.includes('Loại lịch'),
            chairman: tempSelectedColumns.includes('Người chủ trì'),
            dept: tempSelectedColumns.includes('Đơn vị'),
            status: tempSelectedColumns.includes('Trạng thái')
        };
        setSearchFilters(newFilters);
        setOpenFilter(false);
    };

    // --- NEW HANDLERS ---
    const handleFullScreen = useCallback(() => {
        setIsFullScreen(prev => !prev);
    }, []);

    // const handleExport = useCallback(async () => {
    //     try {
    //         const params = {
    //             roomId,
    //             page: 1,
    //             limit: 100,
    //             processFn: 'LICHSUDUNGPHONG',
    //             exportType: 'xlsx',
    //             type: viewMode,
    //             [viewMode === 'day' ? 'currentDate' : viewMode === 'week' ? 'currentWeek' : 'currentMonth']: `${currentDate.getFullYear()}-${(currentDate.getMonth()+1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`,
    //         };

    //         if (appliedSearchText) {
    //             if (searchFilters.title) params['filter[title]'] = appliedSearchText;
    //         }

    //         if (filterParams.status) params['filter[status_code]'] = filterParams.status;
    //         if (filterParams.type) params['filter[meeting_type]'] = filterParams.type;
    //         if (filterParams.dept) params['filter[dept_name]'] = filterParams.dept;

    //         const response = await api.get(`api/documents/get-list-export-excel`, { 
    //             params,
    //             responseType: 'blob' 
    //         });

    //         const url = window.URL.createObjectURL(new Blob([response.data]));
    //         const link = document.createElement('a');
    //         link.href = url;
    //         link.setAttribute('download', `Lich_su_dung_phong_${params[viewMode === 'day' ? 'currentDate' : viewMode === 'week' ? 'currentWeek' : 'currentMonth']}.xlsx`);
    //         document.body.appendChild(link);
    //         link.click();
    //         link.parentNode.removeChild(link);
    //         window.URL.revokeObjectURL(url);

    //     } catch (error) {
    //         // logger.error("Export failed:", error);
    //     }
    // }, [roomId, viewMode, currentDate, appliedSearchText, searchFilters, filterParams]);

    const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);

    // --- RENDER POPUPS ---

    const renderHoverDetail = () => {
        const open = Boolean(anchorEl);
        if (!hoveredMeeting) return null;

        return (
            <StyledPopover
                id="mouse-over-popover"
                open={open}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'center',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'center',
                    horizontal: 'left',
                }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                <HoverDetailContainer>
                     <PopupHeader>
                        <PopupTitleLarge>{hoveredMeeting.title}</PopupTitleLarge>
                    </PopupHeader>
                    <DetailRow><DetailLabel>Thời gian :</DetailLabel><DetailValue>{hoveredMeeting.meetingDate} {hoveredMeeting.meetingTime}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Hình thức họp :</DetailLabel><DetailValue>{hoveredMeeting.meetingMode}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Người chủ trì :</DetailLabel><DetailValue>{hoveredMeeting.chairmanName || hoveredMeeting.chairmanId}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Loại lịch :</DetailLabel><DetailValue>{hoveredMeeting.meetingType === 'COMPANY' ? 'Tổng công ty' : 'Đơn vị'}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Đơn vị tổ chức :</DetailLabel><DetailValue>{hoveredMeeting.deptName ||  hoveredMeeting.organizationalUnit || hoveredMeeting.createdByOrg}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Phòng họp :</DetailLabel><DetailValue>{hoveredMeeting.roomNames || hoveredMeeting.roomIds}</DetailValue></DetailRow>
                    <DetailRowCentered><DetailLabel>Trạng thái :</DetailLabel>{hoveredMeeting.statusLabel || 'Kết thúc'}</DetailRowCentered>
                </HoverDetailContainer>
            </StyledPopover>
        );
    };

    const renderDetailModal = () => {
        if (!selectedMeeting) return null;
        return (
            <Overlay onClick={handleCloseModal}>
                <PopupContainerDetail onClick={handleStopPropagation}>
                    <PopupHeader>
                        <PopupTitleLarge>{selectedMeeting.title}</PopupTitleLarge>
                        <CloseButton onClick={handleCloseModal}><Close /></CloseButton>
                    </PopupHeader>
                    <DetailRow><DetailLabel>Thời gian :</DetailLabel><DetailValue>{selectedMeeting.meetingDate} {selectedMeeting.meetingTime}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Hình thức họp :</DetailLabel><DetailValue>{selectedMeeting.meetingMode}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Người chủ trì :</DetailLabel><DetailValue>{selectedMeeting.chairmanName || selectedMeeting.chairmanId}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Loại lịch :</DetailLabel><DetailValue>{selectedMeeting.meetingType === 'COMPANY' ? 'Tổng công ty' : 'Đơn vị'}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Đơn vị tổ chức :</DetailLabel><DetailValue>{selectedMeeting.deptName}</DetailValue></DetailRow>
                    <DetailRow><DetailLabel>Phòng họp :</DetailLabel><DetailValue>{selectedMeeting.roomNames || selectedMeeting.roomIds}</DetailValue></DetailRow>
                    <DetailRowCentered><DetailLabel>Trạng thái :</DetailLabel>{selectedMeeting.statusLabel || 'Kết thúc'}</DetailRowCentered>
                </PopupContainerDetail>
            </Overlay>
        );
    };

    const renderDaySummaryModal = () => {
        if (!daySummaryData) return null;
        const { date, events } = daySummaryData;
        const dayName = date.getDay() === 0 ? 'CN' : `Thứ ${date.getDay() + 1}`;
        return (
            <Overlay onClick={handleCloseModal}>
                <PopupContainerDaySummary onClick={handleStopPropagation}>
                    <DaySummaryHeader>
                        <AbsoluteCloseButton onClick={handleCloseModal}><Close /></AbsoluteCloseButton>
                        <DaySummaryDate>{date.getDate()}</DaySummaryDate>
                        <DaySummaryDayName>{dayName}</DaySummaryDayName>
                    </DaySummaryHeader>
                    <DaySummaryList>
                        {events.length > 0 ? events.map((ev) => (
                            <DaySummaryItemComp key={ev.id} evt={ev} onClose={handleCloseModal} onEventClick={handleEventClick} />
                        )) : <DaySummaryEmpty>Không có lịch</DaySummaryEmpty>}
                    </DaySummaryList>
                </PopupContainerDaySummary>
            </Overlay>
        );
    };

    // --- VIEW RENDERS ---
    const dayViewContent = useMemo(() => {
        if (viewMode !== 'day') return null;
        const dateStr = formatDateStr(currentDate);
        const dayMeetings = filteredMeetings.filter(m => m.meetingDate === dateStr);
        const dayName = currentDate.getDay() === 0 ? 'Chủ Nhật' : `Thứ ${currentDate.getDay() + 1}`;
        const monthYear = `tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`;

        return (
            <DayViewContainer>
                <DayViewHeader>
                    <HeaderCircle><DateCircleText>{currentDate.getDate()}</DateCircleText></HeaderCircle>
                    <FlexColumnGap10>
                        <DayViewSubTitle>{dayName}</DayViewSubTitle>
                        <DayViewTitle>{monthYear}</DayViewTitle>
                    </FlexColumnGap10>
                </DayViewHeader>
                <DaySummaryBar>{dayMeetings.length} sự kiện hôm nay</DaySummaryBar>
                <DayViewBody>
                    <TimeAxis>{HOURS_OF_DAY.map(h => <TimeLabel key={h}>{h.toString().padStart(2, '0')}:00</TimeLabel>)}</TimeAxis>
                    <EventsTrack>
                        {HOURS_OF_DAY.map(h => <GridLine key={h} />)}
                        {dayMeetings.map((evt) => (
                            <DayEventItem 
                                key={evt.id} 
                                evt={evt} 
                                onClick={handleEventClick} 
                                onMouseEnter={handlePopoverOpen}
                                onMouseLeave={handlePopoverClose}
                            />
                        ))}
                    </EventsTrack>
                </DayViewBody>
            </DayViewContainer>
        );
    }, [viewMode, currentDate, filteredMeetings, handleEventClick, handlePopoverOpen, handlePopoverClose]);

    const weekViewContent = useMemo(() => {
        if (viewMode !== 'week') return null;
        const weekDays = getWeekDays(currentDate);

        return (
            <WeekViewContainer>
                <WeekHeaderRow>
                    <WeekHeaderTimeLabel>Giờ</WeekHeaderTimeLabel>
                    {weekDays.map((d) => {
                        const isToday = formatDateStr(d) === formatDateStr(new Date());
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                            <DayColHeader 
                                key={formatDateStr(d)} 
                                isToday={isToday}
                                isWeekend={isWeekend}
                            >
                                <DayNameText isToday={isToday}>{d.getDay() === 0 ? 'CN' : `T${d.getDay() + 1}`}</DayNameText>
                                <WeekDateNumber isToday={isToday}>{d.getDate()}</WeekDateNumber>
                            </DayColHeader>
                        );
                    })}
                </WeekHeaderRow>
                <WeekBody>
                    <TimeColumn>{HOURS_OF_DAY.map(h => <TimeSlot key={`time-${h}`}>{h}:00</TimeSlot>)}</TimeColumn>
                    {weekDays.map((d) => {
                        const dStr = formatDateStr(d);
                        const daysEvents = filteredMeetings.filter(m => m.meetingDate === dStr);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        
                        return (
                            <DayColumn key={dStr} isWeekend={isWeekend}>
                                {HOURS_OF_DAY.map(h => <GridLine key={h} />)}
                                {daysEvents.map((evt) => (
                                    <WeekEventItem 
                                        key={evt.id} 
                                        evt={evt} 
                                        onClick={handleEventClick} 
                                        onMouseEnter={handlePopoverOpen}
                                        onMouseLeave={handlePopoverClose}
                                    />
                                ))}
                            </DayColumn>
                        );
                    })}
                </WeekBody>
            </WeekViewContainer>
        );
    }, [viewMode, currentDate, filteredMeetings, handleEventClick, handlePopoverOpen, handlePopoverClose]);

    const monthViewContent = useMemo(() => {
        if (viewMode !== 'month') return null;
        const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
        const todayStr = formatDateStr(new Date());
        
        const maxEventsToShow = 3;

        return (
            <MonthViewContainer>
                <MonthHeader>
                    {WEEK_DAYS_HEADER.map((d, i) => {
                        const todayDay = new Date().getDay();
                        const adjustedTodayIndex = todayDay === 0 ? 6 : todayDay - 1;
                        const isToday = i === adjustedTodayIndex;
                        
                        return (
                            <MonthHeaderItem key={d} isToday={isToday}>
                                {d}
                            </MonthHeaderItem>
                        );
                    })}
                </MonthHeader>
                <MonthGrid>
                    {days.map((d) => {
                        const dStr = formatDateStr(d);
                        const isToday = dStr === todayStr;
                        const isOtherMonth = d.getMonth() !== currentDate.getMonth();
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                        const dayEvents = filteredMeetings.filter(m => m.meetingDate === dStr);
                        const visibleEvents = dayEvents.slice(0, maxEventsToShow);
                        const remainingCount = dayEvents.length - maxEventsToShow;
                        
                        return (
                            <MonthCell key={d.getTime()} isWeekend={isWeekend}>
                                <MonthDateNumber date={d} isToday={isToday} isOtherMonth={isOtherMonth} onClick={handleDateNumberClick} />
                                <div>
                                    {visibleEvents.map((ev) => (
                                        <MonthEventItem 
                                            key={ev.id} 
                                            evt={ev} 
                                            onClick={handleEventClick} 
                                            onMouseEnter={handlePopoverOpen}
                                            onMouseLeave={handlePopoverClose}
                                        />
                                    ))}
                                    {remainingCount > 0 && (
                                        <MoreEventsButton 
                                            count={remainingCount} 
                                            date={d} 
                                            onClick={handleDateNumberClick} 
                                        />
                                    )}
                                </div>
                            </MonthCell>
                        );
                    })}
                </MonthGrid>
            </MonthViewContainer>
        );
    }, [viewMode, currentDate, filteredMeetings, handleEventClick, handleDateNumberClick, handlePopoverOpen, handlePopoverClose]);
    
    const monthlyStats = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const monthMeetings = meetings.filter(m => {
            const [, mo, y] = m.meetingDate.split('/').map(Number);
            return mo === month + 1 && y === year;
        });

        const totalMeetings = monthMeetings.length;
        
        let totalMinutes = 0;
        monthMeetings.forEach(m => {
            const { duration } = calculateEventPosition(m.meetingTime);
            totalMinutes += duration;
        });
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

        const totalCapacityHours = daysInMonth * 8; 
        const usageRate = totalCapacityHours > 0 ? Math.round((totalHours / totalCapacityHours) * 100) : 0;
        
        const avgMeetingsPerDay = daysInMonth > 0 ? Math.round((totalMeetings / daysInMonth) * 100) / 100 : 0;

        return { totalMeetings, totalHours, usageRate, avgMeetingsPerDay };
    }, [meetings, currentDate]);


    const calendarContent = (
        <Container isFullScreen={isFullScreen}>
            {renderDetailModal()}
            {renderHoverDetail()} 
            {renderDaySummaryModal()}

            <Toolbar>
                <SearchBarWrapper>
                    <UnifiedSearchGroup>
                        {/* BỘ LỌC trigger */}
                        <ClickAwayListener onClickAway={handleCloseFilterPopup}>
                          <FilterTriggerBox>
                              <FilterTrigger onClick={handleOpenFilter}>
                                  <FilterAlt />
                                  <span>Bộ lọc</span>
                              </FilterTrigger>
                              {showFilterModal && (
                                <FilterDropdownContainer onClick={handleStopPropagation}>
                                  <FilterPopupHeader>
                                    <FlexRowGap8>
                                      <FilterPopupTitle>Bộ lọc</FilterPopupTitle>
                                      <FilterIconBlue />
                                    </FlexRowGap8>
                                  </FilterPopupHeader>
                                    <FilterRowGrid>
                                      <FilterGroup>
                                        <FilterLabel>Trạng thái lịch</FilterLabel>
                                        <StyledSelectCustom
                                            name="status"
                                            value={tempFilterParams.status || ''}
                                            onChange={handleMainFilterChange}
                                        >
                                            <option value="">Tất cả trạng thái</option>
                                            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </StyledSelectCustom>
                                      </FilterGroup>
                                      <FilterGroup>
                                        <FilterLabel>Loại lịch</FilterLabel>
                                        <StyledSelectCustom
                                            name="type"
                                            value={tempFilterParams.type || ''}
                                            onChange={handleMainFilterChange}
                                        >
                                            <option value="">Tất cả</option>
                                            {MEETING_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </StyledSelectCustom>
                                      </FilterGroup>
                                    </FilterRowGrid>
                                    <FilterFooterStyled>
                                      <ButtonReset onClick={handleResetFilter}>Đặt lại</ButtonReset>
                                      <FilterFooterRight>
                                        <ButtonCancelModal onClick={handleCloseFilterPopup}>Hủy</ButtonCancelModal>
                                        <ButtonApplyModal onClick={applyMainFilters}>Áp dụng lọc</ButtonApplyModal>
                                      </FilterFooterRight>
                                    </FilterFooterStyled>
                                </FilterDropdownContainer>
                              )}
                          </FilterTriggerBox>
                        </ClickAwayListener>

                        {/* SEARCH INPUT */}
                        <UnifiedInput
                            placeholder="Tìm số hiệu, trích yếu..."
                            value={searchText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDownSearch}
                            autoComplete="off"
                            InputProps={{
                                endAdornment: (
                                    <SearchAdornmentStack>
                                        {searchText && (
                                            <ClearIconButton onClick={handleClearSearch} title="Xóa tìm kiếm">
                                                <Close />
                                            </ClearIconButton>
                                        )}
                                        <ClickAwayListener onClickAway={handleFilterAway}>
                                            <TuneTriggerContainer>
                                                <TuneIconBox onClick={handleFilterToggle} title="Lọc tìm kiếm">
                                                    <Tune />
                                                </TuneIconBox>
                                                {openFilter && (
                                                    <FilterBox>
                                                        <StyleBoxActionDropDown>
                                                            <span>Lọc tìm kiếm</span>
                                                            <SearchIconBlue />
                                                        </StyleBoxActionDropDown>
                                                        <StyleActionAllCheckBox>
                                                            <FormControlLabel
                                                                control={
                                                                    <StyledCheckbox
                                                                        checked={tempSelectedColumns.length === FILTER_COLUMNS.length}
                                                                        indeterminate={
                                                                            tempSelectedColumns.length > 0 &&
                                                                            tempSelectedColumns.length < FILTER_COLUMNS.length
                                                                        }
                                                                        onChange={handleSelectAllColumns}
                                                                        size="small"
                                                                    />
                                                                }
                                                                label={<CheckboxLabel>Tất cả</CheckboxLabel>}
                                                            />
                                                        </StyleActionAllCheckBox>
                                                        <StyleActionCellCheckBox>
                                                            {FILTER_COLUMNS.map((column) => (
                                                                <FormControlLabel
                                                                    key={column.code}
                                                                    control={
                                                                        <StyledCheckbox
                                                                            checked={tempSelectedColumns.includes(column.name)}
                                                                            onChange={handleColumnFilterChangeDirect(column.name)}
                                                                            size="small"
                                                                        />
                                                                    }
                                                                    label={<CheckboxLabel>{column.name}</CheckboxLabel>}
                                                                />
                                                            ))}
                                                        </StyleActionCellCheckBox>
                                                        <StyleActionButton>
                                                            <ButtonCancel onClick={handleFilterAway}>Hủy</ButtonCancel>
                                                            <ButtonApply onClick={handleApplyFilter}>Áp dụng</ButtonApply>
                                                        </StyleActionButton>
                                                    </FilterBox>
                                                )}
                                            </TuneTriggerContainer>
                                        </ClickAwayListener>
                                    </SearchAdornmentStack>
                                )
                            }}
                        />
                    </UnifiedSearchGroup>

                    <SearchButton onClick={handleSearchButtonClick} title="Tìm kiếm">
                        <Search />
                    </SearchButton>
                </SearchBarWrapper>

               <ActionsGroup>
                    <IconButtonBlue onClick={handleFullScreen} title={isFullScreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
                        {isFullScreen ? <CenterFocusWeak /> : <CenterFocusStrong />}
                    </IconButtonBlue>
                    {/* <IconButtonBlue onClick={handleExport} title="Xuất dữ liệu"><Archive /></IconButtonBlue> */}
                </ActionsGroup>
            </Toolbar>

            <NavBar>
                <NavLeft>
                    <CurrentLabel>
                        {viewMode === 'week' && formatDayAndDate(currentDate)}
                        {viewMode === 'day' && formatDayAndDate(currentDate)}
                        {viewMode === 'month' && `Tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`}
                    </CurrentLabel>
                    <TodayButton onClick={handleToday}>Hôm nay</TodayButton>
                    <NavWeekBox>
                        <NavArrowButton onClick={handlePrev}><ChevronLeft /></NavArrowButton>
                        {viewMode === 'week' && (
                            <NavWeekLabel>Tuần {getWeekNumber(currentDate)}</NavWeekLabel>
                        )}
                        {viewMode === 'day' && (
                            <NavWeekLabel>{formatDateStr(currentDate)}</NavWeekLabel>
                        )}
                        {viewMode === 'month' && (
                            <NavWeekLabel>Tháng {currentDate.getMonth() + 1}</NavWeekLabel>
                        )}
                        <NavArrowButton onClick={handleNext}><ChevronRight /></NavArrowButton>
                    </NavWeekBox>
                </NavLeft>
                <ViewSwitcher>
                    <ViewSwitchButton $active={viewMode === 'day'} onClick={handleSetViewDay}>Ngày</ViewSwitchButton>
                    <ViewSwitchButton $active={viewMode === 'week'} onClick={handleSetViewWeek}>Tuần</ViewSwitchButton>
                    <ViewSwitchButton $active={viewMode === 'month'} onClick={handleSetViewMonth}>Tháng</ViewSwitchButton>
                </ViewSwitcher>
            </NavBar>

            <ContentArea isLoading={isLoading} isFullScreen={isFullScreen}>
                {isLoading && <Loading />}
                {dayViewContent}
                {weekViewContent}
                {monthViewContent}
            </ContentArea>

            <Footer>
                <FooterSection>
                    <StatsText>Thống kê sử dụng phòng họp tháng {currentDate.getMonth() + 1}/{currentDate.getFullYear()}</StatsText>
                    <StatsGrid>
                        <StatsColumn>
                            <StatItem><StatValueBlue>Tổng số cuộc họp : {monthlyStats.totalMeetings}</StatValueBlue></StatItem>
                            <StatItem><StatValueBlue>Tỉ lệ sử dụng : {monthlyStats.usageRate} %</StatValueBlue></StatItem>
                        </StatsColumn>
                        <StatsDivider />
                        <StatsColumn>
                            <StatItem><StatValueGreen>Tổng số giờ sử dụng : {monthlyStats.totalHours}</StatValueGreen></StatItem>
                            <StatItem><StatValueRed>Cuộc họp trung bình/ ngày : {monthlyStats.avgMeetingsPerDay}</StatValueRed></StatItem>
                        </StatsColumn>
                    </StatsGrid>
                </FooterSection>
                <FooterSection>
                    <StatsText>Màu trạng thái lịch :</StatsText>
                    <LegendGrid>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.DU_KIEN.background} edgeColor={MEETING_STATUS_STYLES.DU_KIEN.color} /> {MEETING_STATUS_STYLES.DU_KIEN.label}</LegendItem>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.KET_THUC.background} edgeColor={MEETING_STATUS_STYLES.KET_THUC.color} /> {MEETING_STATUS_STYLES.KET_THUC.label}</LegendItem>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.CHUAN_BI.background} edgeColor={MEETING_STATUS_STYLES.CHUAN_BI.color} /> {MEETING_STATUS_STYLES.CHUAN_BI.label}</LegendItem>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.DA_HUY.background} edgeColor={MEETING_STATUS_STYLES.DA_HUY.color} /> {MEETING_STATUS_STYLES.DA_HUY.label}</LegendItem>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.DANG_HOP.background} edgeColor={MEETING_STATUS_STYLES.DANG_HOP.color} /> {MEETING_STATUS_STYLES.DANG_HOP.label}</LegendItem>
                    </LegendGrid>
                </FooterSection>
            </Footer>
        </Container>
    );

    if (isFullScreen) {
        return ReactDOM.createPortal(calendarContent, document.body);
    }

    return calendarContent;
};

export default RoomScheduleCalendar;