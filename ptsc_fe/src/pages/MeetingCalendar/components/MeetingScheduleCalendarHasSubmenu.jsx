import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { styled, keyframes } from '@mui/material/styles';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/vi';

// --- MUI ICONS ---
import { ChevronLeft, ChevronRight, Close } from '@mui/icons-material';
// import { Popover } from '@mui/material';
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE, API_GET_MEETING_COMPANY, API_GET_MEETING_INDIVIDUAL, API_GET_MEETING_UNITS, APP_DHVB_BASE } from "@EnvironmentFile/constants/urlConfig";
import DOMPurify from "dompurify";
// import { SkyBox, SkyButton, SkyTypography } from '@styles/SkyStyles';
import {
    Container,
    NavBar,
    NavLeft,
    TodayButton,
    NavArrowButton,
    CurrentLabel,
    DateRangeLabel,
    ViewSwitcher,
    ViewSwitchButton,
    ContentArea,
    CalendarHeaderArea,
    CalendarBodyArea,
    LoadingOverlay,
    DayViewBody,
    TimeAxis,
    TimeLabel,
    EventsTrack,
    EventBox,
    MEETING_STATUS_STYLES,
    DEFAULT_STATUS_STYLE,
    // fadeIn,
    GridLine,
    CurrentTimeLine,
    WeekViewContainer,
    WeekDaysContainer,
    WeekHeaderRow,
    WeekHeaderTimeLabel,
    DayColHeader,
    DayNameText,
    WeekDateNumber,
    WeekBody,
    TimeColumn,
    TimeSlot,
    DayColumn,
    StatusBadge,
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
    // EventTitleRow,
    // EventInfoRow,
    // EventTitleText,
    // SvgIconWrapper,
    MoreEventsIndicator,
    Footer,
    FooterSection,
    LegendGrid,
    LegendItem,
    LegendBox,
    NoteSection,
    StyledPopover,
    // PopupContainerDetail,
    HoverDetailContainer,
    PopupHeader,
    PopupTitleLarge,
    DetailRow,
    DetailLabel,
    DetailValue,
    Overlay,
    // PopupContainer,
    PopupContainerDaySummary,
    // CloseButton,
    AbsoluteCloseButton,
    EventTitle,
    EventTime,
    DaySummaryHeader,
    DaySummaryDate,
    DaySummaryDayName,
    DaySummaryList,
    DaySummaryItem,
    DaySummaryEmpty,
    StatsText,
    DayViewHeaderTimeLabel,
    DayViewColHeader,
    DayViewNameText,
    DayViewDateNumber,
    DayViewBodyContainerNoPadding
} from "@pages/MeetingCalendar/componentStyle/MeetingScheduleCalendarHasSubmenu.styles"
// Initialize dayjs
dayjs.extend(customParseFormat);
dayjs.locale('vi');

// --- CONSTANTS & HELPERS ---
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => i);
const WEEK_DAYS_HEADER = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];

const formatDateStr = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
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

const normalizeToStringArray = (value) => {
    if (Array.isArray(value)) {
        return value
            .filter((item) => item !== null && item !== undefined && `${item}`.trim() !== '')
            .map((item) => `${item}`.trim());
    }

    if (value === null || value === undefined) return [];

    if (typeof value === 'string') {
        const text = value.trim();
        if (!text) return [];

        if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
            try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    return parsed
                        .filter((item) => item !== null && item !== undefined && `${item}`.trim() !== '')
                        .map((item) => `${item}`.trim());
                }
            } catch (e) {
                // Keep fallback below when string is not valid JSON.
            }
        }

        if (text.includes(',')) {
            return text.split(',').map((item) => item.trim()).filter(Boolean);
        }

        return [text];
    }

    return [`${value}`.trim()].filter(Boolean);
};

const calculateEventPosition = (timeStr) => {
    const [startStr, endStr] = timeStr.split('-');
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const top = ((startH * 60) + startM) * (40 / 60); // 40px per hour
    const duration = ((endH * 60 + endM) - (startH * 60 + startM)) * (40 / 60);
    return { posTop: top, duration };
};

