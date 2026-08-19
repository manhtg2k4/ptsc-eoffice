import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear'; 
import isLeapYear from 'dayjs/plugin/isLeapYear';

// --- API ---
import axiosInstance from "@utils/axiosInstance";
import { API_GET_LEADERS, APP_BASE, API_TRAVEL_WORK_SCHEDULES } from "@EnvironmentFile/constants/urlConfig";
import { SkyBox, SkyButton } from '@styles/SkyStyles';
import Loading from '@components/Loading/Loading';
// import DynamicActionBar from '@components/DynamicActionBar/DynamicActionBar';

// Initialize dayjs
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);
dayjs.extend(isLeapYear);
dayjs.locale('vi');

// --- CONSTANTS & HELPERS ---
const DAY_NAMES = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const formatDateStr = (date) => {
    return dayjs(date).format('DD/MM/YYYY');
};

const getWeekDays = (currentDate) => {
    const tempDate = new Date(currentDate);
    const day = tempDate.getDay();
    // Logic: Nếu là Chủ Nhật (0) -> lùi 6 ngày để về Thứ 2
    // Nếu là Thứ 2 (1) -> giữ nguyên (1 - 1 + 1)
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

const getWeekNumber = (date) => {
    return dayjs(date).isoWeek();
};

// ==========================================
// STYLED COMPONENTS
// ==========================================

const Container = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isFullScreen',
})(({ theme, isFullScreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: isFullScreen ? '100vw' : '100%',
    height: isFullScreen ? '100vh' : '100%',
    fontFamily: '"Segoe UI", sans-serif',
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    ...(isFullScreen && {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        border: 'none',
        maxWidth: '100vw',
        overflow: 'hidden',
    }),
}));

const NavBar = styled(SkyBox)(({ theme }) => ({
    padding: '4px 0px',
    background: theme.palette.background.paper,
    // borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '15px',
    flexWrap: 'wrap',
    [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '10px',
    },
}));

const TodayButton = styled(SkyButton)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main, 
    color: theme.palette.primary.contrastText,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    fontWeight: 500,
    fontSize: '13px',
    textTransform: 'none',
    whiteSpace: 'nowrap',
    '&:hover': { backgroundColor: theme.palette.primary.dark },
}));

const NavControls = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    [theme.breakpoints.down('sm')]: {
        width: '100%',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
}));

// --- CUSTOM SELECT WITH DOUBLE TRIANGLE ICON ---
const StyledSelect = styled('select')(({ theme }) => ({
    padding: '8px 30px 8px 12px', // Tăng padding phải để tránh đè icon
    borderRadius: '4px',
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
    minWidth: '120px',
    height: '40px', // Chiều cao khớp với button
    
    // Ẩn arrow mặc định của trình duyệt
    appearance: 'none', 
    WebkitAppearance: 'none',
    MozAppearance: 'none',

    // Tạo Custom Icon bằng SVG Data URI (2 hình tam giác)
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23555'%3E%3Cpath d='M7 14l5 5 5-5H7z'/%3E%3Cpath d='M7 10l5-5 5 5H7z'/%3E%3C/svg%3E")`, 
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px 16px', // Kích thước icon

    '&:focus': {
        borderColor: theme.palette.primary.main,
    },
    '&:hover': {
        borderColor: theme.palette.text.secondary,
    }
}));

const DateRangeLabel = styled('span')(({theme}) => ({
    fontSize: '16px',
    fontWeight: 'bold',
    color: theme.palette.primary.main, // Sử dụng màu primary cho đồng bộ
    marginLeft: '10px',
}));

// --- TABLE LAYOUT ---
const TableContainer = styled(SkyBox)(({ theme }) => ({
    flex: 1,
    overflow: 'auto',
    padding: '0',
    position: 'relative',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
}));

const StyledTable = styled('table')(({ theme }) => ({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    border: `1px solid ${theme.palette.divider}`,
}));

const TableHead = styled('thead')(() => ({
    position: 'sticky',
    top: 0,
    zIndex: 10,
}));

const TableHeaderCell = styled('th')(({ theme }) => ({
    backgroundColor: '#F9FBFB',
    color: theme.palette.text.primary,
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    border: `1px solid ${theme.palette.divider}`,
}));

const TableRow = styled('tr', {
    shouldForwardProp: (prop) => prop !== 'isToday'
})(({ theme, isToday }) => ({
    backgroundColor: isToday ? theme.palette.action.selected : theme.palette.background.paper, 
    borderBottom: `1px solid ${theme.palette.divider}`,
    transition: 'background-color 0.2s',
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
    },
}));

