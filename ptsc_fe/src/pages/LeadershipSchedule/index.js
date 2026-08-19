import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { unwrapResult } from '@reduxjs/toolkit';
// import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { fetchLeadershipSchedule, fetchLeadershipScheduleNotes } from '@redux/slices/LeadershipSchedule/LeadershipScheduleSlice';
import {
    alpha,
    styled,
    // alpha,
    // useTheme
} from '@mui/material/styles';
import { Box, ToggleButton, ToggleButtonGroup, Select, MenuItem, Tooltip, Menu, Avatar } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

// Import them Icon moi
import {
    // ListAlt, 
    // CalendarToday, 
    // FileDownload, 
    // Add,
    Dehaze,
    Fullscreen,
    FullscreenExit,
    Person,
} from '@mui/icons-material';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { SkyBox, SkyButton } from '@styles/SkyStyles';
import Loading from '@components/Loading/Loading';
import LeadershipScheduleList from '@pages/LeadershipScheduleList';
import { getComponentByKey } from '@builder-table/components/componentRegistry';
import { openDetailDialog } from '@components/GlobalDialogPortal';
import withSharedComponents from '@components/WrapperComponent';
import { useToast } from '@components/common/ToastProvider';

const logger = console;

const SmallCalendarIcon = styled(CalendarTodayIcon)({ fontSize: '1.25rem' });
const SmallListIcon = styled(FormatListBulletedIcon)({ fontSize: '1.25rem' });

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.locale('vi');

// ==========================================
// STYLED COMPONENTS (CAP NHAT MAU SAC & ICON)
// ==========================================

const Container = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isFullScreen',
})(({ theme, isFullScreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxSizing: 'border-box',
    background: theme.palette.background.paper,
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.07)',
    padding: '6px 0 0 0',
    ...(isFullScreen && {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        borderRadius: 0,
        padding: '18px',
        overflow: 'auto'
    })
}));

const NavBar = styled(SkyBox)(({ theme }) => ({
    padding: '2px 20px 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    minHeight: '42px',
    backgroundColor: theme.palette.background.paper,
    marginBottom: '4px',
}));

// Nut chuc nang vuong xanh dam (Phong to, Xuat file)
const ActionIconButton = styled(SkyButton)(({ theme }) => ({
    minWidth: "40px",
    width: "40px",
    height: "40px",
    padding: 0,
    borderRadius: "8px",
    backgroundColor: theme.palette.mode === "dark" ? "#2d3748" : "#ffffff",
    color: "#5A6573",
    border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "#d0d5dd"}`,
    boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
    "&:hover": {
        backgroundColor: theme.palette.mode === "dark" ? "#3d4a5c" : "#f5f7fa",
        color: "#3a4450",
        border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "#b0b8c4"}`,
    },
    "& svg": {
        color: "#5A6573",
        fill: "#5A6573",
    },
}));

// const AddButton = styled(SkyButton)(({ theme }) => ({
//     height: '39px',
//     minWidth: '120px',
//     borderRadius: '10px',
//     backgroundColor: theme.palette.primary.main,
//     color: theme.palette.primary.contrastText,
//     border: `1px solid ${theme.palette.primary.main}`,
//     textTransform: 'none',
//     fontSize: theme.typography.body1.fontSize,
//     fontWeight: 500,
//     lineHeight: '24px',
//     display: 'inline-flex',
//     gap: '8px',
//     padding: '0 16px',
//     boxShadow: 'none',
//     '&:hover': {
//         backgroundColor: theme.palette.primary.dark,
//         borderColor: theme.palette.primary.dark,
//         boxShadow: 'none',
//     },
//     '& .MuiButton-startIcon': {
//         marginRight: 0,
//     },
//     '& svg': {
//         fontSize: '1rem',
//     },
// }));


// Style cho Toggle Group (Nut Lich/Danh sach)
const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
    height: '39px',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '10px',
    overflow: 'hidden',
    '& .MuiToggleButton-root': {
        width: '39px',
        height: '39px',
        border: 'none',
        borderRadius: 0,
        color: theme.palette.primary.main,
        '&.Mui-selected': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': {
                backgroundColor: theme.palette.primary.light,
            }
        },
        '&:not(.Mui-selected):hover': {
            backgroundColor: theme.palette.action.hover,
            textDecoration: 'none',
        }
    }
}));

const SelectWrapper = styled(SkyBox)(() => ({
    position: 'relative',
    minWidth: '145px',
    height: '39px',
}));

const SelectIconArea = styled(SkyBox)(({ theme }) => ({
    position: 'absolute',
    top: '1px',
    right: '1px',
    width: '42px',
    height: 'calc(100% - 2px)',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    zIndex: 2,
    overflow: 'hidden',
    borderTopRightRadius: '9px',
    borderBottomRightRadius: '9px',
}));

const SelectChevron = styled('span')(({ theme }) => ({
    width: '7px',
    height: '7px',
    borderRight: `1.7px solid ${theme.palette.text.secondary}`,
    borderBottom: `1.7px solid ${theme.palette.text.secondary}`,
}));

const SelectChevronUp = styled(SelectChevron)({
    transform: 'rotate(225deg)',
});

const SelectChevronDown = styled(SelectChevron)({
    transform: 'rotate(45deg)',
});

const SelectStepButton = styled('button')(({ theme }) => ({
    width: '100%',
    flex: 1,
    padding: 0,
    border: 0,
    background: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    cursor: 'pointer',
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
    },
    '&:disabled': {
        cursor: 'not-allowed',
        opacity: 0.45,
    },
    '&:first-of-type': {
        alignItems: 'flex-end',
        paddingBottom: '2px',
    },
    '&:last-of-type': {
        alignItems: 'flex-start',
        paddingTop: '2px',
    },
}));

const SelectEmptyIcon = () => null;

const CustomSelect = styled(Select)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    minWidth: '145px',
    height: '39px',
    color: theme.palette.primary.main,
    borderRadius: '10px',
    '& .MuiSelect-select': {
        fontSize: theme.typography.body1.fontSize,
        fontWeight: 500,
        lineHeight: '24px',
        paddingTop: '8px',
        paddingRight: '46px',
        paddingBottom: '8px',
        paddingLeft: '16px',
        color: theme.palette.primary.main,
    },
    '.MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[400],
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.text.secondary,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: '1px',
    },
    '& .MuiSelect-icon': {
        top: 0,
        right: 0,
        transform: 'none',
    }
}));

const DateRangeLabel = styled('span')(({ theme }) => ({
    fontSize: theme.typography.body1.fontSize,
    fontWeight: 600,
    lineHeight: '24px',
    color: theme.palette.mode === 'light' ? '#5A6573' : theme.palette.text.secondary,
    marginRight: '16px',
    fontFamily: theme.typography.fontFamily,
}));

const TodayButton = styled(SkyButton)(({ theme }) => ({
    height: '39px',
    minWidth: '100px',
    borderRadius: '10px',
    textTransform: 'none',
    fontSize: theme.typography.body1.fontSize,
    fontWeight: 500,
    lineHeight: '24px',
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
    fontSize: theme.typography.body1.fontSize,
    lineHeight: '24px',
}));

const RightBox = styled(Box)(() => ({
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
}));

const CalendarScrollArea = styled('div', {
    shouldForwardProp: (prop) => prop !== 'isFullScreen',
})(({ theme, isFullScreen }) => ({
    width: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: isFullScreen ? 'calc(100vh - 120px)' : 'calc(100vh - 270px)',
    '& thead th': {
        position: 'sticky',
        top: 0,
        zIndex: 4,
        backgroundColor: theme.palette.mode === 'light' ? theme.palette.common.white : theme.palette.primary.main,
    },
}));

const TableWrapper = styled('div')(({ theme }) => ({
    width: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '10px',
    backgroundColor: theme.palette.background.paper
}));

const StyledTable = styled('table')({
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    tableLayout: 'fixed',
    '& tbody:last-of-type tr:last-of-type td': {
        borderBottom: 'none',
    },
});