// Helper: Check if two events overlap in time
const eventsOverlap = (event1, event2) => {
    if (!event1.meetingTime || !event2.meetingTime) return false;

    const [start1Str, end1Str] = event1.meetingTime.split('-');
    const [start2Str, end2Str] = event2.meetingTime.split('-');

    if (!start1Str || !end1Str || !start2Str || !end2Str) return false;

    const [start1H, start1M] = start1Str.split(':').map(Number);
    const [end1H, end1M] = end1Str.split(':').map(Number);
    const [start2H, start2M] = start2Str.split(':').map(Number);
    const [end2H, end2M] = end2Str.split(':').map(Number);

    const start1 = start1H * 60 + start1M;
    const end1 = end1H * 60 + end1M;
    const start2 = start2H * 60 + start2M;
    const end2 = end2H * 60 + end2M;

    return start1 < end2 && start2 < end1;
};

// Calculate layout for overlapping events (column-based)
const calculateEventLayout = (events) => {
    if (!events || events.length === 0) return [];

    // Sort by start time, then by duration (longer first)
    const sorted = [...events].sort((a, b) => {
        const aPos = calculateEventPosition(a.meetingTime);
        const bPos = calculateEventPosition(b.meetingTime);
        if (aPos.posTop !== bPos.posTop) {
            return aPos.posTop - bPos.posTop;
        }
        return bPos.duration - aPos.duration; // Longer events first
    });

    const eventLayouts = sorted.map(event => ({
        event,
        column: 0,
        totalColumns: 1
    }));

    sorted.forEach((event, index) => {
        // Find all events that overlap with this one (before and after)
        const overlapping = sorted.filter((other, otherIndex) =>
            otherIndex !== index && eventsOverlap(event, other)
        );

        if (overlapping.length > 0) {
            // Find used columns by overlapping events
            const usedColumns = overlapping.map(other => {
                const otherLayout = eventLayouts.find(l => l.event === other);
                return otherLayout ? otherLayout.column : 0;
            });

            // Find first available column
            let column = 0;
            while (usedColumns.includes(column)) {
                column++;
            }

            eventLayouts[index].column = column;

            // Calculate total columns needed for this group
            const maxColumn = Math.max(column, ...usedColumns);
            const totalColumns = maxColumn + 1;

            // Update totalColumns for all overlapping events in this group
            const group = [event, ...overlapping];
            group.forEach(groupEvent => {
                const layout = eventLayouts.find(l => l.event === groupEvent);
                if (layout) {
                    layout.totalColumns = Math.max(layout.totalColumns, totalColumns);
                }
            });
        }
    });

    return eventLayouts;
};





// ==========================================
// SUB-COMPONENTS TO AVOID INLINE HANDLERS
// ==========================================

const DayEventBoxItem = React.memo(({ event, column, totalColumns, onClick, onMouseEnter, onMouseLeave }) => {
    const { posTop, duration } = calculateEventPosition(event.meetingTime);
    const handleClick = useCallback((e) => onClick(e, event), [event, onClick]);
    const handleMouseEnter = useCallback((e) => onMouseEnter && onMouseEnter(e, event), [event, onMouseEnter]);

    return (
        <EventBox
            status={event.status}
            customStyle={event.statusCodeObj}
            posTop={posTop}
            posHeight={duration}
            column={column}
            totalColumns={totalColumns}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <EventTitle>{event.title}</EventTitle>
            <EventTime>{event.meetingTime}</EventTime>
        </EventBox>
    );
});
DayEventBoxItem.displayName = 'DayEventBoxItem';

