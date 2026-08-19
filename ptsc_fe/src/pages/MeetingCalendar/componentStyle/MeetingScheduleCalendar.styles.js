import { SkyBox, SkyButton, SkyTypography } from '@styles/SkyStyles';
import { styled, keyframes } from '@mui/material/styles';
import { Popover } from '@mui/material';

export const Container = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isFullScreen',
})(({ theme, isFullScreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: isFullScreen ? 'calc(100vh - 60px)' : 'auto',
    width: isFullScreen ? '100vw' : '100%',
    position: isFullScreen ? 'fixed !important' : 'relative',
    top: isFullScreen ? '60px' : 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: isFullScreen ? '2147483647 !important' : 0,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    maxWidth: isFullScreen ? '100vw' : '100%',
    fontFamily: '"Segoe UI", sans-serif',
    fontSize: '13px',
    color: theme.palette.text.primary,
    overflow: isFullScreen ? 'hidden' : 'visible',
    [theme.breakpoints.down('md')]: {
        fontSize: '12px',
        border: 'none',
    },
}));

// --- NAVBAR ---
export const NavBar = styled(SkyBox)(({ theme }) => ({
    padding: '10px 15px',
    background: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 1100,
    '@media (max-width: 1024px)': {
        flexWrap: 'wrap',
        padding: '10px',
        gap: '10px',
    },
    '@media (max-width: 768px)': {
        flexWrap: 'wrap',
        padding: '8px 10px',
        gap: '8px',
    },
}));

export const NavLeft = styled(SkyBox)(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    '@media (max-width: 1024px)': {
        gap: '8px',
        flexWrap: 'wrap',
    },
    '@media (max-width: 768px)': {
        gap: '8px',
    },
}));

export const TodayButton = styled(SkyButton)(({ theme }) => ({
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: 'none',
    padding: '6px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
    fontWeight: 600,
    fontSize: '13px',
    height: '34px',
    '&:hover': {
        opacity: 0.9,
    },
    '@media (max-width: 768px)': {
        padding: '5px 10px',
        fontSize: '11px',
    },
}));

export const WeekNavContainer = styled(SkyBox)(() => ({
    display: 'flex',
    alignItems: 'center',
    height: '34px',
    overflow: 'hidden',
    backgroundColor: 'transparent',
}));

export const NavArrowButton = styled(SkyBox)(({ theme }) => ({
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    color: theme.palette.text.primary,
    border: `2px solid ${theme.palette.divider}`,
    borderRadius: '50%',
    minWidth: '36px',
    padding: 0,
    backgroundColor: 'transparent',
    transition: 'all 0.2s',
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
    },
}));

export const CurrentLabel = styled('span')(({ theme }) => ({
    padding: '0 20px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: theme.palette.text.primary,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
}));

export const DateRangeLabel = styled('span')(({ theme }) => ({
    margin: '0 10px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 'normal',
    color: theme.palette.text.primary,
    '@media (max-width: 768px)': {
        fontSize: '12px',
    }
}));

export const ViewSwitcher = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    padding: '3px',
    backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#F8FAFC',
    border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#CBD5E1'}`,
    borderRadius: '8px',
    height: '38px',
    alignItems: 'center',
    '@media (max-width: 768px)': {
        width: '100%',
        justifyContent: 'center',
    },
}));

export const ViewSwitchButton = styled(SkyButton, {
    shouldForwardProp: (prop) => prop !== '$active',
})(({ theme, $active }) => ({
    color: $active ? '#1E293B' : '#64748B',
    background: $active ? theme.palette.background.paper : 'transparent',
    border: $active ? `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0'}` : '1px solid transparent',
    padding: '4px 18px',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s',
    fontSize: '14px',
    fontWeight: $active ? 600 : 500,
    height: '100%',
    boxShadow: $active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
    '&:hover': {
        color: '#1E293B',
        background: $active ? theme.palette.background.paper : 'rgba(0,0,0,0.02)',
    },
    '@media (max-width: 768px)': {
        padding: '4px 8px',
        fontSize: '11px',
        flex: 1,
    },
}));

// --- CONTENT AREA ---
export const ContentArea = styled(SkyBox, {
    shouldForwardProp: (prop) => !['isLoading', 'isFullScreen'].includes(prop),
})(({ theme, isLoading, isFullScreen }) => ({
    flex: isFullScreen ? '1 1 auto' : 'none',
    display: 'flex',
    flexDirection: 'column',
    height: isFullScreen ? 'auto' : 'calc(100vh - 373px)',
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    opacity: isLoading ? 0.6 : 1,
    pointerEvents: isLoading ? 'none' : 'auto',
    transition: 'opacity 0.3s',
    '@media (max-width: 768px)': {
        height: isFullScreen ? 'auto' : 'calc(60vh - 20px)',
    },
    '@media (max-width: 1024px) and (min-width: 768px)': {
        height: isFullScreen ? 'auto' : 'calc(500px - 20px)',
    },
}));