const TableCell = styled('td')(({ theme }) => ({
    padding: '28px 12px',
    color: theme.palette.text.primary,
    verticalAlign: 'middle',
    border: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('sm')]: {
        padding: '12px 8px',
    },
}));

const DayNameCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'isToday'
})(({ theme, isToday }) => ({
    fontWeight: 'bold',
    width: '150px',
    color: isToday ? theme.palette.primary.main : 'inherit',
    backgroundColor: isToday ? theme.palette.action.selected : '#F9FBFB',
}));

const DateCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'isToday'
})(({ theme, isToday }) => ({
    fontWeight: 'bold',
    width: '150px',
    color: isToday ? theme.palette.primary.main : 'inherit'
}));

const LeaderCell = styled(TableCell)({
    width: '30%',
});

const LeaderInfo = styled(SkyBox)({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
});

const LeaderPosition = styled('div', {
    shouldForwardProp: (prop) => prop !== 'isToday'
})(({ theme, isToday }) => ({
    fontSize: '14px',
    color: isToday ? theme.palette.primary.main : theme.palette.text.secondary,
}));

const LeaderName = styled('div', {
    shouldForwardProp: (prop) => prop !== 'isToday'
})(({ theme, isToday }) => ({
    fontSize: '14px',
    color: isToday ? theme.palette.primary.main : 'inherit',
    fontWeight: isToday ? 700 : 400
}));

const NoteCell = styled(TableCell)({
    fontStyle: 'italic',
});

const EmptyLeaderText = styled('span')(({ theme }) => ({
    color: theme.palette.text.disabled,
    fontSize: '13px'
}));

// const FooterNoteCell = styled(TableCell)({
//     padding: '0px !important'
// });

// const FooterNoteContainer = styled(SkyBox)(({ theme }) => ({
//     padding: '15px',
//     backgroundColor: theme.palette.action.hover,
//     display: 'flex',
//     gap: '10px'
// }));

// const NoteLabel = styled('span')(({ theme }) => ({
//     fontWeight: 'bold', 
//     color: theme.palette.primary.main, 
//     minWidth: '70px', 
//     whiteSpace: 'nowrap'
// }));

// const Footer = styled(SkyBox)(({ theme }) => ({
//     padding: '10px 15px',
//     borderTop: `1px solid ${theme.palette.divider}`,
//     textAlign: 'right',
//     fontSize: '11px',
//     color: theme.palette.text.secondary,
//     fontWeight: 500,
//     textTransform: 'uppercase',
//     background: theme.palette.background.paper,
// }));

// ==========================================
// COMPONENT LOGIC
// ==========================================

// ==========================================
// COMPONENT LOGIC
// ==========================================

