import React, { useState, useEffect, useCallback, useMemo } from 'react';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/vi';

// --- MUI ICONS ---
import { ChevronLeft, ChevronRight, Close } from '@mui/icons-material';
// import { Popover } from '@mui/material';
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE, API_GET_MEETING_COMPANY, API_GET_MEETING_INDIVIDUAL, API_GET_MEETING_UNITS, APP_DHVB_BASE } from "@EnvironmentFile/constants/urlConfig";
// import { SkyTypography } from '@styles/SkyStyles';
import { getGlobalTableState, subscribeGlobalTableState } from '@utils/GlobalTableState';
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
    EventTitleRow,
    EventInfoRow,
    EventTitleText,
    SvgIconWrapper,
    MoreEventsIndicator,
    Footer,
    FooterSection,
    LegendGrid,
    LegendItem,
    LegendBox,
    // NoteSection,
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
    TimelineContainer,
    TimelineDaySection,
    TimelineDayHeader,
    TimelineDayTitleBox,
    TimelineDayTitle,
    TimelineCountBadge,
    TimelineCardList,
    TimelineCard,
    TimelineTimeBox,
    TimelineTimeText,
    TimelineTrackBox,
    TimelineConnectorLine,
    TimelineDot,
    TimelineIconBox,
    TimelineInfoBox,
    TimelineMeetingTitleRow,
    TimelineMeetingTitle,
    TimelineMiniBadge,
    TimelineActionBox,
    TimelineDepartmentText,
    TimelineStatusBadge,
    TimelineNoMeetingsText,
    TimelineSplitLayout,
    TimelineDayExpandIcon,
    TimelineMainContent,
    TimelineSidebar,
    SidebarCard,
    SidebarTitle,
    MiniCalHeader,
    MiniCalMonthLabel,
    MiniCalGrid,
    MiniCalDayLabel,
    MiniCalCell,
    StatsOverviewGrid,
    StatBlock,
    StatIconWrapper,
    StatTexts,
    StatNumber,
    StatLabelText,
    UpcomingList,
    UpcomingItem,
    UpcomingDateText,
    UpcomingTimeText,
    UpcomingTitleText,
    UpcomingMetaRow,
    UpcomingMetaItem,
    DayViewHeaderTimeLabel,
    DayViewColHeader,
    DayViewNameText,
    DayViewDateNumber,
    DayViewBodyContainerNoPadding,
    EllipsisText,
    TimelineDescRowNoWrap,
    TimelineDescItemRoom,
    TimelineDescItemUsers
} from "@pages/MeetingCalendar/componentStyle/MeetingScheduleCalendar.styles"
import { WeekNavContainer } from '@pages/MeetingCalendar/componentStyle/MeetingScheduleCalendar.styles';
// import { encodeHTML } from '@/utils/securityUtils';
import DOMPurify from "dompurify";

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
// STYLED COMPONENTS (MUI)
// ==========================================





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
            <EventTitleRow>
                {event.iconMeeting && (
                    <SvgIconWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.iconMeeting) }} />
                )}
                <EventTitle>{event.title}</EventTitle>
                {event.iconMeetingSecond && (
                    <SvgIconWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.iconMeetingSecond) }} />
                )}
            </EventTitleRow>
            <EventInfoRow>
                <EventTime>{event.meetingTime}</EventTime>
            </EventInfoRow>
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
            <EventTitleRow>
                {event.iconMeeting && (
                    <SvgIconWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.iconMeeting) }} />
                )}
                <ChipTitle>{event.title}</ChipTitle>
                {event.iconMeetingSecond && (
                    <SvgIconWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.iconMeetingSecond) }} />
                )}
            </EventTitleRow>
            <ChipText>{event.meetingTime}</ChipText>
            <ChipText>{event.roomName || event.deptName || event.organizationalUnit || event.createdByOrg || ''}</ChipText>
        </WeekEventChip>
    );
});
WeekEventChipItem.displayName = 'WeekEventChipItem';