// Fixed header area (outside scroll)
export const CalendarHeaderArea = styled(SkyBox)(({ theme }) => ({
    flexShrink: 0,
    background: theme.palette.background.paper,
    overflow: 'hidden',
    scrollbarGutter: 'stable',
}));

// Scrollable body area 
export const CalendarBodyArea = styled(SkyBox)({
    flex: 1,
    overflow: 'auto',
    scrollbarGutter: 'stable',
});

export const LoadingOverlay = styled(SkyBox)(({ theme }) => ({
    position: 'absolute',
    top: '0px',
    left: '0px',
    right: '0px',
    bottom: '0px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    fontWeight: 'bold',
    color: theme.palette.primary.main,
}));


// --- DAY VIEW COMPONENTS ---
export const DayViewHeaderContainer = styled(SkyBox)({
    padding: '15px 15px 0 15px',
});

export const DayViewBodyContainer = styled(SkyBox)({
    padding: '0 15px 15px 15px',
});

export const DayViewHeader = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px',
});

export const HeaderCircle = styled(SkyBox)(({ theme }) => ({
    width: '50px',
    height: '50px',
    backgroundColor: theme.palette.primary.main,
    borderRadius: '50%',
    color: theme.palette.primary.contrastText,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.1,
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
}));

export const DaySummaryBar = styled(SkyBox)(({ theme }) => ({
    backgroundColor: theme.palette.action.hover, // Màu nền nhẹ theo theme
    color: theme.palette.primary.main,
    padding: '8px 20px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '13px',
    fontWeight: 500,
}));

export const DayViewBody = styled(SkyBox)({
    display: 'flex',
    position: 'relative',
});

export const TimeAxis = styled(SkyBox)(({ theme }) => ({
    width: '60px',
    borderRight: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
    background: theme.palette.background.paper,
}));

export const TimeLabel = styled(SkyBox)(({ theme }) => ({
    height: '40px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    textAlign: 'right',
    paddingRight: '8px',
    paddingTop: '2px',
    fontSize: '11px',
    color: theme.palette.text.secondary,
    boxSizing: 'border-box',
    lineHeight: 1,
}));

export const EventsTrack = styled(SkyBox)(({ theme }) => ({
    flex: 1,
    position: 'relative',
    background: theme.palette.background.paper,
}));

export const CurrentTimeLine = styled(SkyBox)(({ posTop }) => ({
    position: 'absolute',
    top: `${posTop}px`,
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: '#ff0000',
    zIndex: 20,
    pointerEvents: 'none',
    '&::before': {
        content: '""',
        position: 'absolute',
        left: '-5px',
        top: '-4px',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: '#ff0000',
    }
}));

// Sửa GridLine để có border
export const GridLine = styled(SkyBox)(({ theme }) => ({
    height: '40px',
    boxSizing: 'border-box',
    borderBottom: `1px solid ${theme.palette.divider}`,
}));
// --- CONSTANTS ---
export const MEETING_STATUS_STYLES = {
    'DU_KIEN': {
        label: 'Dự kiến',
        color: '#1e40af',      // Xanh dương đậm
        background: '#dbeafe', // Xanh dương nhạt
    },
    'CHUAN_BI': {
        label: 'Chuẩn bị',
        color: '#15803d',      // Xanh lá đậm
        background: '#dcfce7', // Xanh lá nhạt
    },
    'DANG_HOP': {
        label: 'Đang họp',
        color: '#ffa600',      // Cam đậm
        background: '#fff3dd', // Cam nhạt
    },
    'BAT_DAU': {
        label: 'Đang họp',
        color: '#ffa600',      // Cam đậm
        background: '#fff3dd', // Cam nhạt
    },
    'DA_KET_THUC': {
        label: 'Kết thúc',
        color: '#4b5563',      // Xám đậm
        background: '#f3f4f6', // Xám nhạt
    },
    'KET_THUC': {
        label: 'Kết thúc',
        color: '#4b5563',      // Xám đậm
        background: '#f3f4f6', // Xám nhạt
    },
    'DA_HUY': {
        label: 'Hủy',
        color: '#991b1b',      // Đỏ đậm
        background: '#fee2e2', // Đỏ nhạt
    },
    'DRAFT': {
        label: 'Dự kiến',
        color: '#1e40af',
        background: '#dbeafe',
    },
    'HOAN_THANH': {
        label: 'Văn bản đã xử lý',
        color: '#4b5563',
        background: '#f3f4f6',
    },
    'CANCEL': {
        label: 'Hủy',
        color: '#991b1b',
        background: '#fee2e2',
    },
    'PENDING': {
        label: 'Chờ xử lý',
        color: '#92400e',      // Vàng nâu
        background: '#fef3c7', // Vàng nhạt
    },
    'IN_PROGRESS': {
        label: 'Đang xử lý',
        color: '#7c2d12',      // Cam nâu
        background: '#fed7aa', // Cam nhạt
    },
    'APPROVED': {
        label: 'Đã duyệt',
        color: '#065f46',      // Xanh lá đậm
        background: '#d1fae5', // Xanh lá nhạt
    },
    'REJECTED': {
        label: 'Từ chối',
        color: '#be123c',      // Đỏ hồng
        background: '#fce7f3', // Hồng nhạt
    },
};