const WeekEventChipItem = React.memo(({ event, column, totalColumns, onClick, onMouseEnter, onMouseLeave }) => {
    const { posTop, duration } = calculateEventPosition(event.meetingTime);
    const handleClick = useCallback((e) => onClick(e, event), [event, onClick]);
    const handleMouseEnter = useCallback((e) => onMouseEnter && onMouseEnter(e, event), [event, onMouseEnter]);

    return (
        <WeekEventChip
            status={event.status}
            customStyle={event.statusCodeObj}
            posTop={posTop}
            posHeight={duration}
            column={column}
            totalColumns={totalColumns}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <ChipTitle>{event.title}</ChipTitle>
            <ChipText>{event.meetingTime}</ChipText>
            <ChipText>Phòng họp : {Array.isArray(event.roomIds) ? event.roomIds.map(r => r).join(', ') : (event.roomIds || '')}</ChipText>
        </WeekEventChip>
    );
});
WeekEventChipItem.displayName = 'WeekEventChipItem';

const MonthEventItem = React.memo(({ evt, onClick, onMouseEnter, onMouseLeave }) => {
    const handleClick = useCallback((e) => onClick(e, evt), [evt, onClick]);
    const handleMouseEnter = useCallback((e) => onMouseEnter && onMouseEnter(e, evt), [evt, onMouseEnter]);

    return (
        <MonthEventChip status={evt.status} customStyle={evt.statusCodeObj} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={onMouseLeave}>
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
        <DaySummaryItem status={evt.status} customStyle={evt.statusCodeObj} onClick={handleClick}>
            {evt.title}
        </DaySummaryItem>
    );
});
DaySummaryItemComp.displayName = 'DaySummaryItemComp';

// ==========================================
// COMPONENT LOGIC
// ==========================================