const renderTableColumnGroup = () => (
    <colgroup>
        <col style={{ width: '20%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '28%' }} />
        <col style={{ width: '11%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '12%' }} />
    </colgroup>
);

const Th = styled('th')(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'light' ? theme.palette.common.white : theme.palette.primary.main,
    color: theme.palette.mode === 'light' ? theme.palette.text.primary : theme.palette.primary.contrastText,
    fontFamily: theme.typography.fontFamily,
    fontWeight: 600,
    textTransform: 'uppercase',
    padding: '0 10px',
    height: '48px',
    fontSize: theme.typography.caption.fontSize,
    lineHeight: '20px',
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    textAlign: 'left',
    verticalAlign: 'middle',
    '&:nth-of-type(1)': { width: '20%', paddingLeft: '48px' },
    '&:nth-of-type(2)': { width: '14%', textAlign: 'left' },
    '&:nth-of-type(3)': { width: '28%' },
    '&:nth-of-type(4)': { width: '11%' },
    '&:nth-of-type(5)': { width: '15%' },
    '&:nth-of-type(6)': { width: '12%' },
}));

const mapDayOfWeek = (day) => {
    const days = {
        Monday: 'TH\u1ee8 HAI',
        Tuesday: 'TH\u1ee8 BA',
        Wednesday: 'TH\u1ee8 T\u01af',
        Thursday: 'TH\u1ee8 N\u0102M',
        Friday: 'TH\u1ee8 S\u00c1U',
        Saturday: 'TH\u1ee8 B\u1ea2Y',
        Sunday: 'CH\u1ee6 NH\u1eacT'
    };
    return days[day] || day;
};

// const DayHeaderRow = styled('tr')(({ theme }) => ({
//     backgroundColor:
//         theme.palette.mode === 'light'
//             ? alpha('#2196F3', 0.05)
//             : alpha(theme.palette.primary.main, 0.15),
// }));
// const DayHeaderRow = styled('tr')(({ theme }) => ({
//     backgroundColor: alpha(theme.palette.primary.main, 0.08),
// }));

const DayHeaderText = styled('td')(({ theme }) => ({
    height: '40px',
    padding: '0 48px',
    backgroundColor: alpha('#2196F3', 0.05),
    fontFamily: theme.typography.fontFamily,
    fontWeight: 600,
    color: theme.palette.primary.main,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: '20px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${theme.palette.divider}`,
}));

const LeaderNameCell = styled('td')(({ theme }) => ({
    fontWeight: 'bold',
    fontSize: theme.typography.body2.fontSize,
    lineHeight: '22px',
    textAlign: 'center',
    verticalAlign: 'middle',
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: `1px solid ${theme.palette.divider}`,
    padding: '12px 10px',
    width: '20%',
    wordWrap: 'break-word',
    color: theme.palette.text.primary,
}));

const DataCell = styled('td')(({ theme }) => ({
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    padding: '20px 10px',
    fontSize: theme.typography.body2.fontSize,
    lineHeight: '22px',
    fontWeight: 400,
    verticalAlign: 'middle',
    color: theme.palette.text.primary,
    wordBreak: 'break-word',
    wordWrap: 'break-word',
    overflowWrap: 'anywhere',
}));


const EmptyScheduleDataCell = styled(DataCell)({
    textAlign: 'left',
    fontStyle: 'italic',
    color: '#888',
    padding: '10px 10px 10px 30px',
    fontSize: '13px',
    fontFamily: 'Roboto, sans-serif',
});

const ChairmanBox = styled(SkyBox)(({ theme }) => ({
    textAlign: 'left',
    '& .position': { fontSize: theme.typography.body2.fontSize, lineHeight: '22px', fontWeight: 400, color: theme.palette.text.secondary },
    '& .name': { fontSize: theme.typography.body2.fontSize, lineHeight: '22px', fontWeight: 500, color: theme.palette.text.primary }
}));

const LeaderIdentity = styled(Box)(() => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    minHeight: '100%',
    textAlign: 'center',
}));
const DefaultLeaderAvatar = styled(Avatar)(({ theme }) => ({
    width: 40,
    height: 40,
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    color: theme.palette.primary.main,
    border: `1px solid ${theme.palette.divider}`,
}));
const LeaderName = styled('div')(({ theme }) => ({
    fontSize: theme.typography.body2.fontSize,
    lineHeight: '22px',
    fontWeight: 500,
    color: theme.palette.text.primary,
    maxWidth: '100%',
    wordBreak: 'break-word',
}));
const LeaderTitle = styled('div')(({ theme }) => ({
    fontSize: theme.typography.body2.fontSize,
    lineHeight: '22px',
    fontWeight: 400,
    color: theme.palette.text.secondary,
    maxWidth: '100%',
    wordBreak: 'break-word',
}));
const TimeText = styled('div')(({ theme }) => ({
    fontSize: theme.typography.body2.fontSize,
    lineHeight: '22px',
    fontWeight: 600,
    color: theme.palette.primary.main,
    letterSpacing: '0.4px',
}));
const UiNameText = styled('div')(({ theme }) => ({
    fontSize: theme.typography.body2.fontSize,
    lineHeight: '22px',
    fontWeight: 600,
    color: '#2364B0',
    maxWidth: '100%',
    wordBreak: 'break-word',
}));
const UiTitleText = styled('div')(({ theme }) => ({
    fontSize: theme.typography.body2.fontSize,
    lineHeight: '22px',
    fontWeight: 400,
    color: theme.palette.text.secondary,
    maxWidth: '100%',
    wordBreak: 'break-word',
}));
const fallbackTitleFromLeader = (leaderValue) => {
    if (!leaderValue || typeof leaderValue !== 'string') return '';
    const parts = leaderValue.split('-').map((s) => s.trim()).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(' - ') : '';
};
const formatTimeForUi = (raw) => {
    if (!raw) return '';
    const t = String(raw).trim();
    return t.includes(':') ? t.replace(':', ' : ') : t;
};

const formatDateWithCustomMonth = (dateStr) => {
    if (!dateStr) return '';
    const d = dayjs(dateStr);
    const month = d.month() + 1;
    if (month >= 3 && month <= 9) {
        return d.format('DD/M/YYYY');
    }
    return d.format('DD/MM/YYYY');
};

const getDutyLeaderName = (dayItem) =>
    dayItem?.dutyLeader?.name || dayItem?.userName || 'Chưa phân công';

const getDutyLeaderTitle = (dayItem) => {
    if (dayItem?.dutyLeader?.title) return dayItem.dutyLeader.title;
    return dayItem?.isAssigned ? 'Trực chỉ huy / Giám đốc' : 'Chưa phân công trực';
};
const getDutyLeaderDisplay = (dayItem) => ({
    name: getDutyLeaderName(dayItem),
    title:
        dayItem?.dutyLeader?.title ||
        dayItem?.leaderPosition ||
        dayItem?.leaderTitle ||
        (dayItem?.isAssigned ? '' : 'Chưa phân công trực'),
});
const getChairmanDisplay = (meeting, dayItem) => ({
    name:
        meeting?.chairman?.name ||
        meeting?.leader ||
        dayItem?.dutyLeader?.name ||
        dayItem?.userName ||
        '',
    title:
        meeting?.chairman?.title ||
        meeting?.chairman?.position ||
        fallbackTitleFromLeader(meeting?.leader) ||
        dayItem?.dutyLeader?.title ||
        dayItem?.leaderPosition ||
        dayItem?.leaderTitle ||
        '',
});

const getDateByIsoWeekYear = (isoWeekYear, isoWeek) =>
    dayjs(`${isoWeekYear}-01-04`).startOf('isoWeek').add(Number(isoWeek) - 1, 'week');



const NoteCell = styled('td')(({ theme }) => ({
    borderBottom: 'none',
    borderTop: `1px solid ${theme.palette.divider}`,
    borderLeft: 'none',
    borderRight: 'none',
    padding: '15px',
    backgroundColor:
        theme.palette.mode === 'light'
            ? theme.palette.common.white
            : theme.palette.action.hover,
    fontSize: theme.typography.body2.fontSize,
    lineHeight: '1.6',
    color: theme.palette.text.primary,
}));

const NoteContainer = styled('div')({
    display: 'flex',
    gap: '5px',
});

const NoteLabel = styled('span')(({ theme }) => ({
    fontSize: theme.typography.body2.fontSize,
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    minWidth: '70px',
}));

// const EmptyScheduleCell = styled('td')(({ theme }) => ({
//     textAlign: 'left',
//     fontStyle: 'italic',
//     color: theme.palette.text.secondary,
//     padding: '10px 10px 10px 30px',
//     border: `1px solid ${theme.palette.divider}`,
//     fontSize: theme.typography.body2.fontSize,
//     lineHeight: '22px',
//     fontFamily: theme.typography.fontFamily,
// }));

// ==========================================
// NEW STYLED COMPONENTS
// ==========================================
const ActionMenuIcon = styled(Dehaze)(({ theme }) => ({
    color: theme.palette.primary.main,
    borderRadius: '4px',
    padding: '5px',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    transition: 'all 0.2s',
    '&:hover': {
        filter: 'brightness(0.9)',
    }
}));

const ContentStyle = styled(SkyBox)(() => ({
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
}));

// ==========================================
// MAIN COMPONENT
// ==========================================