export const DEFAULT_STATUS_STYLE = {
    label: 'Dự thảo',
    color: '#6b7280',
    background: '#f9fafb',
};

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const EventBox = styled(SkyBox, {
    shouldForwardProp: (prop) => !['posTop', 'posHeight', 'status', 'column', 'totalColumns', 'customStyle'].includes(prop),
})(({ theme, posTop, posHeight, status, customStyle, column = 0, totalColumns = 1 }) => {
    const style = customStyle || MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;

    // Calculate width and left position based on columns
    const widthPercent = (100 / totalColumns) - 1; // -1% for gap
    const leftPercent = (100 / totalColumns) * column;

    return {
        position: 'absolute',
        left: `calc(${leftPercent}% + 10px)`,
        width: `calc(${widthPercent}% - 10px)`,
        top: `${posTop}px`,
        height: `${posHeight}px`,
        borderRadius: '6px',
        padding: '5px 15px',
        fontSize: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        zIndex: 10 + column, // Higher z-index for later columns
        cursor: 'pointer',
        backgroundColor: style.background,
        borderLeft: `4px solid ${style.color}`,
        // Force dark text color if theme is dark but chip background is light
        color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary,
        '&:hover': {
            filter: 'brightness(0.98)',
            zIndex: 100, // Bring to front on hover
        },
    };
});

// --- WEEK VIEW COMPONENTS ---
export const WeekViewContainer = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: '800px',
    background: theme.palette.background.paper,
    '@media (max-width: 768px)': {
        minWidth: '100%',
        overflowX: 'auto',
    },
}));

export const WeekHeaderRow = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingLeft: '60px',
    position: 'relative',
    background: theme.palette.background.paper,
    height: '60px',
    '@media (max-width: 768px)': {
        paddingLeft: '40px',
    },
}));

export const WeekHeaderTimeLabel = styled(SkyBox)(({ theme }) => ({
    width: '60px',
    textAlign: 'center',
    fontWeight: 'normal',
    color: theme.palette.text.secondary, // Sửa màu
    background: 'inherit',
    position: 'absolute',
    left: '0px',
    top: '0px',
    bottom: '0px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRight: `1px solid ${theme.palette.divider}`,
    boxSizing: 'border-box',
    '@media (max-width: 768px)': {
        width: '40px',
        fontSize: '11px',
    },
}));

export const DayColHeader = styled(SkyBox, {
    shouldForwardProp: (prop) => !['isToday', 'isWeekend'].includes(prop),
})(({ theme }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    gap: '5px',
    '@media (max-width: 768px)': {
        fontSize: '11px',
        minWidth: '60px',
    },
}));

export const DayNameText = styled('span')(({ theme, isToday }) => ({
    fontSize: '11px',
    textTransform: 'uppercase',
    color: isToday ? '#1A73E8' : theme.palette.text.secondary,
    fontWeight: isToday ? 'bold' : 'normal',
}));

export const WeekDateNumber = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isToday',
})(({ isToday }) => ({
    fontSize: '16px',
    fontWeight: '500',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: isToday ? '#1A73E8' : 'transparent',
    color: isToday ? '#ffffff' : 'inherit',
}));

export const WeekBody = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    position: 'relative',
    backgroundColor: theme.palette.background.paper,
    minWidth: '800px', // Ensures horizontal scroll on smaller screens
}));

export const WeekDaysContainer = styled(SkyBox)({
    flex: 1,
    display: 'flex',
    position: 'relative',
});

export const TimeColumn = styled(SkyBox)(({ theme }) => ({
    width: '60px',
    borderRight: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
    background: theme.palette.background.paper,
    '@media (max-width: 768px)': {
        width: '40px',
    },
}));

export const TimeSlot = styled(SkyBox)(({ theme }) => ({
    height: '40px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    textAlign: 'center',
    fontSize: '11px',
    color: theme.palette.text.secondary,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '2px',
    lineHeight: 1,
    background: theme.palette.background.paper,
    '@media (max-width: 768px)': {
        fontSize: '10px',
        paddingRight: '3px',
        height: '40px',
    },
}));

export const DayColumn = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isWeekend' && prop !== 'isToday',
})(({ theme, isWeekend, isToday }) => ({
    flex: 1,
    borderRight: `1px solid ${theme.palette.divider}`,
    position: 'relative',
    minWidth: '60px',
    background: isToday ? 'rgba(26, 115, 232, 0.04)' : (isWeekend ? '#F1F4FA' : theme.palette.background.paper),
    '@media (max-width: 768px)': {
        minWidth: '60px',
    },
}));