const MeetingScheduleCalendarHasSubmenu = ({ onEventClick, fnCode, templateApiUrl, queryParams }) => {
    const calendarBodyRef = React.useRef(null);
    const [viewMode, setViewMode] = useState('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);
    const [meetings, setMeetings] = useState([]);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    // STATE POPUP
    const [daySummaryData, setDaySummaryData] = useState(null);

    // HANDLERS DEFINED WITH USECALLBACK
    const handleCloseModal = useCallback(() => {
        setDaySummaryData(null);
    }, []);

    // HOVER POPOVER STATE & HANDLERS
    const [hoveredMeeting, setHoveredMeeting] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);

    const handlePopoverOpen = useCallback((event, meeting) => {
        setAnchorEl(event.currentTarget);
        setHoveredMeeting(meeting);
    }, []);

    const handlePopoverClose = useCallback(() => {
        setAnchorEl(null);
        setHoveredMeeting(null);
    }, []);


    // FETCH DATA
    const queryParamsStr = JSON.stringify(queryParams);
    const fetchData = useCallback(async () => {
        if (!fnCode && !templateApiUrl) return;
        setIsLoading(true);
        try {
            // Determine API URL based on fnCode
            let apiUrl = API_ADD_MEETING_SCHEDULE;
            if (templateApiUrl) {
                apiUrl = `${APP_DHVB_BASE}${templateApiUrl}`;
            } else if (fnCode === 'LICHCONGTY') {
                apiUrl = API_GET_MEETING_COMPANY;
            } else if (fnCode === 'LICHCANHAN') {
                apiUrl = API_GET_MEETING_INDIVIDUAL;
            } else if (fnCode === 'LICHDONVI') {
                apiUrl = API_GET_MEETING_UNITS;
            }

            // Build query string
            const params = {
                type: viewMode,
                ...queryParams,
                processFn: fnCode,
                filter: { ...(queryParams?.filter || {}) },
            };

            // Map search keyword to title filter if present
            if (queryParams?.search) {
                params.filter.title = queryParams.search;
            }
            if (viewMode === 'month') {
                const currentMonth = dayjs(currentDate).format('YYYY-MM');
                params.filter.currentMonth = currentMonth;
            } else if (viewMode === 'week') {
                const weekDays = getWeekDays(currentDate);
                const startDate = dayjs(weekDays[0]).format('YYYY-MM-DD');
                const endDate = dayjs(weekDays[6]).format('YYYY-MM-DD');
                if (!params.filter.currentWeek) params.filter.currentWeek = {};
                params.filter.currentWeek.startDate = startDate;
                params.filter.currentWeek.endDate = endDate;
            } else { // day
                const currentDateStr = dayjs(currentDate).format('YYYY-MM-DD');
                params.filter.currentDate = currentDateStr;
            }

            const response = await axiosInstance.get(apiUrl, { params });
            if (response && response.items) {
                const mappedEvents = response.items.map(item => {
                    const statusKey = item.status || 'DRAFT';
                    // const statusInfo = MEETING_STATUS[statusKey] || MEETING_STATUS.DRAFT;

                    // Parse date flexibly - handle both DD/MM/YYYY and YYYY-MM-DD formats
                    let datePart;
                    if (item.meetingDate) {
                        // Try to detect format
                        if (item.meetingDate.includes('-')) {
                            // Likely YYYY-MM-DD format from API
                            datePart = dayjs(item.meetingDate, 'YYYY-MM-DD').format('DD/MM/YYYY');
                        } else if (item.meetingDate.includes('/')) {
                            // Already DD/MM/YYYY format
                            datePart = item.meetingDate;
                        } else {
                            // Fallback: try to parse as ISO or any format
                            datePart = dayjs(item.meetingDate).format('DD/MM/YYYY');
                        }
                    } else {
                        datePart = '';
                    }

                    return {
                        ...item,
                        id: item.id,
                        title: item.title,
                        meetingDate: datePart,
                        meetingTime: item.meetingTime,
                        status: statusKey, // Use status key for EVENT_STATUS_COLORS
                        deptName: item.dept_name || item.deptName || '',
                        meetingType: item.meetingType,
                        chairmanId: item.chairmanId,
                        roomIds: normalizeToStringArray(item.roomIds),
                    };
                });
                setMeetings(mappedEvents);
            } else {
                setMeetings([]);
            }
        } catch (error) {
            logger.error("Failed to fetch meetings:", error);
            setMeetings([]);
        } finally {
            setIsLoading(false);
        }
    }, [fnCode, viewMode, currentDate, templateApiUrl, queryParamsStr]);




    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        // With server-side filtering, filteredMeetings is just meetings
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
    useEffect(() => {
        if (calendarBodyRef.current && (viewMode === 'day' || viewMode === 'week')) {
            // Scroll to 6:00 AM (each hour is 40px)
            calendarBodyRef.current.scrollTop = 6 * 40;
        }
    }, [viewMode]);
    const handleSetViewDay = useCallback(() => setViewMode('day'), []);

    const handleToday = useCallback(() => setCurrentDate(new Date()), []);

    const handleEventClick = useCallback(async (e, meeting) => {
        e.stopPropagation();
        if (onEventClick) onEventClick(meeting); // Call parent callback
    }, [onEventClick]);

    const handleDateNumberClick = useCallback((e, date) => {
        e.stopPropagation();
        const dStr = formatDateStr(date);
        const events = filteredMeetings.filter(m => m.meetingDate === dStr);
        setDaySummaryData({ date, events });
    }, [filteredMeetings]);

    const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);

    // --- RENDER POPUPS ---

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
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'center',
                    horizontal: 'right',
                }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                <HoverDetailContainer>
                    <PopupHeader>
                        <PopupTitleLarge>{hoveredMeeting.title}</PopupTitleLarge>
                    </PopupHeader>

                    <DetailRow>
                        <DetailLabel>Thời gian:</DetailLabel>
                        <DetailValue>
                            {hoveredMeeting.meetingTime} {hoveredMeeting.meetingDate ? `- ${hoveredMeeting.meetingDate}` : ''}
                        </DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Hình thức họp:</DetailLabel>
                        <DetailValue>
                            {hoveredMeeting.meetingMode || ''}
                        </DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Địa điểm:</DetailLabel>
                        <DetailValue>
                            {(() => {
                                const list = normalizeToStringArray(hoveredMeeting.roomIds);
                                if (!Array.isArray(list) || list.length === 0) return '';
                                const maxShow = 1;
                                if (list.length <= maxShow) return list.join(', ');
                                return `${list.slice(0, maxShow).join(', ')},... +${list.length - maxShow}`;
                            })()}
                        </DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Người chủ trì:</DetailLabel>
                        <DetailValue>{hoveredMeeting.chairmanId || ''}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Lãnh đạo tham gia:</DetailLabel>
                        <DetailValue>{hoveredMeeting.leaderState || ''}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Loại cuộc họp:</DetailLabel>
                        <DetailValue>{hoveredMeeting.meetingType || ''}</DetailValue>
                    </DetailRow>

                    <DetailRow>
                        <DetailLabel>Đơn vị tham gia:</DetailLabel>
                        {Array.isArray(hoveredMeeting.participatingComponents) ? (
                            <DetailValue>
                                {hoveredMeeting.participatingComponents.length === 0 ? 'Trống' : (
                                    hoveredMeeting.participatingComponents.length <= 2
                                        ? hoveredMeeting.participatingComponents.join(', ')
                                        : `${hoveredMeeting.participatingComponents.slice(0, 2).join(', ')},... +${hoveredMeeting.participatingComponents.length - 2}`
                                )}
                            </DetailValue>
                        ) : (
                            <DetailValue dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hoveredMeeting.participatingComponents || '') }} />
                        )}
                    </DetailRow>

                    <DetailRow>
                        <DetailLabel>Trạng thái:</DetailLabel>

                        <DetailValue>
                            {(() => {
                                const statusInfo = hoveredMeeting.statusCodeObj || MEETING_STATUS_STYLES[hoveredMeeting.status] || DEFAULT_STATUS_STYLE;
                                return (
                                    <StatusBadge badgeColor={statusInfo.color} badgeBg={statusInfo.background}>
                                        {statusInfo.label || hoveredMeeting.status}
                                    </StatusBadge>
                                );
                            })()}
                        </DetailValue>
                    </DetailRow>

                </HoverDetailContainer>
            </StyledPopover>
        );
    };

    // --- VIEW RENDERS ---
    const dayViewContent = useMemo(() => {
        if (viewMode !== 'day') return null;
        const dateStr = formatDateStr(currentDate);
        const dayMeetings = filteredMeetings.filter(m => m.meetingDate === dateStr);

        // Calculate layout for overlapping events
        const eventLayouts = calculateEventLayout(dayMeetings);

        const viDays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        const dayName = viDays[currentDate.getDay()];
        const dayNameUpper = dayName.toUpperCase();

        const header = (
            <WeekHeaderRow>
                <DayViewHeaderTimeLabel>GIỜ</DayViewHeaderTimeLabel>
                <DayViewColHeader isToday={formatDateStr(currentDate) === formatDateStr(new Date())}>
                    <DayViewNameText isToday={formatDateStr(currentDate) === formatDateStr(new Date())}>
                        {dayNameUpper}
                    </DayViewNameText>
                    <DayViewDateNumber isToday={formatDateStr(currentDate) === formatDateStr(new Date())}>
                        {currentDate.getDate()}
                    </DayViewDateNumber>
                </DayViewColHeader>
            </WeekHeaderRow>
        );

        const body = (
            <DayViewBodyContainerNoPadding>
                <DayViewBody>
                    <TimeAxis>{HOURS_OF_DAY.map(h => <TimeLabel key={h}>{h.toString().padStart(2, '0')}:00</TimeLabel>)}</TimeAxis>
                    <EventsTrack>
                        {HOURS_OF_DAY.map(h => <GridLine key={h} />)}
                        {formatDateStr(currentDate) === formatDateStr(new Date()) && (
                            <CurrentTimeLine posTop={((currentTime.getHours() * 60) + currentTime.getMinutes()) * (40 / 60)} />
                        )}
                        {eventLayouts.map(({ event, column, totalColumns }) => (
                            <DayEventBoxItem
                                key={event.id}
                                event={event}
                                column={column}
                                totalColumns={totalColumns}
                                onClick={handleEventClick}
                                onMouseEnter={handlePopoverOpen}
                                onMouseLeave={handlePopoverClose}
                            />
                        ))}
                    </EventsTrack>
                </DayViewBody>
            </DayViewBodyContainerNoPadding>
        );

        return { header, body };
    }, [viewMode, currentDate, filteredMeetings, currentTime, handleEventClick, handlePopoverOpen, handlePopoverClose]);

    const weekViewContent = useMemo(() => {
        if (viewMode !== 'week') return null;
        const weekDays = getWeekDays(currentDate);

        const header = (
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
        );

        const body = (
            <WeekViewContainer>
                <WeekBody>
                    <TimeColumn>{HOURS_OF_DAY.map(h => <TimeSlot key={`time-${h}`}>{h}:00</TimeSlot>)}</TimeColumn>
                    <WeekDaysContainer>
                        {weekDays.map((d) => {
                            const dStr = formatDateStr(d);
                            const daysEvents = filteredMeetings.filter(m => m.meetingDate === dStr);
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            const eventLayouts = calculateEventLayout(daysEvents);
                            return (
                                <DayColumn key={dStr} isWeekend={isWeekend} isToday={formatDateStr(d) === formatDateStr(new Date())}>
                                    {HOURS_OF_DAY.map(h => <GridLine key={h} />)}
                                    {eventLayouts.map(({ event, column, totalColumns }) => (
                                        <WeekEventChipItem
                                            key={event.id}
                                            event={event}
                                            column={column}
                                            totalColumns={totalColumns}
                                            onClick={handleEventClick}
                                            onMouseEnter={handlePopoverOpen}
                                            onMouseLeave={handlePopoverClose}
                                        />
                                    ))}
                                </DayColumn>
                            );
                        })}
                    </WeekDaysContainer>
                </WeekBody>
            </WeekViewContainer>
        );

        return { header, body };
    }, [viewMode, currentDate, filteredMeetings, currentTime, handleEventClick, handlePopoverOpen, handlePopoverClose]);

    const monthViewContent = useMemo(() => {
        if (viewMode !== 'month') return null;
        const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
        const todayStr = formatDateStr(new Date());
        const maxEventsLimit = 2;

        const header = (
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
        );

        const body = (
            <MonthViewContainer>
                <MonthGrid>
                    {days.map((d, i) => {
                        const dStr = formatDateStr(d);
                        const isToday = dStr === todayStr;
                        const isOtherMonth = d.getMonth() !== currentDate.getMonth();
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const dayEvents = filteredMeetings.filter(m => m.meetingDate === dStr);
                        const visibleEvents = dayEvents.length > maxEventsLimit ? dayEvents.slice(0, maxEventsLimit) : dayEvents;
                        const remainingCount = dayEvents.length - visibleEvents.length;
                        return (
                            <MonthCell key={`${dStr}-${i}`} isWeekend={isWeekend}>
                                <MonthDateNumber date={d} isToday={isToday} isOtherMonth={isOtherMonth} onClick={handleDateNumberClick} />
                                <div>
                                    {visibleEvents.map((ev) => (
                                        <MonthEventItem key={ev.id} evt={ev} onClick={handleEventClick} onMouseEnter={handlePopoverOpen} onMouseLeave={handlePopoverClose} />
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

        return { header, body };
    }, [viewMode, currentDate, filteredMeetings, handleEventClick, handleDateNumberClick, handlePopoverOpen, handlePopoverClose]);

    // Compute rendered header and body for each view mode
    const calendarHeader = weekViewContent?.header || monthViewContent?.header || dayViewContent?.header || null;
    const calendarBody = weekViewContent?.body || monthViewContent?.body || dayViewContent?.body || null;

    const calendarContent = (
        <Container>
            {renderHoverDetail()}
            {renderDaySummaryModal()}
            <NavBar>
                <NavLeft>
                    <TodayButton onClick={handleToday}>Hiện tại</TodayButton>
                    <NavArrowButton onClick={handlePrev}><ChevronLeft /></NavArrowButton>

                    {viewMode === 'week' ? (
                        <>
                            <CurrentLabel>
                                Tuần {getWeekNumber(currentDate)}
                            </CurrentLabel>
                            <NavArrowButton onClick={handleNext}><ChevronRight /></NavArrowButton>
                            <DateRangeLabel>
                                {(() => {
                                    const weekDays = getWeekDays(currentDate);
                                    const start = weekDays[0];
                                    const end = weekDays[6];
                                    const startStr = `${start.getDate()}`;
                                    const endStr = `${end.getDate()} tháng ${end.getMonth() + 1} ${end.getFullYear()}`;
                                    return `Ngày ${startStr} - ${endStr}`;
                                })()}
                            </DateRangeLabel>
                        </>
                    ) : viewMode === 'day' ? (
                        <>
                            <CurrentLabel>
                                {['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][currentDate.getDay()]}
                            </CurrentLabel>
                            <NavArrowButton onClick={handleNext}><ChevronRight /></NavArrowButton>
                            <DateRangeLabel>
                                {`Ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`}
                            </DateRangeLabel>
                        </>
                    ) : (
                        <>
                            <CurrentLabel>
                                {`Tháng ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`}
                            </CurrentLabel>
                            <NavArrowButton onClick={handleNext}><ChevronRight /></NavArrowButton>
                        </>
                    )}
                </NavLeft>
                <ViewSwitcher>
                    <ViewSwitchButton $active={viewMode === 'month'} onClick={handleSetViewMonth}>LỊCH THÁNG</ViewSwitchButton>
                    <ViewSwitchButton $active={viewMode === 'week'} onClick={handleSetViewWeek}>LỊCH TUẦN</ViewSwitchButton>
                    <ViewSwitchButton $active={viewMode === 'day'} onClick={handleSetViewDay}>LỊCH NGÀY</ViewSwitchButton>
                </ViewSwitcher>
            </NavBar>

            <ContentArea isLoading={isLoading}>
                {isLoading && <LoadingOverlay>Đang tải dữ liệu...</LoadingOverlay>}
                {calendarHeader && <CalendarHeaderArea>{calendarHeader}</CalendarHeaderArea>}
                <CalendarBodyArea ref={calendarBodyRef}>{calendarBody}</CalendarBodyArea>
            </ContentArea>

            <Footer>
                <FooterSection>
                    <NoteSection>
                        {/* <SectionTitle>
                            Ghi chú:
                        </SectionTitle> */}
                        {/* <SkyTypography variant="body2">
                            Lãnh đạo đi công tác địa điểm thời gian
                        </SkyTypography>
                        <SkyTypography variant="body2">
                            Lãnh đạo đi công tác địa điểm thời gian
                        </SkyTypography>
                        <SkyTypography variant="body2">
                            Lãnh đạo đi công tác địa điểm thời gian
                        </SkyTypography>
                        <SkyTypography variant="body2">
                            Lãnh đạo đi công tác địa điểm thời gian
                        </SkyTypography> */}
                    </NoteSection>
                </FooterSection>
                <FooterSection>
                    <StatsText>Màu trạng thái lịch :</StatsText>
                    <LegendGrid>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.DU_KIEN.background} edgeColor={MEETING_STATUS_STYLES.DU_KIEN.color} /> {MEETING_STATUS_STYLES.DU_KIEN.label}</LegendItem>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.DANG_HOP.background} edgeColor={MEETING_STATUS_STYLES.DANG_HOP.color} /> {MEETING_STATUS_STYLES.DANG_HOP.label}</LegendItem>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.DA_HUY.background} edgeColor={MEETING_STATUS_STYLES.DA_HUY.color} /> {MEETING_STATUS_STYLES.DA_HUY.label}</LegendItem>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.CHUAN_BI.background} edgeColor={MEETING_STATUS_STYLES.CHUAN_BI.color} /> {MEETING_STATUS_STYLES.CHUAN_BI.label}</LegendItem>
                        <LegendItem><LegendBox fillColor={MEETING_STATUS_STYLES.KET_THUC.background} edgeColor={MEETING_STATUS_STYLES.KET_THUC.color} /> {MEETING_STATUS_STYLES.KET_THUC.label}</LegendItem>
                    </LegendGrid>
                </FooterSection>
            </Footer>
        </Container>
    );

    return calendarContent;
};

export default MeetingScheduleCalendarHasSubmenu;