const LeadershipSchedule = (props) => {
    // const theme = useTheme();
    const dispatch = useDispatch();
    const toast = useToast();
    const { data: scheduleData, loading: isLoading, notes } = useSelector((state) => state.leadershipSchedule);
    const { crmSource } = useSelector((state) => state.config);

    const weekOptions = useMemo(
        () => crmSource?.find((item) => item.code === "WEEK")?.data || [],
        [crmSource]
    );
    const monthOptions = useMemo(
        () => crmSource?.find((item) => item.code === "MONTH")?.data || [],
        [crmSource]
    );
    const yearOptions = useMemo(
        () => crmSource?.find((item) => item.code === "YEAR")?.data || [],
        [crmSource]
    );
    const weekOptionValues = useMemo(
        () => weekOptions.map((item) => Number(item.value)).filter(Number.isFinite).sort((a, b) => a - b),
        [weekOptions]
    );
    const yearOptionValues = useMemo(
        () => yearOptions.map((item) => Number(item.value)).filter(Number.isFinite).sort((a, b) => a - b),
        [yearOptions]
    );
    const monthOptionValues = useMemo(
        () => monthOptions.map((item) => Number(item.value)).filter(Number.isFinite).sort((a, b) => a - b),
        [monthOptions]
    );

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('calendar');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);

    const [selectedWeeks, setSelectedWeeks] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState(null);
    // State render hidden data rieng de dam bao moi lan loop export data deu moi
    const [exportData, setExportData] = useState([]);
    const [exportNotes, setExportNotes] = useState([]);

    const handleOpenMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const toggleFullScreen = useCallback(() => {
        setIsFullScreen((prev) => !prev);
    }, []);

    useEffect(() => {
        if (currentView !== 'calendar' && isFullScreen) {
            setIsFullScreen(false);
        }
    }, [currentView, isFullScreen]);

    useEffect(() => {
        if (!isFullScreen) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsFullScreen(false);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFullScreen]);

    const handleSetToday = useCallback(() => setCurrentDate(new Date()), []);

    const fetchData = useCallback(async () => {
        if (currentView !== 'calendar') return;
        const weekNum = dayjs(currentDate).isoWeek();
        const isoYear = dayjs(currentDate).isoWeekYear();
        dispatch(fetchLeadershipSchedule({
            page: 1,
            limit: 25,
            type: 'grid',
            processFn: props.fnCode,
            'selectweek': weekNum,
            'year': isoYear,
        }));

        const startOfWeek = dayjs(currentDate).startOf('isoWeek').format('YYYY-MM-DD');
        const endOfWeek = dayjs(currentDate).endOf('isoWeek').format('YYYY-MM-DD');

        dispatch(fetchLeadershipScheduleNotes({
            page: 1,
            limit: 25,
            'filter[fromDate]': startOfWeek,
            'filter[toDate]': endOfWeek
        }));
    }, [currentDate, dispatch, props.fnCode, currentView]);


    useEffect(() => { fetchData(); }, [fetchData]);

    const handleMeetingClick = useCallback(async (meeting) => {
        let meetingId = meeting?.meetingId || meeting?._id || meeting?.id;

        // if (!meetingId) {
        //     const currentDate = dayItem?.date;
        //     if (currentDate) {
        //         try {
        //             const response = await axiosInstance.get(`/api/meetings/add-meeting-schedule?type=day&filter[currentDate]=${currentDate}`);
        //             if (response && response.items) {
        //                 const matched = response.items.find(item => {
        //                     const cleanItemTitle = String(item.title || "").toLowerCase().trim();
        //                     const cleanMeetingContent = String(meeting.content || "").toLowerCase().trim();

        //                     const titleMatch = cleanItemTitle === cleanMeetingContent ||
        //                         cleanItemTitle.includes(cleanMeetingContent) ||
        //                         cleanMeetingContent.includes(cleanItemTitle);

        //                     const itemTime = String(item.meetingTime || "").replace(/\s+/g, "");
        //                     const meetingTime = String(meeting.time || "").replace(/\s+/g, "");
        //                     const timeMatch = itemTime.startsWith(meetingTime);

        //                     return titleMatch && timeMatch;
        //                 });
        //                 if (matched) {
        //                     meetingId = matched.id || matched._id;
        //                 }
        //             }
        //         } catch (error) {
        //             logger.error("Error fetching meeting ID:", error);
        //         }
        //     }
        // }

        if (!meetingId) {
            // toast("Không tìm thấy ID cuộc họp!", "error");
            return;
        }

        const componentInfo = getComponentByKey('UPDATE_MEETING_ROOM');
        if (!componentInfo) {
            toast("Không tìm thấy component UPDATE_MEETING_ROOM", "error");
            return;
        }

        openDetailDialog({
            ...componentInfo,
            defaultProps: {
                ...componentInfo.defaultProps,
                setReloadData: fetchData,
            },
        }, meetingId, { sharedComponents: props.sharedComponents });
    }, [fetchData, props.sharedComponents, toast]);

    const onMeetingClick = useCallback((meeting) => () => {
        handleMeetingClick(meeting);
    }, [handleMeetingClick]);

    const scheduleItems = useMemo(() => scheduleData?.items || [], [scheduleData]);

    const setDateByWeek = useCallback((weekNumber) => {
        setCurrentDate(dayjs(currentDate).isoWeek(weekNumber).toDate());
    }, [currentDate]);

    const handleWeekChange = useCallback((e) => {
        setDateByWeek(Number(e.target.value));
    }, [setDateByWeek]);

    const handleMonthChange = useCallback((e) => {
        setCurrentDate(dayjs(currentDate).month(e.target.value - 1).toDate());
    }, [currentDate]);

    const handleListYearChange = useCallback((e) => {
        setCurrentDate(dayjs(currentDate).year(Number(e.target.value)).toDate());
    }, [currentDate]);

    const setDateByYear = useCallback((selectedIsoYear) => {
        const currentIsoWeek = dayjs(currentDate).isoWeek();
        setCurrentDate(getDateByIsoWeekYear(selectedIsoYear, currentIsoWeek).toDate());
    }, [currentDate]);

    const handleYearChange = useCallback((e) => {
        setDateByYear(Number(e.target.value));
    }, [setDateByYear]);

    const handleSelectStepMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const selectedCalendarWeek = dayjs(currentDate).isoWeek();
    const selectedCalendarYear = dayjs(currentDate).isoWeekYear();

    const handleIncreaseWeek = useCallback(() => {
        const currentIndex = weekOptionValues.indexOf(selectedCalendarWeek);
        const nextWeek = currentIndex >= 0 ? weekOptionValues[currentIndex + 1] : selectedCalendarWeek + 1;
        if (nextWeek) {
            setDateByWeek(nextWeek);
        }
    }, [selectedCalendarWeek, weekOptionValues, setDateByWeek]);

    const handleDecreaseWeek = useCallback(() => {
        const currentIndex = weekOptionValues.indexOf(selectedCalendarWeek);
        const nextWeek = currentIndex >= 0 ? weekOptionValues[currentIndex - 1] : selectedCalendarWeek - 1;
        if (nextWeek) {
            setDateByWeek(nextWeek);
        }
    }, [selectedCalendarWeek, weekOptionValues, setDateByWeek]);

    const handleIncreaseYear = useCallback(() => {
        const currentIndex = yearOptionValues.indexOf(selectedCalendarYear);
        const nextYear = currentIndex >= 0 ? yearOptionValues[currentIndex + 1] : selectedCalendarYear + 1;
        if (nextYear) {
            setDateByYear(nextYear);
        }
    }, [selectedCalendarYear, yearOptionValues, setDateByYear]);

    const handleDecreaseYear = useCallback(() => {
        const currentIndex = yearOptionValues.indexOf(selectedCalendarYear);
        const nextYear = currentIndex >= 0 ? yearOptionValues[currentIndex - 1] : selectedCalendarYear - 1;
        if (nextYear) {
            setDateByYear(nextYear);
        }
    }, [selectedCalendarYear, yearOptionValues, setDateByYear]);

    const selectedListMonth = dayjs(currentDate).month() + 1;
    const selectedListYear = dayjs(currentDate).year();

    const handleIncreaseListMonth = useCallback(() => {
        const currentIndex = monthOptionValues.indexOf(selectedListMonth);
        const nextMonth = currentIndex >= 0 ? monthOptionValues[currentIndex + 1] : selectedListMonth + 1;
        if (nextMonth) {
            setCurrentDate(dayjs(currentDate).month(nextMonth - 1).toDate());
        }
    }, [currentDate, monthOptionValues, selectedListMonth]);

    const handleDecreaseListMonth = useCallback(() => {
        const currentIndex = monthOptionValues.indexOf(selectedListMonth);
        const nextMonth = currentIndex >= 0 ? monthOptionValues[currentIndex - 1] : selectedListMonth - 1;
        if (nextMonth) {
            setCurrentDate(dayjs(currentDate).month(nextMonth - 1).toDate());
        }
    }, [currentDate, monthOptionValues, selectedListMonth]);

    const handleIncreaseListYear = useCallback(() => {
        const currentIndex = yearOptionValues.indexOf(selectedListYear);
        const nextYear = currentIndex >= 0 ? yearOptionValues[currentIndex + 1] : selectedListYear + 1;
        if (nextYear) {
            setCurrentDate(dayjs(currentDate).year(nextYear).toDate());
        }
    }, [currentDate, selectedListYear, yearOptionValues]);

    const handleDecreaseListYear = useCallback(() => {
        const currentIndex = yearOptionValues.indexOf(selectedListYear);
        const nextYear = currentIndex >= 0 ? yearOptionValues[currentIndex - 1] : selectedListYear - 1;
        if (nextYear) {
            setCurrentDate(dayjs(currentDate).year(nextYear).toDate());
        }
    }, [currentDate, selectedListYear, yearOptionValues]);

    const handleViewChange = useCallback((e, v) => {
        if (v) setCurrentView(v);
    }, []);

    // Logic xuat Excel ho tro mau sac
    const processExportExcel = useCallback((fileName = "Lich_truc_lanh_dao.xls", tableId = 'leadership-schedule-table-export', htmlContent = null) => {
        const table = document.getElementById(tableId);
        if (!table && !htmlContent) return;

        const content = htmlContent || table.outerHTML;

        // Excel-compatible HTML template with styles
        const template = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Lịch trực lãnh đạo</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    body { margin: 0; padding: 12px; background: #ffffff; }
                    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
                    th, td { font-family: "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; color: #0f172a; vertical-align: middle; }
                    th {
                        background-color: #ffffff !important;
                        color: #0f172a !important;
                        font-weight: 700;
                        text-transform: uppercase;
                        text-align: left;
                        height: 72px;
                        padding: 0 10px;
                        border-top: none;
                        border-left: none;
                        border-right: none;
                        border-bottom: 1px solid #D6E2F0;
                    }
                    th:nth-child(1) { padding-left: 32px; }
                    th:nth-child(2) { text-align: center; }
                    .excel-day-header {
                        background-color: #EFF7FF !important;
                        color: #0B66C3 !important;
                        font-weight: 700;
                        font-size: 13px;
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                        padding: 14px 20px;
                        border-top: none;
                        border-left: none;
                        border-right: none;
                        border-bottom: 1px solid #DCEAF7;
                    }
                    .excel-leader-cell {
                        text-align: center;
                        border-top: none;
                        border-left: none;
                        border-right: 1px solid #E2E8F0;
                        border-bottom: 1px solid #E2E8F0;
                        padding: 14px 10px;
                    }
                    .excel-leader-badge {
                        width: 28px;
                        height: 28px;
                        line-height: 28px;
                        margin: 0 auto 8px;
                        border-radius: 50%;
                        background-color: #E6F1FC;
                        color: #0B66C3;
                        font-weight: 700;
                        font-size: 14px;
                        text-align: center;
                    }
                    .excel-leader-name { color: #0f172a !important; font-weight: 600; font-size: 13px; line-height: 18px; }
                    .excel-leader-title { color: #475569 !important; font-size: 12px; line-height: 18px; margin-top: 3px; }
                    .excel-data-cell {
                        border-top: none;
                        border-left: none;
                        border-right: none;
                        border-bottom: 1px solid #E2E8F0;
                        padding: 16px 10px;
                        color: #0f172a;
                        line-height: 18px;
                    }
                    .excel-center-cell { text-align: center; }
                    .excel-time {
                        color: #0B66C3 !important;
                        font-weight: 700;
                        font-size: 13px;
                        letter-spacing: 0.3px;
                    }
                    .excel-empty-cell {
                        color: #7C8798 !important;
                        font-style: italic;
                        padding-left: 18px;
                    }
                    .excel-chairman-title { color: #475569 !important; font-size: 12px; line-height: 18px; }
                    .excel-chairman-name { color: #0f172a !important; font-size: 12px; line-height: 18px; font-weight: 600; }
                    .excel-note-cell {
                        background-color: #ffffff !important;
                        border-top: 1px solid #D6E2F0;
                        border-left: none;
                        border-right: none;
                        border-bottom: none;
                        padding: 14px 12px;
                    }
                    .excel-note-label { font-weight: 700; color: #0B66C3 !important; }
                    .excel-note-text { color: #0f172a !important; line-height: 20px; }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;

        const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.endsWith('.xls') ? fileName : fileName.replace('.xlsx', '.xls');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    const processExportPdf = useCallback(async (fileName = "Lich_truc_chi_huy.pdf", containerId = 'leadership-schedule-pdf-export') => {
        const sourceContainer = document.getElementById(containerId);
        if (!sourceContainer) return;

        const exportContainer = sourceContainer.cloneNode(true);
        exportContainer.id = `${containerId}-clone`;
        exportContainer.style.position = 'fixed';
        exportContainer.style.top = '0';
        exportContainer.style.left = '0';
        exportContainer.style.width = `${sourceContainer.scrollWidth}px`;
        exportContainer.style.backgroundColor = '#ffffff';
        exportContainer.style.padding = '0';
        exportContainer.style.pointerEvents = 'none';
        exportContainer.style.zIndex = '-1';
        exportContainer.style.transform = 'translateX(-200vw)';
        exportContainer.style.overflow = 'visible';

        const stagingRoot = document.createElement('div');
        stagingRoot.id = `${containerId}-staging`;
        stagingRoot.style.position = 'fixed';
        stagingRoot.style.top = '0';
        stagingRoot.style.left = '0';
        stagingRoot.style.width = `${sourceContainer.scrollWidth}px`;
        stagingRoot.style.backgroundColor = '#ffffff';
        stagingRoot.style.pointerEvents = 'none';
        stagingRoot.style.zIndex = '-1';
        stagingRoot.style.transform = 'translateX(-400vw)';
        stagingRoot.style.overflow = 'visible';

        const createStandaloneTableWithColgroup = (sectionNode, tagName) => {
            const wrapper = document.createElement('div');
            wrapper.style.width = `${sourceContainer.scrollWidth}px`;
            wrapper.style.backgroundColor = '#ffffff';
            wrapper.style.overflow = 'visible';

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.tableLayout = 'fixed';
            table.style.backgroundColor = '#ffffff';

            const colgroup = document.createElement('colgroup');
            ['20%', '14%', '28%', '11%', '15%', '12%'].forEach((width) => {
                const col = document.createElement('col');
                col.style.width = width;
                colgroup.appendChild(col);
            });
            table.appendChild(colgroup);

            const section = document.createElement(tagName);
            section.innerHTML = sectionNode.innerHTML;
            if (sectionNode.getAttribute('data-export-block')) {
                section.setAttribute('data-export-block', sectionNode.getAttribute('data-export-block'));
            }
            table.appendChild(section);
            wrapper.appendChild(table);
            return wrapper;
        };

        const captureNode = async (node) => html2canvas(node, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: sourceContainer.scrollWidth,
            width: sourceContainer.scrollWidth,
            height: node.scrollHeight,
            onclone: (clonedDoc) => {
                const clonedContainer = clonedDoc.body;
                if (!clonedContainer) return;
                const allElements = clonedContainer.querySelectorAll('*');
                allElements.forEach((element) => {
                    element.style.transform = 'none';
                    element.style.maxHeight = 'none';
                });
            }
        });

        document.body.appendChild(exportContainer);
        document.body.appendChild(stagingRoot);

        try {
            const pageWidth = 297;
            const pageHeight = 210;
            const margin = 8;
            const printableWidth = pageWidth - (margin * 2);
            const printableHeight = pageHeight - (margin * 2);
            const pdf = new jsPDF('l', 'mm', 'a4');
            const headerNode = exportContainer.querySelector('thead');
            const blockNodes = Array.from(exportContainer.querySelectorAll('[data-export-block]'));
            let cursorY = margin;
            let isFirstPage = true;
            // let headerCanvasHeightMm = 0;

            const appendHeader = async (includeHeader = true) => {
                if (!includeHeader || !headerNode) {
                    if (!isFirstPage) {
                        pdf.addPage();
                    }
                    cursorY = margin;
                    isFirstPage = false;
                    return;
                }

                if (!headerNode) return;
                const headerWrapper = createStandaloneTableWithColgroup(headerNode, 'thead');
                stagingRoot.appendChild(headerWrapper);
                const headerCanvas = await captureNode(headerWrapper);
                stagingRoot.removeChild(headerWrapper);

                const headerHeightMm = (headerCanvas.height * printableWidth) / headerCanvas.width;
                if (!isFirstPage) {
                    pdf.addPage();
                }
                pdf.addImage(headerCanvas.toDataURL('image/png'), 'PNG', margin, margin, printableWidth, headerHeightMm, undefined, 'FAST');
                cursorY = margin + headerHeightMm;
                // headerCanvasHeightMm = headerHeightMm;
                isFirstPage = false;
            };

            await appendHeader(true);

            for (const blockNode of blockNodes) {
                const blockWrapper = createStandaloneTableWithColgroup(
                    blockNode,
                    blockNode.tagName.toLowerCase() === 'thead' ? 'thead' : 'tbody'
                );
                stagingRoot.appendChild(blockWrapper);
                const blockCanvas = await captureNode(blockWrapper);
                stagingRoot.removeChild(blockWrapper);

                const blockHeightMm = (blockCanvas.height * printableWidth) / blockCanvas.width;

                if (cursorY + blockHeightMm > margin + printableHeight) {
                    await appendHeader(false);
                }

                pdf.addImage(blockCanvas.toDataURL('image/png'), 'PNG', margin, cursorY, printableWidth, blockHeightMm, undefined, 'FAST');
                cursorY += blockHeightMm;
            }

            pdf.save(fileName);
        } catch (error) {
            // console.error("PDF export failed", error);
        } finally {
            document.body.removeChild(exportContainer);
            document.body.removeChild(stagingRoot);
        }
    }, []);

    // Export current calendar view
    const handleExportCurrentView = useCallback(async (type) => {
        handleCloseMenu();
        setIsExporting(true);
        setExportFormat(type);
        setExportData(scheduleItems);
        setExportNotes(notes || []);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            if (type === 'excel') {
                processExportExcel("Lịch lãnh đạo.xls", 'leadership-schedule-table-export');
            } else {
                await processExportPdf("Lịch lãnh đạo.pdf", 'leadership-schedule-pdf-export');
            }
        } finally {
            setIsExporting(false);
            setExportFormat(null);
            setExportData([]);
            setExportNotes([]);
        }
    }, [notes, processExportExcel, processExportPdf, scheduleItems]);


    // Export list view by fetching each selected week
    const handleExport = useCallback(async (type) => {
        handleCloseMenu();

        if (currentView === 'calendar') {
            handleExportCurrentView(type);
        } else {
            // View List: export Loop
            if (!selectedWeeks || selectedWeeks.length === 0) return;

            setIsExporting(true);
            setExportFormat(type);

            try {
                for (const weekInfo of selectedWeeks) {
                    // Fetch du lieu cua tuan
                    const resultAction = await dispatch(fetchLeadershipSchedule({
                        page: 1,
                        limit: 25,
                        type: 'grid',
                        processFn: props.fnCode,
                        'selectweek': weekInfo.week,
                        'year': weekInfo.year,
                    }));
                    const res = unwrapResult(resultAction);
                    setExportData(res?.items || []);

                    // Fetch notes
                    const d = dayjs().year(weekInfo.year).isoWeek(weekInfo.week);
                    const startOfWeek = d.startOf('isoWeek').format('YYYY-MM-DD');
                    const endOfWeek = d.endOf('isoWeek').format('YYYY-MM-DD');

                    const noteAction = await dispatch(fetchLeadershipScheduleNotes({
                        page: 1,
                        limit: 25,
                        'filter[fromDate]': startOfWeek,
                        'filter[toDate]': endOfWeek
                    }));
                    const noteRes = unwrapResult(noteAction);
                    setExportNotes(noteRes || []);

                    // Wait for render
                    await new Promise(resolve => setTimeout(resolve, 800));

                    const fileName = `Lịch lãnh đạo tuần ${weekInfo.week} năm ${weekInfo.year}.${type === 'excel' ? 'xls' : 'pdf'}`;

                    if (type === 'excel') processExportExcel(fileName, 'leadership-schedule-table-export');
                    else await processExportPdf(fileName, 'leadership-schedule-pdf-export');
                }
            } catch (error) {
                // console.error("Export error:", error);
            } finally {
                setIsExporting(false);
                setExportFormat(null);
                setExportData([]); // Clear
                setExportNotes([]);
            }
        }
    }, [currentView, selectedWeeks, dispatch, props.fnCode, processExportExcel, processExportPdf, handleExportCurrentView]);

    // ...

    // const formatDayHeader = (dateStr, dayOfWeek) => {
    //     const date = dayjs(dateStr).format('DD/MM/YYYY');
    //     const days = {
    //         'Monday': 'THU HAI', 'Tuesday': 'THU BA', 'Wednesday': 'THU TU',
    //         'Thursday': 'THU NAM', 'Friday': 'THU SAU', 'Saturday': 'THU BAY', 'Sunday': 'CHU NHAT'
    //     };
    //     return `${days[dayOfWeek] || dayOfWeek} (${date})`;
    // };

    // Callback handlers cho menu item
    const handleExportExcelClick = useCallback(() => {
        if (currentView === 'calendar') handleExportCurrentView('excel');
        else handleExport('excel');
    }, [currentView, handleExportCurrentView, handleExport]);

    const handleExportPdfClick = useCallback(() => {
        if (currentView === 'calendar') handleExportCurrentView('pdf');
        else handleExport('pdf');
    }, [currentView, handleExportCurrentView, handleExport]);


    // Callback khi chon dong tu danh sach tuan (Multiple)
    const handleSelectWeekFromList = useCallback((weeksArray) => {
        if (Array.isArray(weeksArray)) {
            setSelectedWeeks(weeksArray);
        }
    }, []);

    // Render Table Content Helper
    // Accepts `items` and `noteList` to render specific data (for hidden table)
    // Defaults to current view data if not provided
    // Render Table Content Helper
    // Accepts `items` and `noteList` to render specific data (for hidden table)
    // Defaults to current view data if not provided
    const renderTableContent = (items = scheduleItems, noteList = notes || [], tableId = "leadership-schedule-table", isExcelExport = false, showInlineNotes = true, isUiDisplay = true) => {
        if (isExcelExport) {
            const renderExcelLeaderCell = (dayItem, rowSpan = 1) => (
                <td className="excel-leader-cell" rowSpan={rowSpan}>
                    <div className="excel-leader-badge">&nbsp;</div>
                    <div className="excel-leader-name">{getDutyLeaderName(dayItem)}</div>
                    <div className="excel-leader-title">{getDutyLeaderTitle(dayItem)}</div>
                </td>
            );

            return (
                <table id={tableId} style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    {renderTableColumnGroup()}
                    <thead>
                        <tr>
                            <th>Trực chỉ huy</th>
                            <th>Thời gian</th>
                            <th>Tiêu đề</th>
                            <th>Địa điểm</th>
                            <th>Chủ trì</th>
                            <th>Tham gia</th>
                        </tr>
                    </thead>
                    {items.map((dayItem, dIdx) => (
                        <tbody key={dIdx} data-export-block="day">
                            <tr>
                                <td className="excel-day-header" colSpan={6}>
                                    {`${dayItem.dayOfWeekVi || mapDayOfWeek(dayItem.dayOfWeek)} (${formatDateWithCustomMonth(dayItem.date)})`}
                                </td>
                            </tr>

                            {(dayItem?.data?.length === 0 && (dayItem?.schedules?.length === 0 || !dayItem?.schedules)) ? (
                                <tr>
                                    {renderExcelLeaderCell(dayItem)}
                                    <td colSpan={5} className="excel-data-cell excel-empty-cell">
                                        Không có kế hoạch trong ngày
                                    </td>
                                </tr>
                            ) : (
                                (dayItem?.data || dayItem?.schedules || []).map((meeting, mIdx, meetings) => (
                                    <tr key={mIdx}>
                                        {mIdx === 0 && renderExcelLeaderCell(dayItem, meetings.length)}
                                        <td className="excel-data-cell excel-center-cell">
                                            <span className="excel-time">{formatTimeForUi(meeting.timeDisplay || meeting.time)}</span>
                                        </td>
                                        <td className="excel-data-cell">{meeting?.title}</td>
                                        <td className="excel-data-cell">{meeting.location}</td>
                                        <td className="excel-data-cell">
                                            <div className="excel-chairman-title">
                                                {meeting?.chairman?.title || fallbackTitleFromLeader(meeting?.leader) || 'Chức danh'}
                                            </div>
                                            <div className="excel-chairman-name">
                                                {meeting?.chairman?.name || meeting.leader}
                                            </div>
                                        </td>
                                        <td className="excel-data-cell">
                                            {Array.isArray(meeting?.participantList) && meeting.participantList.length > 0
                                                ? meeting.participantList.join('; ')
                                                : meeting.participant}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    ))}
                    <tbody data-export-block="note">
                        <tr>
                            <td className="excel-note-cell" colSpan={6}>
                                <div className="excel-note-label">GHI CHÚ:</div>
                                <div>
                                    {noteList.length > 0
                                        ? noteList.map((note, i) => <div key={i} className="excel-note-text">{note}</div>)
                                        : <div className="excel-note-text">Không có ghi chú</div>}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        }

        return (
            <StyledTable id={tableId}>
                {renderTableColumnGroup()}
                <thead>
                    <tr>
                        {isExcelExport ? (
                            <>
                                <th style={{ backgroundColor: '#2364B0', color: '#ffffff', textAlign: 'center', padding: '10px', border: '1px solid #E8ECF0' }}>Trực chỉ huy</th>
                                <th style={{ backgroundColor: '#2364B0', color: '#ffffff', textAlign: 'center', padding: '10px', border: '1px solid #E8ECF0' }}>Thời gian</th>
                                <th style={{ backgroundColor: '#2364B0', color: '#ffffff', textAlign: 'center', padding: '10px', border: '1px solid #E8ECF0' }}>Tiêu đề</th>
                                <th style={{ backgroundColor: '#2364B0', color: '#ffffff', textAlign: 'center', padding: '10px', border: '1px solid #E8ECF0' }}>Địa điểm</th>
                                <th style={{ backgroundColor: '#2364B0', color: '#ffffff', textAlign: 'center', padding: '10px', border: '1px solid #E8ECF0' }}>Chủ trì</th>
                                <th style={{ backgroundColor: '#2364B0', color: '#ffffff', textAlign: 'center', padding: '10px', border: '1px solid #E8ECF0' }}>Tham gia</th>
                            </>
                        ) : (
                            <>
                                <Th>Trực chỉ huy</Th>
                                <Th>Thời gian</Th>
                                <Th>Tiêu đề</Th>
                                <Th>Địa điểm</Th>
                                <Th>Chủ trì</Th>
                                <Th>Tham gia</Th>
                            </>
                        )}
                    </tr>
                </thead>
                {items.map((dayItem, dIdx) => {
                    const dutyLeaderDisplay = getDutyLeaderDisplay(dayItem);
                    return (
                        <tbody key={dIdx} data-export-block="day">
                            {/* Header ngày */}
                            <tr className="day-header-row">
                                {isExcelExport ? (
                                    <td
                                        className="day-header-text"
                                        colSpan={6}
                                        style={{
                                            background: '#2364B0',
                                            backgroundColor: '#2364B0',
                                            color: '#ffffff',
                                            fontWeight: 'bold',
                                            padding: '12px 20px',
                                            fontSize: '16px',
                                            textAlign: 'left',
                                            fontFamily: 'Arial, sans-serif'
                                        }}
                                    >
                                        <b style={{ color: '#ffffff' }}>
                                            {`${dayItem.dayOfWeekVi || mapDayOfWeek(dayItem.dayOfWeek)} (${formatDateWithCustomMonth(dayItem.date)})`}
                                        </b>
                                    </td>
                                ) : (
                                    <DayHeaderText colSpan={6}>
                                        {`${dayItem.dayOfWeekVi || mapDayOfWeek(dayItem.dayOfWeek)} (${formatDateWithCustomMonth(dayItem.date)})`}
                                    </DayHeaderText>
                                )}
                            </tr>

                            {/* Nếu không có lịch */}
                            {(dayItem?.data?.length === 0 && (dayItem?.schedules?.length === 0 || !dayItem?.schedules)) ? (
                                <tr>
                                    <LeaderNameCell>
                                        {isExcelExport ? (
                                            <div style={{ textAlign: 'center' }}>
                                                <div className="leader-name" style={{ fontWeight: 'bold', color: '#2364B0' }}>{getDutyLeaderName(dayItem)}</div>
                                                <div className="leader-title" style={{ fontSize: '11px', color: '#5A5F68' }}>{getDutyLeaderTitle(dayItem)}</div>
                                            </div>
                                        ) : isUiDisplay ? (
                                            <LeaderIdentity>
                                                <DefaultLeaderAvatar>
                                                    <Person />
                                                </DefaultLeaderAvatar>
                                                <UiNameText>{dutyLeaderDisplay.name}</UiNameText>
                                                <UiTitleText>{dutyLeaderDisplay.title || '\u00A0'}</UiTitleText>
                                            </LeaderIdentity>
                                        ) : (
                                            <LeaderIdentity>
                                                <DefaultLeaderAvatar>
                                                    <Person />
                                                </DefaultLeaderAvatar>
                                                <LeaderName>{getDutyLeaderName(dayItem)}</LeaderName>
                                                <LeaderTitle>{getDutyLeaderTitle(dayItem)}</LeaderTitle>
                                            </LeaderIdentity>
                                        )}
                                    </LeaderNameCell>
                                    {/* <EmptyScheduleCell colSpan={5}>
                                        <span>Không có lịch trong ngày</span>
                                    </EmptyScheduleCell> */}
                                    {isExcelExport ? (
                                        <td
                                            colSpan={5}
                                            style={{
                                                textAlign: 'left',
                                                padding: '15px 30px',
                                                border: '1px solid #e0e0e0',
                                                fontSize: '13px',
                                                color: '#888',
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            Không có kế hoạch trong ngày
                                        </td>
                                    ) : (
                                        <EmptyScheduleDataCell colSpan={5}>
                                            Không có kế hoạch trong ngày
                                        </EmptyScheduleDataCell>
                                    )}
                                </tr>
                            ) : (
                                /* Nếu có lịch */
                                (dayItem?.data || dayItem?.schedules || [])?.map((meeting, mIdx) => {
                                    const chairmanDisplay = getChairmanDisplay(meeting, dayItem);
                                    return (
                                        <tr key={mIdx}>
                                            {/* Cột Trực chỉ huy chỉ hiển thị 1 lần ở hàng đầu tiên của ngày */}
                                            {mIdx === 0 && (
                                                <LeaderNameCell rowSpan={(dayItem?.data || dayItem?.schedules || [])?.length}>
                                                    {isExcelExport ? (
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div className="leader-name" style={{ fontWeight: 'bold', color: '#2364B0' }}>{getDutyLeaderName(dayItem)}</div>
                                                            <div className="leader-title" style={{ fontSize: '11px', color: '#5A5F68' }}>{getDutyLeaderTitle(dayItem)}</div>
                                                        </div>
                                                    ) : isUiDisplay ? (
                                                        <LeaderIdentity>
                                                            <DefaultLeaderAvatar>
                                                                <Person />
                                                            </DefaultLeaderAvatar>
                                                            <UiNameText>{dutyLeaderDisplay.name}</UiNameText>
                                                            <UiTitleText>{dutyLeaderDisplay.title || '\u00A0'}</UiTitleText>
                                                        </LeaderIdentity>
                                                    ) : (
                                                        <LeaderIdentity>
                                                            <DefaultLeaderAvatar>
                                                                <Person />
                                                            </DefaultLeaderAvatar>
                                                            <LeaderName>{getDutyLeaderName(dayItem)}</LeaderName>
                                                            <LeaderTitle>{getDutyLeaderTitle(dayItem)}</LeaderTitle>
                                                        </LeaderIdentity>
                                                    )}
                                                </LeaderNameCell>
                                            )}
                                            {isExcelExport ? (
                                                <td className="time-text" style={{ color: '#2364B0', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #E8ECF0', padding: '10px' }}>
                                                    <TimeText>{formatTimeForUi(meeting.timeDisplay || meeting.time)}</TimeText>
                                                </td>
                                            ) : (
                                                <DataCell>
                                                    <TimeText>{formatTimeForUi(meeting.timeDisplay || meeting.time)}</TimeText>
                                                </DataCell>
                                            )}
                                            <DataCell>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                                                    {(() => {
                                                        const isDraft = meeting?.status === 'DU_KIEN' ||
                                                            meeting?.statusCode === 'DU_KIEN' ||
                                                            (typeof meeting?.meetingState === 'string' && meeting.meetingState.includes('Dự kiến'));
                                                        return (
                                                            <Tooltip title={meeting?.title || ""} placement="top" arrow>
                                                                <span
                                                                    style={{
                                                                        cursor: isDraft ? 'pointer' : 'default',
                                                                        color: isDraft ? '#2364B0' : 'inherit',
                                                                        textDecoration: 'none',
                                                                        textAlign: 'left',
                                                                        display: '-webkit-box',
                                                                        WebkitLineClamp: 3,
                                                                        WebkitBoxOrient: 'vertical',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        wordBreak: 'break-word',
                                                                        wordWrap: 'break-word',
                                                                        overflowWrap: 'anywhere',
                                                                        maxHeight: '66px',
                                                                        lineHeight: '22px'
                                                                    }}
                                                                    onClick={isDraft ? onMeetingClick(meeting) : undefined}
                                                                >
                                                                    {meeting?.title || ""}
                                                                </span>
                                                            </Tooltip>
                                                        );
                                                    })()}
                                                    {meeting?.meetingState && (
                                                        <div
                                                            dangerouslySetInnerHTML={{
                                                                __html: meeting.meetingState
                                                                    .replace(/width:\s*100%/gi, 'width: fit-content')
                                                                    .replace(/height:\s*30px/gi, 'height: 22px')
                                                                    .replace(/font-size:\s*14px/gi, 'font-size: 12px')
                                                                    .replace(/padding:\s*0\s*16px/gi, 'padding: 0 10px')
                                                                    .replace(/font-weight:\s*700/gi, 'font-weight: 500')
                                                            }}
                                                            style={{ display: 'inline-flex', justifyContent: 'flex-start', width: '100%' }}
                                                        />
                                                    )}
                                                </div>
                                            </DataCell>
                                            <DataCell>{meeting.location}</DataCell>
                                            <DataCell>
                                                {isUiDisplay ? (
                                                    <ChairmanBox>
                                                        <UiNameText>{chairmanDisplay.name}</UiNameText>
                                                        <UiTitleText>{chairmanDisplay.title || '\u00A0'}</UiTitleText>
                                                    </ChairmanBox>
                                                ) : (
                                                    <ChairmanBox>
                                                        <div className="position">
                                                            {meeting?.chairman?.title || fallbackTitleFromLeader(meeting?.leader) || 'Chức danh'}
                                                        </div>
                                                        <div className="name">
                                                            {meeting?.chairman?.name || meeting.leader}
                                                        </div>
                                                    </ChairmanBox>
                                                )}
                                            </DataCell>
                                            <DataCell>
                                                {Array.isArray(meeting?.participantList) && meeting.participantList.length > 0
                                                    ? meeting.participantList.join('; ')
                                                    : meeting.participant}
                                            </DataCell>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    );
                })}

                {showInlineNotes && (
                    <tbody data-export-block="note">
                        <tr>
                            {isExcelExport ? (
                                <td className="note-cell" colSpan={6} style={{ backgroundColor: '#F9FAFB', padding: '15px', border: '1px solid #E8ECF0' }}>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <span className="note-label" style={{ fontWeight: 'bold', color: '#2364B0' }}>GHI CHÚ:</span>
                                        <div>
                                            {noteList.length > 0 ? noteList.map((note, i) => <div key={i}>{note}</div>) : <div>&nbsp;Không có ghi chú</div>}
                                        </div>
                                    </div>
                                </td>
                            ) : (
                                <NoteCell colSpan={6}>
                                    <NoteContainer>
                                        <NoteLabel>GHI CHÚ:</NoteLabel>
                                        <div>
                                            {noteList.length > 0 ? noteList.map((note, i) => <div key={i}>{note}</div>) : <div>&nbsp;Không có ghi chú</div>}
                                        </div>
                                    </NoteContainer>
                                </NoteCell>
                            )}
                        </tr>
                    </tbody>
                )}
            </StyledTable>
        );
    };

    // Action Menu State
    const [actionAnchorEl, setActionAnchorEl] = useState(null);
    const [actionWeekInfo, setActionWeekInfo] = useState(null);
    const isActionMenuOpen = Boolean(actionAnchorEl);

    const handleOpenActionMenu = useCallback((weekInfo, row, event) => {
        // event is passed from LeadershipScheduleList
        if (event && event.currentTarget) {
            setActionAnchorEl(event.currentTarget);
        }
        setActionWeekInfo(weekInfo);
    }, []);

    const handleCloseActionMenu = useCallback(() => {
        setActionAnchorEl(null);
        setActionWeekInfo(null);
    }, []);

    const handleExportWeekAction = useCallback(async (type) => {
        const weekInfo = actionWeekInfo;
        handleCloseActionMenu();
        if (!weekInfo) return;

        setIsExporting(true);
        setExportFormat(type);
        try {
            // Fetch du lieu cua tuan
            const resultAction = await dispatch(fetchLeadershipSchedule({
                page: 1,
                limit: 25,
                type: 'grid',
                processFn: props.fnCode,
                'selectweek': weekInfo.week,
                'year': weekInfo.year,
            }));
            const res = unwrapResult(resultAction);
            setExportData(res?.items || []);

            // Fetch notes
            const d = dayjs().year(weekInfo.year).isoWeek(weekInfo.week);
            const startOfWeek = d.startOf('isoWeek').format('YYYY-MM-DD');
            const endOfWeek = d.endOf('isoWeek').format('YYYY-MM-DD');

            const noteAction = await dispatch(fetchLeadershipScheduleNotes({
                page: 1,
                limit: 25,
                'filter[fromDate]': startOfWeek,
                'filter[toDate]': endOfWeek
            }));
            const noteRes = unwrapResult(noteAction);
            setExportNotes(noteRes || []);

            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 800));

            const fileName = `Lich_truc_Tuan_${weekInfo.week}_Nam_${weekInfo.year}.${type === 'excel' ? 'xlsx' : 'pdf'}`;

            if (type === 'excel') processExportExcel(fileName, 'leadership-schedule-table-export');
            else await processExportPdf(fileName, 'leadership-schedule-pdf-export');

        } catch (error) {
            if (typeof logger !== 'undefined') logger.error(error);
        } finally {
            setIsExporting(false);
            setExportFormat(null);
            setExportData([]); // Clear
            setExportNotes([]);
        }
    }, [actionWeekInfo, dispatch, props.fnCode, processExportExcel, processExportPdf, handleCloseActionMenu]);

    const handleExportWeekExcel = useCallback(() => handleExportWeekAction('excel'), [handleExportWeekAction]);
    const handleExportWeekPdf = useCallback(() => handleExportWeekAction('pdf'), [handleExportWeekAction]);

    // const handleAdd = useCallback(() => {
    //     const componentInfo = getComponentByKey('CREATE_LEADER_DUTY_SCHEDULE');
    //     if (componentInfo) {
    //         openDetailDialog({
    //             ...componentInfo,
    //             defaultProps: {
    //                 ...componentInfo.defaultProps,
    //                 setReloadData: fetchData,
    //             },
    //         }, null);
    //     }
    // }, [fetchData]);

    const actionsList = useMemo(() => [
        {
            component: (
                <Tooltip title="Thao tác">
                    <ActionMenuIcon />
                </Tooltip>
            ),
            onClick: handleOpenActionMenu
        }
    ], [handleOpenActionMenu]);

    return (
        <>
            <Container isFullScreen={isFullScreen}>
                <NavBar>
                    {currentView === 'calendar' && (
                        <DateRangeLabel>
                            {dayjs(currentDate).startOf('isoWeek').format('D/M/YYYY')} - {dayjs(currentDate).endOf('isoWeek').format('D/M/YYYY')}
                        </DateRangeLabel>
                    )}
                    {currentView === 'calendar' && <TodayButton variant="contained" onClick={handleSetToday}>Hôm nay</TodayButton>}
                    {currentView === 'calendar' && (
                        <SelectWrapper>
                            <CustomSelect
                                value={selectedCalendarWeek.toString()}
                                onChange={handleWeekChange}
                                size="small"
                                IconComponent={SelectEmptyIcon}
                            >
                                {weekOptions?.map((item) => <StyledMenuItem key={item.value} value={item.value}>{item.title}</StyledMenuItem>)}
                            </CustomSelect>
                            <SelectIconArea>
                                <SelectStepButton
                                    type="button"
                                    aria-label="Tăng tuần"
                                    disabled={selectedCalendarWeek >= weekOptionValues[weekOptionValues.length - 1]}
                                    onMouseDown={handleSelectStepMouseDown}
                                    onClick={handleIncreaseWeek}
                                >
                                    <SelectChevronUp />
                                </SelectStepButton>
                                <SelectStepButton
                                    type="button"
                                    aria-label="Giảm tuần"
                                    disabled={selectedCalendarWeek <= weekOptionValues[0]}
                                    onMouseDown={handleSelectStepMouseDown}
                                    onClick={handleDecreaseWeek}
                                >
                                    <SelectChevronDown />
                                </SelectStepButton>
                            </SelectIconArea>
                        </SelectWrapper>
                    )}
                    {currentView === 'calendar' && (
                        <SelectWrapper>
                            <CustomSelect
                                value={selectedCalendarYear.toString()}
                                onChange={handleYearChange}
                                size="small"
                                IconComponent={SelectEmptyIcon}
                            >
                                {yearOptions?.map((item) => <StyledMenuItem key={item.value} value={item.value}>{item.title}</StyledMenuItem>)}
                            </CustomSelect>
                            <SelectIconArea>
                                <SelectStepButton
                                    type="button"
                                    aria-label="Tăng năm"
                                    disabled={selectedCalendarYear >= yearOptionValues[yearOptionValues.length - 1]}
                                    onMouseDown={handleSelectStepMouseDown}
                                    onClick={handleIncreaseYear}
                                >
                                    <SelectChevronUp />
                                </SelectStepButton>
                                <SelectStepButton
                                    type="button"
                                    aria-label="Giảm năm"
                                    disabled={selectedCalendarYear <= yearOptionValues[0]}
                                    onMouseDown={handleSelectStepMouseDown}
                                    onClick={handleDecreaseYear}
                                >
                                    <SelectChevronDown />
                                </SelectStepButton>
                            </SelectIconArea>
                        </SelectWrapper>
                    )}
                    {currentView === 'list' && (
                        <>
                            <SelectWrapper>
                                <CustomSelect
                                    value={selectedListMonth.toString()}
                                    onChange={handleMonthChange}
                                    size="small"
                                    IconComponent={SelectEmptyIcon}
                                >
                                    {monthOptions?.map((item) => <StyledMenuItem key={item.value} value={item.value}>{item.title}</StyledMenuItem>)}
                                </CustomSelect>
                                <SelectIconArea>
                                    <SelectStepButton
                                        type="button"
                                        aria-label="Tăng tháng"
                                        disabled={selectedListMonth >= monthOptionValues[monthOptionValues.length - 1]}
                                        onMouseDown={handleSelectStepMouseDown}
                                        onClick={handleIncreaseListMonth}
                                    >
                                        <SelectChevronUp />
                                    </SelectStepButton>
                                    <SelectStepButton
                                        type="button"
                                        aria-label="Giảm tháng"
                                        disabled={selectedListMonth <= monthOptionValues[0]}
                                        onMouseDown={handleSelectStepMouseDown}
                                        onClick={handleDecreaseListMonth}
                                    >
                                        <SelectChevronDown />
                                    </SelectStepButton>
                                </SelectIconArea>
                            </SelectWrapper>
                            <SelectWrapper>
                                <CustomSelect
                                    value={selectedListYear.toString()}
                                    onChange={handleListYearChange}
                                    size="small"
                                    IconComponent={SelectEmptyIcon}
                                >
                                    {yearOptions?.map((item) => <StyledMenuItem key={item.value} value={item.value}>{item.title}</StyledMenuItem>)}
                                </CustomSelect>
                                <SelectIconArea>
                                    <SelectStepButton
                                        type="button"
                                        aria-label="Tăng năm"
                                        disabled={selectedListYear >= yearOptionValues[yearOptionValues.length - 1]}
                                        onMouseDown={handleSelectStepMouseDown}
                                        onClick={handleIncreaseListYear}
                                    >
                                        <SelectChevronUp />
                                    </SelectStepButton>
                                    <SelectStepButton
                                        type="button"
                                        aria-label="Giảm năm"
                                        disabled={selectedListYear <= yearOptionValues[0]}
                                        onMouseDown={handleSelectStepMouseDown}
                                        onClick={handleDecreaseListYear}
                                    >
                                        <SelectChevronDown />
                                    </SelectStepButton>
                                </SelectIconArea>
                            </SelectWrapper>
                        </>
                    )}

                    <RightBox>
                        {currentView === 'calendar' && (
                            <Tooltip title={isFullScreen ? "Thu nhỏ" : "Phóng to"}>
                                <ActionIconButton onClick={toggleFullScreen}>
                                    {isFullScreen ? <FullscreenExit /> : <Fullscreen />}
                                </ActionIconButton>
                            </Tooltip>
                        )}

                        {(currentView === 'calendar' || (currentView === 'list' && selectedWeeks.length > 0)) && (
                            <>
                                <Tooltip title="Xuất file">
                                    <ActionIconButton variant="contained" onClick={handleOpenMenu}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1.2998 12.6703L1.2998 9.99031C1.2998 9.62027 1.59978 9.32031 1.9698 9.32031C2.33983 9.32031 2.6398 9.62027 2.6398 9.99031L2.6398 12.6703L2.64307 12.7364C2.65828 12.8898 2.72612 13.0341 2.83609 13.144C2.96175 13.2697 3.13211 13.3403 3.3098 13.3403L12.6898 13.3403C12.8675 13.3403 13.0379 13.2697 13.1635 13.144C13.2892 13.0184 13.3598 12.848 13.3598 12.6703L13.3598 9.99031C13.3598 9.62027 13.6598 9.32027 14.0298 9.32031C14.3998 9.32031 14.6998 9.62027 14.6998 9.99031L14.6998 12.6703C14.6998 13.2034 14.4879 13.7145 14.1109 14.0914C13.734 14.4684 13.2229 14.6803 12.6898 14.6803L3.3098 14.6803C2.77672 14.6803 2.26562 14.4684 1.88867 14.0914C1.5589 13.7617 1.35535 13.3293 1.30962 12.8692L1.2998 12.6703Z" fill="currentColor" />
                                            <path d="M10.9266 6.13471C11.1898 5.92007 11.5777 5.93521 11.823 6.18051C12.0683 6.4258 12.0835 6.81374 11.8689 7.07691L11.823 7.1279L8.47303 10.4779C8.21139 10.7396 7.78728 10.7396 7.52565 10.4779L4.17563 7.1279L4.12982 7.07691C3.91519 6.81374 3.93032 6.4258 4.17563 6.18051C4.42093 5.93521 4.80886 5.92007 5.07201 6.13471L5.12305 6.18051L7.99934 9.05676L10.8756 6.18051L10.9266 6.13471Z" fill="currentColor" />
                                            <path d="M7.33008 10.0186L7.33008 1.97859C7.33008 1.60857 7.63004 1.30859 8.00008 1.30859C8.37012 1.30859 8.67008 1.60857 8.67008 1.97859L8.67008 10.0186C8.67008 10.3886 8.37012 10.6886 8.00008 10.6886C7.63004 10.6886 7.33008 10.3886 7.33008 10.0186Z" fill="currentColor" />
                                        </svg>
                                    </ActionIconButton>
                                </Tooltip>
                                <Menu
                                    anchorEl={anchorEl}
                                    open={openMenu}
                                    onClose={handleCloseMenu}
                                    MenuListProps={{
                                        'aria-labelledby': 'basic-button',
                                    }}
                                >
                                    <StyledMenuItem onClick={handleExportExcelClick}>
                                        Xuất Excel {selectedWeeks.length > 1 && `(${selectedWeeks.length})`}
                                    </StyledMenuItem>
                                    <StyledMenuItem onClick={handleExportPdfClick}>
                                        Xuất PDF {selectedWeeks.length > 1 && `(${selectedWeeks.length})`}
                                    </StyledMenuItem>
                                </Menu>
                            </>
                        )}

                        {/* <Tooltip title="Thêm mới">
                            <AddButton onClick={handleAdd} variant="contained" startIcon={<Add />}>
                                Thêm mới
                            </AddButton>
                        </Tooltip> */}

                        <StyledToggleButtonGroup value={currentView} exclusive onChange={handleViewChange} size="small">
                            <ToggleButton value="list"><SmallListIcon /></ToggleButton>
                            <ToggleButton value="calendar"><SmallCalendarIcon /></ToggleButton>
                        </StyledToggleButtonGroup>
                    </RightBox>
                </NavBar>

                <ContentStyle>
                    {currentView === 'calendar' ? (
                        <>
                            <TableWrapper>
                                <CalendarScrollArea isFullScreen={isFullScreen}>
                                    {isLoading && <Loading />}
                                    {renderTableContent(scheduleItems, notes, "leadership-schedule-table", false, true)}
                                </CalendarScrollArea>
                            </TableWrapper>
                        </>
                    ) : (
                        <>
                            <LeadershipScheduleList
                                item={props.item}
                                open={props.open}
                                fnCode={props.fnCode}
                                onSelectWeek={handleSelectWeekFromList}
                                params={{
                                    year: dayjs(currentDate).year(),
                                    month: dayjs(currentDate).month() + 1
                                }}
                                actions={actionsList}
                            />

                            <Menu
                                anchorEl={actionAnchorEl}
                                open={isActionMenuOpen}
                                onClose={handleCloseActionMenu}
                                onClick={handleCloseActionMenu}
                                PaperProps={{
                                    elevation: 0,
                                    sx: {
                                        overflow: 'visible',
                                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                        mt: 1.5,
                                    },
                                }}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                disableScrollLock
                            >
                                <StyledMenuItem onClick={handleExportWeekExcel}>
                                    Xuất Excel
                                </StyledMenuItem>
                                <StyledMenuItem onClick={handleExportWeekPdf}>
                                    Xuất PDF
                                </StyledMenuItem>
                            </Menu>

                        </>
                    )}

                    {isExporting && (
                        <div
                            id="leadership-schedule-pdf-export"
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '1200px',
                                backgroundColor: '#ffffff',
                                padding: '0 0 24px 0',
                                pointerEvents: 'none',
                                zIndex: -1,
                                overflow: 'visible'
                            }}
                        >
                            {renderTableContent(exportData, exportNotes, "leadership-schedule-table-export", exportFormat === 'excel', true, false)}
                        </div>
                    )}
                </ContentStyle>
            </Container>
            {isExporting && <Loading />}
        </>
    );
};

export default withSharedComponents(LeadershipSchedule);