export const StatusBadge = styled(SkyBox, {
    shouldForwardProp: (prop) => !['badgeColor', 'badgeBg'].includes(prop),
})(({ badgeColor, badgeBg }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    borderRadius: '22px',
    padding: '5px 18px',
    border: '1px solid #AEB5BE',
    backgroundColor: badgeBg,
    color: badgeColor,
    fontSize: '13px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
}));

export const WeekEventChip = styled(SkyBox, {
    shouldForwardProp: (prop) => !['posTop', 'posHeight', 'status', 'column', 'totalColumns', 'customStyle'].includes(prop),
})(({ theme, posTop, posHeight, status, customStyle, column = 0, totalColumns = 1 }) => {
    const style = customStyle || MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;

    // Calculate width and left position based on columns
    const widthPercent = (90 / totalColumns); // 90% total width divided by columns
    const leftPercent = 5 + (90 / totalColumns) * column; // Start at 5%

    return {
        position: 'absolute',
        width: `${widthPercent}%`,
        left: `${leftPercent}%`,
        top: `${posTop}px`,
        height: `${posHeight}px`,
        borderRadius: '4px',
        padding: '2px 4px',
        minHeight: '40px',
        fontSize: '11px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        zIndex: 10 + column, // Higher z-index for later columns
        cursor: 'pointer',
        backgroundColor: style.background,
        borderLeft: `3px solid ${style.color}`,
        // Force dark text color if theme is dark but chip background is light
        color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px', // gap between lines
        '&:hover': {
            zIndex: 100, // Bring to front on hover
        },
    };
});

export const ChipTitle = styled(SkyTypography)(() => ({
    fontWeight: 'bold',
    fontSize: '11px',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'inherit',
    flex: 1,
}));

export const ChipText = styled(SkyTypography)(() => ({
    fontSize: '10px',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'inherit',
}));

// --- MONTH VIEW COMPONENTS ---
export const MonthViewContainer = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: theme.palette.background.paper,
}));

export const MonthHeader = styled(SkyBox)(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
}));

export const MonthHeaderItem = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isToday',
})(({ theme, isToday }) => ({
    padding: '10px',
    textAlign: 'center',
    fontWeight: '700',
    textTransform: 'uppercase',
    borderRight: `1px solid ${theme.palette.divider}`,
    color: isToday ? '#1A73E8' : theme.palette.text.primary,
    background: theme.palette.background.paper,
    '@media (max-width: 768px)': {
        fontSize: '11px',
        padding: '5px',
    },
}));

export const MonthGrid = styled(SkyBox)(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    gridAutoRows: '1fr',
    flex: 1,
    minHeight: 0,
    borderLeft: `1px solid ${theme.palette.divider}`,
}));

export const MonthCell = styled(SkyBox, {
    shouldForwardProp: (prop) => !['isEmpty', 'isWeekend'].includes(prop),
})(({ theme, isEmpty }) => ({
    borderRight: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: 0,
    height: '100%',
    minWidth: '0px',
    padding: '4px 6px',
    background: isEmpty ? theme.palette.action.disabledBackground : theme.palette.background.paper,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    '@media (max-width: 768px)': {
        minHeight: '80px',
        padding: '3px',
    },
}));

export const DateNumber = styled(SkyBox, {
    shouldForwardProp: (prop) => !['isToday', 'isOtherMonth'].includes(prop),
})(({ theme, isToday, isOtherMonth }) => ({
    fontWeight: '700',
    marginBottom: '2px',
    cursor: 'pointer',
    width: '24px',
    height: '24px',
    fontSize: '12px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    color: isToday ? '#fff' : (isOtherMonth ? theme.palette.text.secondary : theme.palette.text.primary),
    backgroundColor: isToday ? '#1A73E8' : 'transparent',
    opacity: isOtherMonth ? 0.6 : 1,
    '&:hover': {
        color: isToday ? '#fff' : theme.palette.primary.main,
    },
}));

export const MonthEventChip = styled(SkyBox, {
    shouldForwardProp: (prop) => !['status', 'customStyle'].includes(prop),
})(({ status, customStyle, theme }) => {
    const style = customStyle || MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
    return {
        fontSize: '11px',
        marginBottom: '2px',
        padding: '2px 6px',
        cursor: 'pointer',
        color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary,
        borderRadius: '4px',
        backgroundColor: style.background,
        borderLeft: `3px solid ${style.color}`,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        overflow: 'hidden',
        '@media (max-width: 768px)': {
            fontSize: '9px',
            padding: '1px 2px',
            marginBottom: '1px',
            maxWidth: '100%',
        },
    };
});

export const EventTitleRow = styled(SkyBox)(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    overflow: 'hidden',
    width: '100%',
    marginBottom: '2px',
}));

export const EventInfoRow = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: '4px',
    overflow: 'hidden',
});

