import { SkyBox, SkyButton, SkyTypography } from '@styles/SkyStyles';
import { styled, keyframes } from '@mui/material/styles';
import { Popover } from '@mui/material';

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Container = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isFullScreen',
})(({ theme, isFullScreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: isFullScreen ? '100vh' : 'auto',
    width: isFullScreen ? '100vw' : '100%',
    position: isFullScreen ? 'fixed !important' : 'relative',
    top: 0,
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
    gap: '5px',
    '@media (max-width: 1024px)': {
        gap: '5px',
        flexWrap: 'wrap',
    },
    '@media (max-width: 768px)': {
        gap: '3px',
    },
}));

export const TodayButton = styled(SkyButton)(({ theme }) => ({
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: 'none',
    padding: '6px 12px',
    cursor: 'pointer',
    borderRadius: '3px',
    marginRight: '5px',
    fontWeight: 500,
    '&:hover': {
        opacity: 0.9,
    },
    '@media (max-width: 768px)': {
        padding: '5px 8px',
        fontSize: '11px',
        marginRight: '3px',
    },
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
        background: theme.palette.action.hover,
    },
    '@media (max-width: 768px)': {
        width: '32px',
        height: '32px',
        minWidth: '32px',
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
    '@media (max-width: 768px)': {
        padding: '0 8px',
        fontSize: '16px',
    },
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

export const ViewSwitcher = styled(SkyBox)(() => ({
    display: 'flex',
    maxHeight: '24px',
    height: '24px',
    '@media (max-width: 768px)': {
        width: '100%',
        justifyContent: 'center',
    },
}));

export const ViewSwitchButton = styled(SkyButton, {
    shouldForwardProp: (prop) => prop !== '$active',
})(({ theme, $active }) => ({
    color: $active ? theme.palette.primary.contrastText : theme.palette.text.primary,
    background: $active ? theme.palette.primary.main : 'transparent',
    border: 'none',
    padding: '6px 15px',
    cursor: 'pointer',
    borderRadius: $active ? '15px' : '0',
    transition: 'all 0.2s',
    '&:hover': {
        background: theme.palette.action.hover, // Sử dụng màu hover của theme
        color: theme.palette.text.primary,
        borderRadius: '15px',
    },
    '@media (max-width: 768px)': {
        padding: '5px 10px',
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
    height: isFullScreen ? 'auto' : 'calc(100vh - 500px)',
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
    borderBottom: '1px solid transparent',
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

// Sửa GridLine để bỏ border
export const GridLine = styled(SkyBox)(() => ({
    height: '40px',
    boxSizing: 'border-box',
    borderBottom: 'none', // Đã bỏ border
}));



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
        justifyContent: 'center',
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
    minWidth: '800px',
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
    borderBottom: 'none',
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
    color: 'inherit'
}));

export const ChipText = styled(SkyTypography)(() => ({
    fontSize: '10px',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'inherit', // Thừa hưởng màu từ parent (WeekEventChip)
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
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary,
        borderRadius: '4px',
        backgroundColor: style.background,
        borderLeft: `3px solid ${style.color}`,
        '@media (max-width: 768px)': {
            fontSize: '9px',
            padding: '1px 2px',
            marginBottom: '1px',
            maxWidth: '100%',
        },
    };
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
    padding: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
    '@media (max-width: 768px)': {
        flexDirection: 'column',
        gap: '15px',
        padding: '12px 10px',
    },
}));

export const FooterSection = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    color: theme.palette.text.primary,
    '@media (max-width: 768px)': {
        gap: '6px',
    },
}));

export const LegendGrid = styled(SkyBox)(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    '@media (max-width: 768px)': {
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
    },
}));

export const LegendItem = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: theme.palette.text.primary,
}));

export const LegendBox = styled(SkyBox, {
    shouldForwardProp: (prop) => !['fillColor', 'edgeColor'].includes(prop),
})(({ theme, fillColor, edgeColor }) => ({
    width: '25px',
    height: '14px',
    marginRight: '8px',
    borderRadius: '3px',
    backgroundColor: fillColor,
    borderLeft: `4px solid ${edgeColor}`,
    color: theme.palette.text.primary,
}));

export const NoteSection = styled(SkyBox)({
    display: 'flex',
    flexDirection: 'column',
});

// const SectionTitle = styled(SkyTypography)(({ theme }) => ({
//     fontWeight: 600,
//     marginBottom: theme.spacing(1),
//     fontSize: '1.1rem',
//     color: theme.palette.text.primary,
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
    maxWidth: '350px',
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
    maxWidth: '350px',
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
    zIndex: 1000,
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
    marginBottom: '3px',
    color: 'inherit',
}));

export const EventTime = styled(SkyBox)(() => ({
    fontSize: '11px',
    color: 'inherit',
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
    borderBottom: `1px solid ${theme.palette.divider}`,
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
    };
});

export const DaySummaryEmpty = styled(SkyBox)(({ theme }) => ({
    textAlign: 'center',
    padding: '10px',
    color: theme.palette.text.disabled,
}));

export const StatsText = styled(SkyBox)(({ theme }) => ({
    fontWeight: 'bold',
    marginBottom: '5px',
    color: theme.palette.text.primary,
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