const LeadershipDutyMeetingScheduleCalendar = ({ templateApiUrl, queryParams, reloadData, isFullScreen }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState([]);
    const [ ,setNotes] = useState([]); // State for notes
    const [isLoading, setIsLoading] = useState(false);
    const [leadersMap, setLeadersMap] = useState({});
    // 1. Fetch Leaders Map (ID -> Name, Position)
    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                const response = await axiosInstance.get(API_GET_LEADERS);
                if (response && response.data) {
                    const map = {};
                    const items = Array.isArray(response.data) ? response.data : (response.data.items || []);
                    items.forEach(leader => {
                        map[leader.id] = {
                            name: leader.name,
                            position: leader.position
                        };
                    });
                    setLeadersMap(map);
                }
            } catch (error) {
                // Silent error
            }
        };
        fetchLeaders();
    }, []);

    // 2. Fetch Schedule Data
    const fetchData = useCallback(async () => {
        if (!templateApiUrl) return;

        setIsLoading(true);
        const weekNum = getWeekNumber(currentDate);
        const year = dayjs(currentDate).isoWeekYear(); // Use calculated ISO year
        
        const apiUrl = `${APP_BASE}/api${templateApiUrl}`;

        const params = {
            ...queryParams,
            page: 1,
            limit: 100, 
            filter: {
                ...(queryParams?.filter || {}),
                year: year,
                week: weekNum
            },
            sort: {
                week: 1
            }
        };

        try {
            const response = await axiosInstance.get(apiUrl, { params });
            
            let items = [];
            if (Array.isArray(response)) {
                items = response;
            } else if (response?.data && Array.isArray(response.data)) {
                items = response.data;
            } else if (response?.items && Array.isArray(response.items)) {
                items = response.items;
            } else if (response?.data?.items && Array.isArray(response.data.items)) {
                items = response.data.items;
            }

            let flatData = [];
            items.forEach(schedule => {
                if (schedule.details && Array.isArray(schedule.details)) {
                    // Extract week number if it is a string like "Tuần 45"
                    let weekVal = schedule.week;
                    if (typeof weekVal === 'string') {
                        const match = weekVal.match(/\d+/);
                        if (match) {
                            weekVal = parseInt(match[0], 10);
                        }
                    }
                    const scheduleStartOfWeek = dayjs().year(schedule.year).isoWeek(weekVal).startOf('isoWeek');

                    schedule.details.forEach(detail => {
                         let d;
                         // Prioritize dutyDate if available (API data might have incorrect week number in title/metadata)
                         if (detail.dutyDate && dayjs(detail.dutyDate).isValid()) {
                             d = dayjs(detail.dutyDate);
                         } 
                         // Fallback to calculation if dutyDate is missing
                         else if (detail.dayOfWeek) {
                             const offset = (detail.dayOfWeek + 5) % 7;
                             d = scheduleStartOfWeek.add(offset, 'day');
                         }

                         if (d && d.isValid()) {
                             flatData.push({
                                 id: detail._id || `${schedule.id}_${detail.dayOfWeek}`,
                                 meetingDate: d.format('DD/MM/YYYY'),
                                 leaderId: detail.leaderId,
                                 leaderName: detail.leaderName,
                                 note: detail.notes,
                             });
                         }
                    });
                }
            });

            setScheduleData(flatData);

        } catch (error) {
            setScheduleData([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, templateApiUrl, queryParams, reloadData]);

    // 3. Fetch Notes
    const fetchNotes = useCallback(async () => {
        const weekNum = getWeekNumber(currentDate);
        const year = dayjs(currentDate).isoWeekYear();
        
        // Calculate start and end date of the week for filtering
        const d = dayjs().year(year).isoWeek(weekNum);
        const startOfWeek = d.startOf('isoWeek').format('YYYY-MM-DD');
        const endOfWeek = d.endOf('isoWeek').format('YYYY-MM-DD');

        try {
            const response = await axiosInstance.get(`${API_TRAVEL_WORK_SCHEDULES}/list/notes`, {
                params: {
                    page: 1,
                    limit: 25,
                    'filter[fromDate]': startOfWeek,
                    'filter[toDate]': endOfWeek
                }
            });
            
            const fetchedNotes = response?.data?.items || response?.items || [];
            setNotes(fetchedNotes);
        } catch (error) {
            // console.error("Error fetching notes", error);
            setNotes([]);
        }
    }, [currentDate]);

    useEffect(() => {
        fetchData();
        fetchNotes();
    }, [fetchData, fetchNotes]);

    const handleToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);
    
    // --- GENERATE DATA FOR SELECTS ---

    // 1. Generate Years: 1970 -> Current Year + 5
    const years = useMemo(() => {
        const currentY = new Date().getFullYear();
        const startY = 1970; // Bắt đầu từ 1970 theo yêu cầu
        const endY = currentY + 5;
        // Tạo mảng giảm dần (Năm mới nhất lên đầu)
        return Array.from({ length: endY - startY + 1 }, (_, i) => endY - i);
    }, []);

    // Sử dụng isoWeekYear để xác định năm theo tiêu chuẩn ISO 
    // (Đảm bảo khi chọn ngày đầu năm thuộc tuần của năm trước thì hiển thị đúng năm ISO)
    const currentYear = dayjs(currentDate).isoWeekYear();
    const currentWeekNum = getWeekNumber(currentDate);

    // 2. Generate Weeks: Dynamically based on selected year (52 or 53 weeks)
    const weeks = useMemo(() => {
        // Safe calculation: Jan 4th is always in the ISO year
        const totalWeeks = dayjs(new Date(currentYear, 0, 4)).isoWeeksInYear();
        return Array.from({ length: totalWeeks }, (_, i) => i + 1);
    }, [currentYear]);

    // --- HANDLERS ---

    const handleWeekChange = useCallback((e) => {
        const selectedWeek = parseInt(e.target.value);
        // Calculate date manually: Start of ISO Year + (Week - 1)
        const startOfIsoYear = dayjs(new Date(currentYear, 0, 4)).startOf('isoWeek');
        const newDate = startOfIsoYear.add(selectedWeek - 1, 'week').toDate();
        setCurrentDate(newDate);
    }, [currentYear]);

    const handleYearChange = useCallback((e) => {
        const selectedYear = parseInt(e.target.value);
        
        // Check weeks in new year using safe date
        const weeksInNewYear = dayjs(new Date(selectedYear, 0, 4)).isoWeeksInYear();
        
        let targetWeek = currentWeekNum;
        if (targetWeek > weeksInNewYear) {
            targetWeek = weeksInNewYear;
        }

        // Calculate date: Start of New ISO Year + (Target Week - 1)
        const startOfNewIsoYear = dayjs(new Date(selectedYear, 0, 4)).startOf('isoWeek');
        const newDate = startOfNewIsoYear.add(targetWeek - 1, 'week').toDate();
        setCurrentDate(newDate);
    }, [currentWeekNum]);

    const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
    
    const dateRangeStr = useMemo(() => {
        const start = weekDays[0];
        const end = weekDays[6];
        return `${formatDateStr(start)} - ${formatDateStr(end)}`;
    }, [weekDays]);

    const todayStr = formatDateStr(new Date());

    return (
        <Container isFullScreen={isFullScreen}>
            <NavBar>
                <TodayButton onClick={handleToday} variant="contained">Hiện Tại</TodayButton>
                
                <NavControls>
                    <StyledSelect 
                        value={currentWeekNum}
                        onChange={handleWeekChange}
                    >
                        {weeks.map(week => (
                            <option key={week} value={week}>Tuần {week.toString().padStart(2, '0')}</option>
                        ))}
                    </StyledSelect>

                    <StyledSelect 
                        value={currentYear}
                        onChange={handleYearChange}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>Năm {year}</option>
                        ))}
                    </StyledSelect>
                </NavControls>

                <DateRangeLabel>{dateRangeStr}</DateRangeLabel>
                {/* <DynamicActionBar actions={toolbarActions} onActionClick={handleAction} /> */}
            </NavBar>

            <TableContainer>
                {isLoading && <Loading />}
                
                <StyledTable>
                    <TableHead>
                        <tr>
                            <TableHeaderCell>THỨ</TableHeaderCell>
                            <TableHeaderCell>NGÀY</TableHeaderCell>
                            <TableHeaderCell>LÃNH ĐẠO TRỰC</TableHeaderCell>
                            <TableHeaderCell>GHI CHÚ</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <tbody>
                        {weekDays.map((date) => {
                            const dateStr = formatDateStr(date);
                            const dayName = DAY_NAMES[date.getDay()];
                            const isToday = dateStr === todayStr;
                            
                            const dayData = scheduleData.find(d => d.meetingDate === dateStr) || {};
                            const leaderInfo = leadersMap[dayData.leaderId] || {};

                            return (
                                <TableRow key={dateStr} isToday={isToday}>
                                    <DayNameCell isToday={isToday}>
                                        {dayName}
                                    </DayNameCell>
                                    
                                    <DateCell isToday={isToday}>
                                        {dateStr}
                                    </DateCell>
                                    
                                    <LeaderCell>
                                        {(dayData.leaderId && leaderInfo.name) || dayData.leaderName ? (
                                            <LeaderInfo>
                                                <LeaderPosition isToday={isToday}>{leaderInfo.position || 'Lãnh đạo'}</LeaderPosition>
                                                <LeaderName isToday={isToday}>{leaderInfo.name || dayData.leaderName}</LeaderName>
                                            </LeaderInfo>
                                        ) : (
                                            <EmptyLeaderText>--</EmptyLeaderText>
                                        )}
                                    </LeaderCell>
                                    
                                    <NoteCell>
                                        {dayData.note || ""}
                                    </NoteCell>
                                </TableRow>
                            );
                        })}
                        
                        {/* Notes Section Row */}
                        {/* <tr>
                            <FooterNoteCell colSpan={4}>
                                <FooterNoteContainer>
                                    <NoteLabel>
                                        GHI CHÚ:
                                    </NoteLabel>
                                    <div>
                                        {notes.length > 0 ? (
                                            notes.map((note, index) => (
                                                <div key={index} style={{ marginBottom: '4px' }}>{note}</div>
                                            ))
                                        ) : (
                                            <span style={{ fontStyle: 'italic', color: '#666' }}>&nbsp;Không có ghi chú</span>
                                        )}
                                    </div>
                                </FooterNoteContainer>
                            </FooterNoteCell>
                        </tr> */}
                    </tbody>
                </StyledTable>
            </TableContainer>

            {/* <Footer>
                TÂN CẢNG SÀI GÒN
            </Footer> */}
        </Container>
    );
};

export default LeadershipDutyMeetingScheduleCalendar;