export const EventTitleText = styled('span')({
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
});

export const SvgIconWrapper = styled('span')({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '14px',
    height: '14px',
    '& svg': {
        width: '100%',
        height: '100%',
    }
});

export const MoreEventsIndicator = styled(SkyBox)(({ theme }) => ({
    fontSize: '11px',
    fontWeight: 600,
    color: '#0066CC',
    textAlign: 'left',
    paddingLeft: '4px',
    marginTop: '2px',
    cursor: 'pointer',
    '&:hover': {
        color: theme.palette.primary.main,
        textDecoration: 'underline',
    },
    '@media (max-width: 768px)': {
        fontSize: '8px',
        padding: '1px',
    },
}));

// --- FOOTER ---
export const Footer = styled(SkyBox)(({ theme }) => ({
    padding: '12px 15px',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
    '@media (max-width: 768px)': {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '15px',
    },
}));

export const FooterSection = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    color: theme.palette.text.primary,
    '@media (max-width: 768px)': {
        gap: '6px',
    },
}));

export const LegendGrid = styled(SkyBox)(() => ({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '24px',
    width: '100%',
    '@media (max-width: 768px)': {
        gap: '12px',
    },
}));

export const LegendItem = styled(SkyBox)(() => ({
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#475569',
}));

export const LegendBox = styled(SkyBox, {
    shouldForwardProp: (prop) => !['fillColor', 'edgeColor'].includes(prop),
})(({ edgeColor }) => ({
    width: '12px',
    height: '12px',
    marginRight: '6px',
    borderRadius: '2px',
    backgroundColor: edgeColor,
}));

export const NoteSection = styled(SkyBox)({
    display: 'flex',
    flexDirection: 'column',
});

// const SectionTitle = styled(SkyTypography)(({ theme }) => ({
//   fontWeight: 600,
//   marginBottom: theme.spacing(1),
//   fontSize: '1.1rem', 
//   color: theme.palette.text.primary,
// }));

// --- POPUPS & COMMON UTILS ---

export const StyledPopover = styled(Popover)({
    pointerEvents: 'none',
});

export const PopupContainerDetail = styled(SkyBox)(({ theme }) => ({
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: '12px',
    boxShadow: theme.palette.mode === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.2)',
    padding: '24px',
    maxWidth: '300px',
    '@media (max-width: 768px)': {
        width: '95vw',
    },
}));

export const HoverDetailContainer = styled(PopupContainerDetail)({
    margin: 0,
    boxShadow: 'none',
    border: 'none',
    width: 'auto',
    minWidth: '300px',
});

export const PopupHeader = styled(SkyBox)({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
});

export const PopupTitleLarge = styled('h2')(({ theme }) => ({
    margin: '0px',
    color: theme.palette.text.primary,
    fontSize: '20px',
    fontWeight: 600,
}));

export const DetailRow = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    fontSize: '14px',
    marginBottom: '12px',
    alignItems: 'flex-start',
    lineHeight: 1.5,
    color: theme.palette.text.primary,
}));

export const DetailLabel = styled('span')(({ theme }) => ({
    width: '140px',
    fontWeight: 700,
    color: theme.palette.text.secondary,
}));

export const DetailValue = styled('span')(({ theme }) => ({
    flex: 1,
    color: theme.palette.text.primary,
}));
export const Overlay = styled(SkyBox)({
    position: 'fixed',
    top: '0px',
    left: '0px',
    right: '0px',
    bottom: '0px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1200,
    animation: `${fadeIn} 0.2s ease-out`,
});

export const PopupContainer = styled(SkyBox)(({ theme }) => ({
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: '12px',
    boxShadow: theme.palette.mode === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.2)',
    padding: '24px',
    position: 'relative',
    width: '400px',
    '@media (max-width: 768px)': {
        width: '95vw',
        maxWidth: '95vw',
        padding: '16px',
        borderRadius: '8px',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    '@media (max-width: 1024px) and (min-width: 768px)': {
        width: '90vw',
        maxWidth: '500px',
    },
}));


export const PopupContainerDaySummary = styled(PopupContainer)(() => ({
    width: '320px',
    padding: '0px',
    overflow: 'hidden',
    '@media (max-width: 768px)': {
        width: '95vw',
        maxWidth: '350px',
    },
}));

export const DayViewHeaderTimeLabel = styled(WeekHeaderTimeLabel)({
    textTransform: 'uppercase',
    fontWeight: 600,
});

export const DayViewColHeader = styled(DayColHeader)({
    borderRight: 'none',
});

export const DayViewNameText = styled(DayNameText)({
    fontSize: '11px',
    fontWeight: 'normal',
    textTransform: 'uppercase',
    color: '#64748b',
});

export const DayViewDateNumber = styled(WeekDateNumber)({
    fontSize: '24px',
    width: 'auto',
    height: 'auto',
    backgroundColor: 'transparent',
    color: 'inherit',
    fontWeight: 'bold',
});