const MonthEventItem = React.memo(({ evt, onClick, onMouseEnter, onMouseLeave }) => {
    const handleClick = useCallback((e) => onClick(e, evt), [evt, onClick]);
    const handleMouseEnter = useCallback((e) => onMouseEnter && onMouseEnter(e, evt), [evt, onMouseEnter]);

    return (
        <MonthEventChip status={evt.status} customStyle={evt.statusCodeObj} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={onMouseLeave}>
            {evt.iconMeeting && (
                <SvgIconWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(evt.iconMeeting) }} />
            )}
            <EventTitleText>{evt.title}</EventTitleText>
            {evt.iconMeetingSecond && (
                <SvgIconWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(evt.iconMeetingSecond) }} />
            )}
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
            {evt.iconMeeting && (
                <SvgIconWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(evt.iconMeeting) }} />
            )}
            <EventTitleText>{evt.title}</EventTitleText>
            {evt.iconMeetingSecond && (
                <SvgIconWrapper dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(evt.iconMeetingSecond) }} />
            )}
        </DaySummaryItem>
    );
});
DaySummaryItemComp.displayName = 'DaySummaryItemComp';

// ==========================================
// COMPONENT LOGIC
// ==========================================

const MeetingScheduleCalendar = (props) => {
    const {
        fnCode,
        onEventClick,
        templateApiUrl,
        queryParams,
        isFullscreen = false,
        isFullScreen = false,
        isCalendarFullscreen = false,
        fullscreen = false
    } = props;

    const effectiveFullscreen = Boolean(
        isFullscreen || isFullScreen || isCalendarFullscreen || fullscreen
    );

    // console.log('✅ MeetingScheduleCalendar RENDER - effectiveFullscreen:', effectiveFullscreen, {
    //     isFullscreen,
    //     isFullScreen,
    //     isCalendarFullscreen,
    //     fullscreen
    // });
    const calendarBodyRef = React.useRef(null);
    const [globalState, setGlobalState] = useState(getGlobalTableState());
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
    const [expandedDays, setExpandedDays] = useState({});

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

    useEffect(() => {
        setGlobalState(getGlobalTableState());
        const unsubscribe = subscribeGlobalTableState((newState) => {
            setGlobalState(prev => ({ ...prev, ...newState }));
        });
        return unsubscribe;
    }, []);

    const effectiveFnCode = fnCode ?? globalState?.fnCode;
    const effectiveTemplateApiUrl = templateApiUrl ?? globalState?.templateApiUrl;
    const effectiveQueryParams = queryParams ?? globalState?.queryParams;

    // FETCH DATA
    const fetchData = useCallback(async () => {
        if (!effectiveFnCode && !effectiveTemplateApiUrl) return;
        setIsLoading(true);
        try {
            // Determine API URL based on fnCode
            let apiUrl = API_ADD_MEETING_SCHEDULE;
            if (effectiveTemplateApiUrl) {
                apiUrl = `${APP_DHVB_BASE}${effectiveTemplateApiUrl}`;
            } else if (effectiveFnCode === 'LICHCONGTY') {
                apiUrl = API_GET_MEETING_COMPANY;
            } else if (effectiveFnCode === 'LICHCANHAN') {
                apiUrl = API_GET_MEETING_INDIVIDUAL;
            } else if (effectiveFnCode === 'LICHDONVI') {
                apiUrl = API_GET_MEETING_UNITS;
            }

            // Build query string
            const params = {
                type: viewMode === 'timeline' ? 'week' : viewMode,
                ...effectiveQueryParams,
                processFn: effectiveFnCode,
                filter: { ...(effectiveQueryParams?.filter || {}) },
            };

            if (viewMode === 'month') {
                const currentMonth = dayjs(currentDate).format('YYYY-MM');
                params.filter.currentMonth = currentMonth;
            } else if (viewMode === 'week' || viewMode === 'timeline') {
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
                        id: item.id,
                        title: item.title,
                        meetingDate: datePart,
                        meetingTime: item.meetingTime,
                        status: statusKey, // Use status key for EVENT_STATUS_COLORS
                        deptName: item.dept_name || item.deptName || '',
                        meetingType: item.meetingType,
                        chairmanId: item.chairmanId,
                        roomIds: item.roomIds,
                        // iconMeeting: `<svg width="11" height="9" viewBox="0 0 11 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.2103 4.63636L11 5.40545L7.31641 9L5.35897 7.09091L6.14872 6.32182L7.31641 7.45636L10.2103 4.63636ZM3.94872 7.09091L5.64103 8.72727H0V7.63636C0 6.43091 2.01949 5.45455 4.51282 5.45455L5.57897 5.51455L3.94872 7.09091ZM4.51282 0C5.11126 0 5.68518 0.229869 6.10834 0.63904C6.5315 1.04821 6.76923 1.60316 6.76923 2.18182C6.76923 2.76047 6.5315 3.31543 6.10834 3.7246C5.68518 4.13377 5.11126 4.36364 4.51282 4.36364C3.91438 4.36364 3.34046 4.13377 2.9173 3.7246C2.49414 3.31543 2.25641 2.76047 2.25641 2.18182C2.25641 1.60316 2.49414 1.04821 2.9173 0.63904C3.34046 0.229869 3.91438 0 4.51282 0Z" fill="#2E7D32"/></svg>`,
                        // iconMeetingSecond: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.41667 7.41667H6.33333V4.16667H7.41667M6.33333 8.5H7.41667V9.58333H6.33333M8.89542 2H4.85458L2 4.85458V8.89542L4.85458 11.75H8.89542L11.75 8.89542V4.85458L8.89542 2Z" fill="#FFA629"/></svg>`,
                        ...item
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
    }, [effectiveFnCode, viewMode, currentDate, effectiveTemplateApiUrl, effectiveQueryParams]);




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
            if (viewMode === 'day' || viewMode === 'timeline') newDate.setDate(prev.getDate() + 1);
            else if (viewMode === 'week') newDate.setDate(prev.getDate() + 7);
            else newDate.setMonth(prev.getMonth() + 1);
            return newDate;
        });
    }, [viewMode]);

    const handlePrev = useCallback(() => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (viewMode === 'day' || viewMode === 'timeline') newDate.setDate(prev.getDate() - 1);
            else if (viewMode === 'week') newDate.setDate(prev.getDate() - 7);
            else newDate.setMonth(prev.getMonth() - 1);
            return newDate;
        });
    }, [viewMode]);

    const handleSetViewMonth = useCallback(() => setViewMode('month'), []);
    const handleSetViewWeek = useCallback(() => setViewMode('week'), []);
    const handleSetViewTimeline = useCallback(() => setViewMode('timeline'), []);

    useEffect(() => {
        if (calendarBodyRef.current && (viewMode === 'day' || viewMode === 'week')) {
            // Scroll to 6:00 AM (each hour is 40px)
            calendarBodyRef.current.scrollTop = 6 * 40;
        }
    }, [viewMode]);

    const handleSetViewDay = useCallback(() => setViewMode('day'), []);

    const handleToday = useCallback(() => setCurrentDate(new Date()), []);

    // Effect to automatically expand today (or the first day of the week) when entering timeline view or changing week
    useEffect(() => {
        if (viewMode === 'timeline') {
            const selectedStr = dayjs(currentDate).format('DD/MM/YYYY');
            const weekDays = getWeekDays(currentDate);
            const weekDayStrings = weekDays.map(d => formatDateStr(d));
            if (weekDayStrings.includes(selectedStr)) {
                setExpandedDays({ [selectedStr]: true });
            } else if (weekDayStrings.length > 0) {
                setExpandedDays({ [weekDayStrings[0]]: true });
            }
        }
    }, [viewMode, currentDate]);

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
                                const list = hoveredMeeting.roomIds;
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

    const handleDayExpandProxy = useCallback((e) => {
        const dateStr = e.currentTarget.dataset.date;
        if (dateStr) {
            setExpandedDays(prev => ({
                ...prev,
                [dateStr]: !prev[dateStr]
            }));
        }
    }, [setExpandedDays]);

    const handleEventClickProxy = useCallback((e) => {
        const eventId = e.currentTarget.dataset.eventId;
        if (eventId && filteredMeetings) {
            const event = filteredMeetings.find(m => String(m.id) === eventId);
            if (event) {
                handleEventClick(e, event);
            }
        }
    }, [filteredMeetings, handleEventClick]);

    const timelineViewContent = useMemo(() => {
        if (viewMode !== 'timeline') return null;
        const weekDays = getWeekDays(currentDate);

        const header = null;

        const todayStr = dayjs(new Date()).format('DD/MM/YYYY');
        const tomorrowStr = dayjs(new Date()).add(1, 'day').format('DD/MM/YYYY');

        // Sidebar stats calculations
        const todayMeetings = filteredMeetings.filter(m => m.meetingDate === todayStr);
        const statsMeetingsCount = todayMeetings.length;
        const statsParticipantsCount = todayMeetings.reduce((sum, m) => {
            const guestList = Array.isArray(m.guests) ? m.guests : [];
            return sum + guestList.length + (m.chairmanId ? 1 : 0) + (m.secretaryId ? 1 : 0);
        }, 0) || (statsMeetingsCount ? statsMeetingsCount * 4 + 4 : 0);

        const uniqueRooms = new Set();
        todayMeetings.forEach(m => {
            if (m.roomName) uniqueRooms.add(m.roomName);
            else if (m.roomIds) {
                if (Array.isArray(m.roomIds)) m.roomIds.forEach(id => uniqueRooms.add(id));
                else uniqueRooms.add(m.roomIds);
            }
        });
        const statsRoomsCount = uniqueRooms.size || statsMeetingsCount;

        const statsDurationHours = todayMeetings.reduce((sum, m) => {
            if (m.meetingTime) {
                const [start, end] = m.meetingTime.split('-');
                if (start && end) {
                    const [sh, sm] = start.split(':').map(Number);
                    const [eh, em] = end.split(':').map(Number);
                    return sum + (eh - sh) + (em - sm)/60;
                }
            }
            return sum + 1.5;
        }, 0);

        // Upcoming meetings list (tomorrow and later)
        const todayObj = dayjs().startOf('day');
        const upcomingMeetings = filteredMeetings
            .filter(m => {
                const isCanceled = m.status === 'DA_HUY' || m.status === 'CANCEL';
                if (isCanceled) return false;
                const mDate = dayjs(m.meetingDate, 'DD/MM/YYYY');
                return mDate.isAfter(todayObj);
            })
            .sort((a, b) => {
                const dateA = dayjs(a.meetingDate, 'DD/MM/YYYY');
                const dateB = dayjs(b.meetingDate, 'DD/MM/YYYY');
                return dateA.diff(dateB);
            })
            .slice(0, 3);

        // Mini calendar calculation
        const miniCalDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
        const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const miniCalMonthLabelText = `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`;

        const body = (
            <TimelineSplitLayout>
                {/* Left side timeline */}
                <TimelineMainContent>
                    <TimelineContainer>
                        {weekDays.map((d) => {
                            const dStr = formatDateStr(d);
                            const isExpanded = !!expandedDays[dStr];
                            const dayMeetings = filteredMeetings.filter(m => m.meetingDate === dStr);
                            const totalCount = dayMeetings.length;

                            const dayName = d.getDay() === 0 ? 'Chủ Nhật' : `Thứ ${d.getDay() + 1}`;
                            let labelPrefix = "";
                            if (dStr === todayStr) {
                                labelPrefix = "HÔM NAY – ";
                            } else if (dStr === tomorrowStr) {
                                labelPrefix = "NGÀY MAI – ";
                            }

                            const titleText = `${labelPrefix}${dayName}, ${dStr}`;

                            return (
                                <TimelineDaySection key={dStr}>
                                    <TimelineDayHeader type="button" data-date={dStr} onClick={handleDayExpandProxy}>
                                        <TimelineDayTitleBox>
                                            <TimelineDayTitle>{titleText}</TimelineDayTitle>
                                            <TimelineCountBadge>{totalCount} cuộc họp</TimelineCountBadge>
                                        </TimelineDayTitleBox>
                                        <TimelineDayExpandIcon $isExpanded={isExpanded}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </TimelineDayExpandIcon>
                                    </TimelineDayHeader>
                                    {isExpanded && (
                                        <TimelineCardList>
                                            {totalCount > 0 ? (
                                                dayMeetings.map((event) => {
                                                    const statusInfo = event.statusCodeObj || MEETING_STATUS_STYLES[event.status] || DEFAULT_STATUS_STYLE;
                                                    const [startStr, endStr] = event.meetingTime ? event.meetingTime.split('-') : ['', ''];

                                                    return (
                                                        <TimelineCard key={event.id} data-event-id={event.id} onClick={handleEventClickProxy}>
                                                            <TimelineTrackBox>
                                                                <TimelineConnectorLine />
                                                                <TimelineDot statusColor={statusInfo.color} />
                                                            </TimelineTrackBox>

                                                            <TimelineTimeBox>
                                                                <TimelineTimeText isBold>{startStr || ''}</TimelineTimeText>
                                                                <TimelineTimeText>{endStr || ''}</TimelineTimeText>
                                                            </TimelineTimeBox>

                                                            <TimelineIconBox statusBg={statusInfo.background} statusColor={statusInfo.color}>
                                                                {event.iconMeeting ? (
                                                                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.iconMeeting) }} />
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                                        <circle cx="9" cy="7" r="4"></circle>
                                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                                    </svg>
                                                                )}
                                                            </TimelineIconBox>

                                                            <TimelineInfoBox>
                                                                <TimelineMeetingTitleRow>
                                                                    <TimelineMeetingTitle>{event.title}</TimelineMeetingTitle>
                                                                    {event.meetingMode && (
                                                                        <TimelineMiniBadge customStyle={statusInfo}>
                                                                            {event.meetingMode}
                                                                        </TimelineMiniBadge>
                                                                    )}
                                                                </TimelineMeetingTitleRow>
                                                                <TimelineDescRowNoWrap>
                                                                    <TimelineDescItemRoom>
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                                            <circle cx="12" cy="10" r="3"></circle>
                                                                        </svg>
                                                                        <EllipsisText title={event.roomName || ''}>
                                                                            {event.roomName || ''}
                                                                        </EllipsisText>
                                                                    </TimelineDescItemRoom>
                                                                    <TimelineDescItemUsers>
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                                            <circle cx="12" cy="7" r="4"></circle>
                                                                        </svg>
                                                                        {(() => {
                                                                            const hostStr = event.chairmanId || 'Chủ trì';
                                                                            let othersCount = 0;
                                                                            
                                                                            if (event.participantSummary && typeof event.participantSummary.totalPeople === 'number') {
                                                                                othersCount = Math.max(0, event.participantSummary.totalPeople - 1);
                                                                            } else if (typeof event.totalParticipants === 'number' && event.totalParticipants > 0) {
                                                                                othersCount = Math.max(0, event.totalParticipants - 1);
                                                                            } else if (typeof event.totalPeople === 'number' && event.totalPeople > 0) {
                                                                                othersCount = Math.max(0, event.totalPeople - 1);
                                                                            } else {
                                                                                let fallbackCount = 0;
                                                                                if (Array.isArray(event.participants)) fallbackCount += event.participants.length;
                                                                                if (Array.isArray(event.guests)) fallbackCount += event.guests.length;
                                                                                if (event.secretaryId) fallbackCount += 1;
                                                                                othersCount = fallbackCount;
                                                                            }
                                                                            
                                                                            let displayText = hostStr;
                                                                            if (othersCount > 0) {
                                                                                displayText = `${hostStr} và ${othersCount} người khác`;
                                                                            }
                                                                            
                                                                            return (
                                                                                <EllipsisText title={displayText}>
                                                                                    {displayText}
                                                                                </EllipsisText>
                                                                            );
                                                                        })()}
                                                                    </TimelineDescItemUsers>
                                                                </TimelineDescRowNoWrap>
                                                            </TimelineInfoBox>

                                                            <TimelineActionBox>
                                                                <TimelineDepartmentText>
                                                                    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M0 13.5V0H7.5V3H15V13.5H0ZM1.5 12H6V10.5H1.5V12ZM1.5 9H6V7.5H1.5V9ZM1.5 6H6V4.5H1.5V6ZM1.5 3H6V1.5H1.5V3ZM7.5 12H13.5V4.5H7.5V12ZM9 7.5V6H12V7.5H9ZM9 10.5V9H12V10.5H9Z" fill="currentColor"/>
                                                                    </svg>
                                                                    {Array.isArray(event.participatingComponents) ? (
                                                                        <span>{event.participatingComponents.length} phòng ban</span>
                                                                    ) : (
                                                                        <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.participatingComponents || event.deptName || '0 phòng ban') }} />
                                                                    )}
                                                                </TimelineDepartmentText>
                                                                <TimelineStatusBadge 
                                                                    badgeBg={statusInfo.background} 
                                                                    badgeColor={statusInfo.color}
                                                                    data-event-id={event.id}
                                                                    onClick={handleEventClickProxy}
                                                                >
                                                                    {statusInfo.label}
                                                                </TimelineStatusBadge>
                                                            </TimelineActionBox>
                                                        </TimelineCard>
                                                    );
                                                })
                                            ) : (
                                                <TimelineNoMeetingsText>Không có lịch họp trong ngày</TimelineNoMeetingsText>
                                            )}
                                        </TimelineCardList>
                                    )}
                                </TimelineDaySection>
                            );
                        })}
                    </TimelineContainer>
                </TimelineMainContent>

                {/* Right side sidebar */}
                <TimelineSidebar>
                    {/* Mini Calendar Card */}
                    <SidebarCard>
                        <MiniCalHeader>
                            <MiniCalMonthLabel>{miniCalMonthLabelText}</MiniCalMonthLabel>
                        </MiniCalHeader>
                        <MiniCalGrid>
                            {daysOfWeek.map(d => (
                                <MiniCalDayLabel key={d}>{d}</MiniCalDayLabel>
                            ))}
                            {miniCalDays.map((cellDate, idx) => {
                                const isCellToday = formatDateStr(cellDate) === todayStr;
                                const isCellSelected = formatDateStr(cellDate) === formatDateStr(currentDate);
                                const isOtherMonth = cellDate.getMonth() !== currentDate.getMonth();
                                return (
                                    <MiniCalCell 
                                        key={idx}
                                        isToday={isCellToday}
                                        isSelected={isCellSelected}
                                        isOtherMonth={isOtherMonth}
                                        data-time={cellDate.getTime()}
                                    >
                                        {cellDate.getDate()}
                                    </MiniCalCell>
                                );
                            })}
                        </MiniCalGrid>
                    </SidebarCard>

                    {/* Today Overview Card */}
                    <SidebarCard>
                        <SidebarTitle>Tổng quan hôm nay</SidebarTitle>
                        <StatsOverviewGrid>
                            <StatBlock>
                                <StatIconWrapper $iconColor="#0284C7">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </StatIconWrapper>
                                <StatTexts>
                                    <StatNumber>{statsMeetingsCount}</StatNumber>
                                    <StatLabelText>Cuộc họp</StatLabelText>
                                </StatTexts>
                            </StatBlock>

                            <StatBlock>
                                <StatIconWrapper $iconColor="#EAB308">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                </StatIconWrapper>
                                <StatTexts>
                                    <StatNumber>{statsParticipantsCount}</StatNumber>
                                    <StatLabelText>Người tham dự</StatLabelText>
                                </StatTexts>
                            </StatBlock>

                            <StatBlock>
                                <StatIconWrapper $iconColor="#10B981">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                                </StatIconWrapper>
                                <StatTexts>
                                    <StatNumber>{statsRoomsCount}</StatNumber>
                                    <StatLabelText>Phòng ban</StatLabelText>
                                </StatTexts>
                            </StatBlock>

                            <StatBlock>
                                <StatIconWrapper $iconColor="#6366F1">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                </StatIconWrapper>
                                <StatTexts>
                                    <StatNumber>{statsDurationHours.toFixed(1)} giờ</StatNumber>
                                    <StatLabelText>Thời lượng</StatLabelText>
                                </StatTexts>
                            </StatBlock>
                        </StatsOverviewGrid>
                    </SidebarCard>

                    {/* Upcoming Meetings Card */}
                    <SidebarCard>
                        <SidebarTitle>Lịch sắp tới</SidebarTitle>
                        <UpcomingList>
                            {upcomingMeetings.length > 0 ? (
                                upcomingMeetings.map((m) => {
                                    const mDate = dayjs(m.meetingDate, 'DD/MM/YYYY');
                                    const dayName = mDate.day() === 0 ? 'Chủ Nhật' : `Thứ ${mDate.day() + 1}`;
                                    return (
                                        <UpcomingItem key={m.id} data-event-id={m.id} onClick={handleEventClickProxy}>
                                            <UpcomingDateText>{dayName}, {m.meetingDate}</UpcomingDateText>
                                            <UpcomingTimeText>{m.meetingTime}</UpcomingTimeText>
                                            <UpcomingTitleText>{m.title}</UpcomingTitleText>
                                            <UpcomingMetaRow>
                                                <UpcomingMetaItem>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                    {m.roomName || 'PHÒNG HỌP'}
                                                </UpcomingMetaItem>
                                                <UpcomingMetaItem>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                                                    {Array.isArray(m.guests) ? m.guests.length : 0}
                                                </UpcomingMetaItem>
                                            </UpcomingMetaRow>
                                        </UpcomingItem>
                                    );
                                })
                            ) : (
                                <TimelineNoMeetingsText $customPadding="10px 0">Không có lịch sắp tới</TimelineNoMeetingsText>
                            )}
                        </UpcomingList>
                    </SidebarCard>
                </TimelineSidebar>
            </TimelineSplitLayout>
        );

        return { header, body };
    }, [viewMode, currentDate, filteredMeetings, expandedDays, handleEventClick]);

    // Compute rendered header and body for each view mode
    const calendarHeader = weekViewContent?.header || monthViewContent?.header || dayViewContent?.header || timelineViewContent?.header || null;
    const calendarBody = weekViewContent?.body || monthViewContent?.body || dayViewContent?.body || timelineViewContent?.body || null;

    const calendarContent = (
        <Container isFullScreen={effectiveFullscreen}>
            {renderHoverDetail()}
            {renderDaySummaryModal()}
            <NavBar>
                <NavLeft>

                    <TodayButton onClick={handleToday}>Hôm nay</TodayButton>

                    <WeekNavContainer>
                        <NavArrowButton onClick={handlePrev}><ChevronLeft /></NavArrowButton>
                        <CurrentLabel>
                            {viewMode === 'week' ? `Tuần ${getWeekNumber(currentDate)}` : 
                             viewMode === 'timeline' || viewMode === 'day' ? ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][currentDate.getDay()] :
                             dayjs(currentDate).format('DD/MM/YYYY')}
                        </CurrentLabel>
                        <NavArrowButton onClick={handleNext}><ChevronRight /></NavArrowButton>
                    </WeekNavContainer>

                    {(viewMode === 'week' || viewMode === 'timeline' || viewMode === 'day') && (
                        <DateRangeLabel>
                            {viewMode === 'timeline' || viewMode === 'day' ? (
                                `Ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`
                            ) : (
                                (() => {
                                    const weekDays = getWeekDays(currentDate);
                                    const start = weekDays[0];
                                    const end = weekDays[6];
                                    return `Ngày ${start.getDate()} - ${end.getDate()} tháng ${end.getMonth() + 1} ${end.getFullYear()}`;
                                })()
                            )}
                        </DateRangeLabel>
                    )}
                </NavLeft>
                <ViewSwitcher>
                    <ViewSwitchButton $active={viewMode === 'timeline'} onClick={handleSetViewTimeline}>Timeline</ViewSwitchButton>
                    <ViewSwitchButton $active={viewMode === 'day'} onClick={handleSetViewDay}>Ngày</ViewSwitchButton>
                    <ViewSwitchButton $active={viewMode === 'week'} onClick={handleSetViewWeek}>Tuần</ViewSwitchButton>
                    <ViewSwitchButton $active={viewMode === 'month'} onClick={handleSetViewMonth}>Tháng</ViewSwitchButton>
                </ViewSwitcher>
            </NavBar>

            <ContentArea isLoading={isLoading} isFullScreen={effectiveFullscreen}>
                {isLoading && <LoadingOverlay>Đang tải dữ liệu...</LoadingOverlay>}
                {calendarHeader && <CalendarHeaderArea>{calendarHeader}</CalendarHeaderArea>}
                {viewMode === 'timeline' ? (
                    calendarBody
                ) : (
                    <CalendarBodyArea ref={calendarBodyRef}>{calendarBody}</CalendarBodyArea>
                )}
            </ContentArea>

            <Footer>
                {/* <FooterSection> */}
                    {/* <StatsBox>
                        <StatsTitle>Thống kê sử dụng phòng họp tháng 10/2025</StatsTitle>
                        <StatsRow>
                            <StatsItem>
                                <StatsLabel>Tổng số cuộc họp :</StatsLabel>
                                <StatsValue>20</StatsValue>
                            </StatsItem>
                            <DividerStats>|</DividerStats>
                            <StatsItem>
                                <StatsLabel>Tổng số giờ sử dụng :</StatsLabel>
                                <StatsValue>90</StatsValue>
                            </StatsItem>
                        </StatsRow>
                        <StatsRow>
                            <StatsItem>
                                <StatsLabel>Tỉ lệ sử dụng :</StatsLabel>
                                <StatsValue>30 %</StatsValue>
                            </StatsItem>
                            <DividerStats>|</DividerStats>
                            <StatsItem>
                                <StatsLabel>Cuộc họp trung bình/ ngày :</StatsLabel>
                                <StatsValueRed>10</StatsValueRed>
                            </StatsItem>
                        </StatsRow>
                    </StatsBox> */}
                {/* </FooterSection> */}
                <FooterSection>
                    <LegendGrid>
                        <LegendItem><LegendBox edgeColor={MEETING_STATUS_STYLES.DU_KIEN.color} /> {MEETING_STATUS_STYLES.DU_KIEN.label}</LegendItem>
                        <LegendItem><LegendBox edgeColor={MEETING_STATUS_STYLES.DANG_HOP.color} /> {MEETING_STATUS_STYLES.DANG_HOP.label}</LegendItem>
                        <LegendItem><LegendBox edgeColor={MEETING_STATUS_STYLES.DA_HUY.color} /> {MEETING_STATUS_STYLES.DA_HUY.label}</LegendItem>
                        <LegendItem><LegendBox edgeColor={MEETING_STATUS_STYLES.CHUAN_BI.color} /> {MEETING_STATUS_STYLES.CHUAN_BI.label}</LegendItem>
                        <LegendItem><LegendBox edgeColor={MEETING_STATUS_STYLES.KET_THUC.color} /> {MEETING_STATUS_STYLES.KET_THUC.label}</LegendItem>
                    </LegendGrid>
                </FooterSection>
            </Footer>
        </Container>
    );

    return calendarContent;
};

export default MeetingScheduleCalendar;