export const DayViewBodyContainerNoPadding = styled(DayViewBodyContainer)({
    padding: 0,
});

export const CloseButton = styled('button')(({ theme }) => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.palette.text.secondary,
    padding: '0px',
    '&:hover': {
        color: theme.palette.text.primary,
    },
}));

export const AbsoluteCloseButton = styled(CloseButton)({
    position: 'absolute',
    right: '15px',
    top: '15px',
});


export const EventTitle = styled(SkyBox)(() => ({
    fontWeight: 'bold',
    marginBottom: '0px',
    color: 'inherit',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
}));

export const EventTime = styled(SkyBox)(() => ({
    fontSize: '11px',
    color: 'inherit',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
}));



export const FlexColumnGap10 = styled(SkyBox)({
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
});


export const DayViewTitle = styled('h2')(({ theme }) => ({
    margin: '0px',
    fontSize: '18px',
    fontWeight: 'normal',
    color: theme.palette.text.primary,
}));

export const DayViewSubTitle = styled('span')(({ theme }) => ({
    fontSize: '12px',
    color: theme.palette.text.secondary,
    fontWeight: 'normal',
    textTransform: 'uppercase',
}));

export const DateCircleText = styled('span')(({ theme }) => ({
    fontSize: '20px',
    fontWeight: 'bold',
    color: theme.palette.primary.contrastText,
}));

export const DaySummaryHeader = styled(SkyBox)(({ theme }) => ({
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    padding: '20px',
    textAlign: 'center',
    borderBottom: `1px solid ${theme.palette.divider} `,
    position: 'relative',
}));

export const DaySummaryDate = styled(SkyBox)(({ theme }) => ({
    width: '36px',
    height: '36px',
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 5px',
    fontWeight: 'bold',
}));

export const DaySummaryDayName = styled(SkyBox)(({ theme }) => ({
    color: theme.palette.primary.main,
    fontWeight: 'bold',
}));

export const DaySummaryList = styled(SkyBox)({
    padding: '10px',
    maxHeight: '350px',
    overflowY: 'auto',
});

export const DaySummaryItem = styled(SkyBox, {
    shouldForwardProp: (prop) => !['status', 'customStyle'].includes(prop),
})(({ status, customStyle, theme }) => {
    const style = customStyle || MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
    return {
        padding: '10px 12px',
        marginBottom: '8px',
        borderRadius: '6px',
        fontSize: '13px',
        cursor: 'pointer',
        background: style.background,
        borderLeft: `4px solid ${style.color}`,
        color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflow: 'hidden',
    };
});

export const DaySummaryEmpty = styled(SkyBox)(({ theme }) => ({
    textAlign: 'center',
    padding: '10px',
    color: theme.palette.text.disabled,
}));

export const StatsText = styled(SkyBox)(({ theme }) => ({
    fontWeight: 600,
    fontSize: '13px',
    marginBottom: '8px',
    color: theme.palette.text.primary,
}));

export const StatsBox = styled(SkyBox)(() => ({
    // border: `1.5px solid ${theme.palette.error.main}`,
    borderRadius: '4px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '400px',
    // backgroundColor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.05)' : '#FEF2F2',
}));

export const StatsRow = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
});

export const StatsTitle = styled(SkyTypography)(({ theme }) => ({
    fontSize: '12px',
    color: theme.palette.text.secondary,
    marginBottom: '4px',
}));

export const StatsItem = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
});

export const StatsLabel = styled('span')(({ theme }) => ({
    fontWeight: 700,
    color: theme.palette.primary.main,
}));

export const StatsValue = styled('span')(({ theme }) => ({
    fontWeight: 700,
    color: theme.palette.success.main,
}));

export const StatsValueRed = styled('span')(({ theme }) => ({
    fontWeight: 700,
    color: theme.palette.error.main,
}));

export const DividerStats = styled('span')(({ theme }) => ({
    color: theme.palette.divider,
    margin: '0 4px',
}));

// --- TIMELINE VIEW STYLED COMPONENTS ---
export const TimelineContainer = styled(SkyBox)(() => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    boxSizing: 'border-box',
    width: '100%',
}));

export const TimelineDaySection = styled(SkyBox)(({ theme }) => ({
    border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
}));

export const TimelineDayHeader = styled(SkyButton)(({ theme }) => ({
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    background: theme.palette.mode === 'dark' ? '#1e293b' : '#F8FAFC',
    border: 'none',
    borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
    cursor: 'pointer',
    borderRadius: '0',
    transition: 'background 0.2s',
    textAlign: 'left',
    '&:hover': {
        background: theme.palette.mode === 'dark' ? '#334155' : '#F1F5F9',
    },
}));

export const TimelineDayTitleBox = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
});

export const TimelineDayTitle = styled('h3')(() => ({
    margin: 0,
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#2364B0',
    letterSpacing: '0.05em',
}));

export const TimelineCountBadge = styled('span')(({ theme }) => ({
    fontSize: '11px',
    color: theme.palette.primary.main,
    background: theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}`,
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 600,
}));

export const TimelineCardList = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
}));

export const TimelineCard = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    transition: 'background-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
    '&:last-of-type': {
        borderBottom: 'none',
    },
    '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
    },
    [theme.breakpoints.down('lg')]: {
        padding: '10px 14px',
    },
}));

export const TimelineTimeBox = styled(SkyBox)(({ theme }) => ({
    width: '90px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    [theme.breakpoints.down('sm')]: {
        width: '70px',
    },
}));

export const TimelineTimeText = styled('span')(({ theme, isBold }) => ({
    fontSize: isBold ? '13px' : '11px',
    fontWeight: isBold ? 700 : 500,
    color: isBold ? theme.palette.text.primary : theme.palette.text.secondary,
    lineHeight: 1.3,
}));

export const TimelineTrackBox = styled(SkyBox)({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    alignSelf: 'stretch',
    width: '30px',
    flexShrink: 0,
});

export const TimelineConnectorLine = styled(SkyBox)(({ theme }) => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: '1px',
    transform: 'translateX(-50%)',
    backgroundColor: theme.palette.divider,
    zIndex: 1,
}));

export const TimelineDot = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'statusColor',
})(({ statusColor }) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: statusColor || '#94A3B8',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
}));

export const TimelineIconBox = styled(SkyBox)(({ theme, statusBg, statusColor }) => ({
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: statusBg || '#F1F5F9',
    color: statusColor || '#64748B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: '16px',
    '& svg': {
        width: '20px',
        height: '20px',
    },
    [theme.breakpoints.down('sm')]: {
        marginRight: '8px',
        width: '30px',
        height: '30px',
    },
}));

export const TimelineInfoBox = styled(SkyBox)({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: '4px',
});

export const TimelineMeetingTitleRow = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
});

export const TimelineMeetingTitle = styled('h4')(({ theme }) => ({
    margin: 0,
    fontSize: '13.5px',
    fontWeight: 600,
    color: theme.palette.text.primary,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
}));

export const TimelineMiniBadge = styled('span')(({ customStyle }) => ({
    fontSize: '9.5px',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: 600,
    backgroundColor: customStyle?.background || '#F1F5F9',
    color: customStyle?.color || '#475569',
    border: `1px solid ${customStyle?.color}30`,
    whiteSpace: 'nowrap',
}));

export const TimelineDescRow = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    fontSize: '12px',
    color: theme.palette.text.secondary,
    '@media (max-width: 1024px)': {
        gap: '8px',
    },
}));

export const TimelineDescRowNoWrap = styled(TimelineDescRow)({
    flexWrap: 'nowrap',
});

export const TimelineDescItem = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '300px',
    '& svg': {
        width: '14px',
        height: '14px',
        opacity: 0.7,
    },
});

export const TimelineDescItemRoom = styled(TimelineDescItem)({
    minWidth: 0,
    flexShrink: 0,
    maxWidth: '250px',
    '& svg': {
        flexShrink: 0,
    }
});

export const TimelineDescItemUsers = styled(TimelineDescItem)({
    flex: 1,
    minWidth: 0,
    maxWidth: 'none',
    '& svg': {
        flexShrink: 0,
    }
});

export const EllipsisText = styled('span')({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
});

export const TimelineActionBox = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
    marginLeft: '16px',
    [theme.breakpoints.down('sm')]: {
        marginLeft: '8px',
        gap: '8px',
    },
}));

export const TimelineDepartmentText = styled('span')(({ theme }) => ({
    fontSize: '12px',
    color: theme.palette.text.secondary,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    '& svg': {
        width: '15px',
        height: '15px',
        opacity: 0.7,
        marginRight: '4px',
    },
}));

export const TimelineStatusBadge = styled(SkyButton, {
    shouldForwardProp: (prop) => !['badgeBg', 'badgeColor'].includes(prop),
})(({ badgeBg, badgeColor }) => ({
    minWidth: '78px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'center',
    backgroundColor: badgeBg || '#F1F5F9',
    color: badgeColor || '#475569',
    border: `1px solid ${badgeColor || '#64748b'}50`,
    cursor: 'pointer',
    textTransform: 'none',
    boxShadow: 'none',
    '&:hover': {
        backgroundColor: badgeBg || '#E2E8F0',
        filter: 'brightness(0.95)',
    },
}));

export const TimelineNoMeetingsText = styled(SkyBox)(({ theme, $customPadding }) => ({
    padding: $customPadding || '20px',
    textAlign: 'center',
    color: theme.palette.text.secondary,
    fontSize: '13px',
    fontStyle: 'italic',
}));

export const TimelineDayExpandIcon = styled('span')(({ $isExpanded }) => ({
    display: 'flex',
    alignItems: 'center',
    transition: 'transform 0.2s',
    transform: $isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
}));

// --- TIMELINE SIDEBAR STYLED COMPONENTS ---
export const TimelineSplitLayout = styled(SkyBox)(() => ({
    display: 'flex',
    flexDirection: 'row',
    gap: '20px',
    height: '100%',
    width: '100%',
    boxSizing: 'border-box',
    padding: '0 16px 16px 16px',
    overflow: 'hidden',
    '@media (max-width: 900px)': {
        flexDirection: 'column',
        overflow: 'auto',
    },
}));

export const TimelineMainContent = styled(SkyBox)(({ theme }) => ({
    flex: 1,
    overflowY: 'auto',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    paddingRight: '6px',
    '&::-webkit-scrollbar': {
        width: '6px',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1',
        borderRadius: '3px',
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '@media (max-width: 900px)': {
        flex: 'none',
        height: 'auto',
        overflowY: 'visible',
    },
}));

export const TimelineSidebar = styled(SkyBox)(({ theme }) => ({
    width: '320px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
    overflowY: 'auto',
    paddingRight: '6px',
    '&::-webkit-scrollbar': {
        width: '6px',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1',
        borderRadius: '3px',
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '@media (max-width: 900px)': {
        width: '100%',
        height: 'auto',
        overflowY: 'visible',
    },
}));

export const SidebarCard = styled(SkyBox)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
}));

export const SidebarTitle = styled('h4')(({ theme }) => ({
    margin: '0 0 12px 0',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: theme.palette.text.primary,
    letterSpacing: '0.05em',
}));

// Mini Calendar
export const MiniCalHeader = styled(SkyBox)({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
});

export const MiniCalMonthLabel = styled('span')(({ theme }) => ({
    fontWeight: 700,
    fontSize: '12px',
    color: theme.palette.text.primary,
}));

export const MiniCalGrid = styled(SkyBox)({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    textAlign: 'center',
});

export const MiniCalDayLabel = styled('span')(({ theme }) => ({
    fontSize: '10px',
    fontWeight: 600,
    color: theme.palette.text.secondary,
    padding: '4px 0',
}));

export const MiniCalCell = styled(SkyBox, {
    shouldForwardProp: (prop) => !['isToday', 'isSelected', 'isOtherMonth'].includes(prop),
})(({ theme, isToday, isSelected, isOtherMonth }) => ({
    fontSize: '11px',
    fontWeight: (isToday || isSelected) ? 700 : 500,
    padding: '6px 0',
    borderRadius: '50%',
    cursor: 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: '1',
    color: isSelected 
        ? theme.palette.primary.contrastText 
        : (isToday ? theme.palette.primary.main : (isOtherMonth ? theme.palette.text.secondary : theme.palette.text.primary)),
    backgroundColor: isSelected 
        ? theme.palette.primary.main 
        : (isToday ? (theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.15)' : '#EFF6FF') : 'transparent'),
    opacity: isOtherMonth ? 0.5 : 1,
    border: isToday ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent',
}));

// Stats Overview
export const StatsOverviewGrid = styled(SkyBox)({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
});

export const StatBlock = styled(SkyBox)(({ theme }) => ({
    border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : '#F8FAFC',
}));

export const StatIconWrapper = styled(SkyBox)(({ $iconColor }) => ({
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: $iconColor ? `${$iconColor}15` : '#F1F5F9',
    color: $iconColor || '#64748B',
    flexShrink: 0,
    '& svg': {
        width: '18px',
        height: '18px',
    },
}));

export const StatTexts = styled(SkyBox)({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
});

export const StatNumber = styled('span')(({ theme }) => ({
    fontSize: '13px',
    fontWeight: 700,
    color: theme.palette.text.primary,
    lineHeight: 1.2,
}));

export const StatLabelText = styled('span')(({ theme }) => ({
    fontSize: '10px',
    color: theme.palette.text.secondary,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
}));

// Upcoming Meetings
export const UpcomingList = styled(SkyBox)({
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
});

export const UpcomingItem = styled(SkyBox)(({ theme }) => ({
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    paddingLeft: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    cursor: 'pointer',
    padding: '4px 0 4px 10px',
    transition: 'background-color 0.2s',
    '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : '#F8FAFC',
    },
}));

export const UpcomingDateText = styled('span')(({ theme }) => ({
    fontSize: '10.5px',
    fontWeight: 600,
    color: theme.palette.text.secondary,
}));

export const UpcomingTimeText = styled('span')(({ theme }) => ({
    fontSize: '11px',
    fontWeight: 700,
    color: theme.palette.text.primary,
}));

export const UpcomingTitleText = styled('span')(({ theme }) => ({
    fontSize: '12px',
    fontWeight: 600,
    color: theme.palette.text.primary,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
}));

export const UpcomingMetaRow = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '10px',
    color: '#64748B',
});

export const UpcomingMetaItem = styled(SkyBox)({
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    '& svg': {
        width: '12px',
        height: '12px',
    },
});


