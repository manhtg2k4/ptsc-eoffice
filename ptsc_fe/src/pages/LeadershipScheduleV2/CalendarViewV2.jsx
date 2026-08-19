import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeadershipScheduleV2 } from '@redux/slices/LeadershipSchedule/LeadershipScheduleV2Slice';
import { styled, alpha, useTheme } from '@mui/material/styles';
import { Box, MenuItem, Tooltip, Select, IconButton, Menu } from '@mui/material';
import { getComponentByKey } from '@builder-table/components/componentRegistry';
import { openDetailDialog } from '@components/GlobalDialogPortal';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import RobotoRegular from './fonts/Roboto-Regular.ttf';
import { CalendarToday, Add, FileDownload } from '@mui/icons-material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import ImportExcel from '@components/ImportExcel';
import { SkyBox, SkyButton } from '@styles/SkyStyles';
import Loading from '@components/Loading/Loading';
import api from '@services/api';
import { API_GET_WEEK } from '@EnvironmentFile/constants/urlConfig';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.locale('vi');

const Container = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius * 1.25,
    boxShadow: theme.palette.mode === 'light' ? '0 2px 4px rgba(0,0,0,0.07)' : theme.shadows[1],
    padding: '8px 0 0 0',
}));

const NavBar = styled(SkyBox)(({ theme }) => ({
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    minHeight: '58px',
    backgroundColor: theme.palette.background.paper,
    marginBottom: '6px',
}));

const LeftBox = styled(Box)(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
}));

const RightBox = styled(Box)(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: 'auto',
}));

const DateRangeLabel = styled('span')(({ theme }) => ({
    fontSize: theme.typography.body1.fontSize,
    fontWeight: 600,
    lineHeight: '24px',
    color: '#5A6573',
    marginRight: '16px',
    fontFamily: theme.typography.fontFamily,
}));

const ViewTodayButton = styled(SkyButton)(({ theme }) => ({
    height: '39px',
    minWidth: '100px',
    borderRadius: theme.shape.borderRadius * 1.25,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: `1px solid ${theme.palette.primary.main}`,
    textTransform: 'none',
    fontSize: theme.typography.body1.fontSize,
    fontWeight: 500,
    lineHeight: '24px',
    boxShadow: 'none',
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
        borderColor: theme.palette.primary.dark,
        boxShadow: 'none',
    },
}));

const DateFilterBox = styled(Box)(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
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
    borderTopRightRadius: (theme.shape.borderRadius * 1.25) - 1,
    borderBottomRightRadius: (theme.shape.borderRadius * 1.25) - 1,
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
    }
}));

const SelectEmptyIcon = () => null;

const CustomSelect = styled(Select)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    minWidth: '145px',
    width: '100%',
    height: '39px',
    borderRadius: theme.shape.borderRadius * 1.25,
    color: theme.palette.primary.main,
    '& .MuiSelect-select': {
        paddingTop: '8px',
        paddingRight: '46px',
        paddingBottom: '8px',
        paddingLeft: '16px',
        fontSize: theme.typography.body1.fontSize,
        fontWeight: 500,
        lineHeight: '24px',
        color: theme.palette.primary.main,
    },
    '& .MuiOutlinedInput-notchedOutline': {
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
    },
}));

const ActionIconButton = styled(SkyButton)(({ theme }) => ({
    minWidth: '40px',
    width: '40px',
    height: '40px',
    borderRadius: theme.shape.borderRadius * 1.25,
    backgroundColor: '#FFFFFF',
    border: '1px solid #5A6573',
    color: '#5A6573',
    padding: 0,
    boxShadow: 'none',
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
        borderColor: '#5A6573',
        boxShadow: 'none',
    },
    '& svg': {
        fontSize: '1.35rem',
    },
}));

const AddButton = styled(SkyButton)(({ theme }) => ({
    height: '39px',
    minWidth: '120px',
    borderRadius: theme.shape.borderRadius * 1.25,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: `1px solid ${theme.palette.primary.main}`,
    textTransform: 'none',
    fontSize: theme.typography.body1.fontSize,
    fontWeight: 500,
    lineHeight: '24px',
    display: 'inline-flex',
    gap: '8px',
    padding: '0 16px',
    boxShadow: 'none',
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
        borderColor: theme.palette.primary.dark,
        boxShadow: 'none',
    },
    '& .MuiButton-startIcon': {
        marginRight: 0,
    },
    '& svg': {
        fontSize: '1rem',
    },
}));

const ViewSwitchContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    borderRadius: theme.shape.borderRadius * 1.25,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    overflow: 'hidden',
    height: '39px',
}));

const ViewSwitchButton = styled(IconButton, {
    shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
    borderRadius: 0,
    width: '39px',
    height: '39px',
    color: active ? theme.palette.primary.contrastText : theme.palette.primary.main,
    backgroundColor: active ? theme.palette.primary.main : 'transparent',
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
    },
    '& svg': {
        fontSize: '1.25rem',
    },
}));

const TableContainer = styled('div')(({ theme }) => ({
    width: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 270px)',
    borderRadius: theme.shape.borderRadius * 1.25,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
}));

const StyledTable = styled('table')({
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
});

const Th = styled('th')(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'light' ? '#F9FBFB' : theme.palette.primary.main,
    color: theme.palette.mode === 'light' ? theme.palette.text.primary : theme.palette.primary.contrastText,
    fontFamily: theme.typography.fontFamily,
    fontWeight: 600,
    textTransform: 'uppercase',
    padding: '0 10px',
    height: '100px',
    fontSize: theme.typography.caption.fontSize,
    lineHeight: '20px',
    letterSpacing: 0,
    border: `1px solid ${theme.palette.divider}`,
    textAlign: 'left',
    verticalAlign: 'middle',
    '&:nth-of-type(1)': { width: '16%', paddingLeft: '48px' },
    '&:nth-of-type(2)': { width: '18%', padding: '20px' },
    '&:nth-of-type(3)': { width: '30%' },
    '&:nth-of-type(4)': { width: '36%' },
}));

const DataRow = styled('tr', {
    shouldForwardProp: (prop) => prop !== 'isToday',
})(({ theme, isToday }) => ({
    '& td': {
        backgroundColor: isToday
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.1 : 0.2)
            : theme.palette.background.paper,
    },
}));

const DataCell = styled('td', {
    shouldForwardProp: (prop) => prop !== 'isToday',
})(({ theme, isToday }) => ({
    border: `1px solid ${theme.palette.divider}`,
    padding: '20px 10px',
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body2.fontSize,
    color: theme.palette.text.primary,
    verticalAlign: 'middle',
    lineHeight: '22px',
    fontWeight: 400,
    ...(isToday && {
        color: theme.palette.primary.main,
    }),
}));

const DayCell = styled(DataCell)(({ theme, isToday }) => ({
    fontWeight: 600,
    textTransform: 'uppercase',
    paddingLeft: '48px',
    color: isToday ? theme.palette.primary.main : theme.palette.text.primary,
    backgroundColor: isToday 
        ? 'transparent' 
        : (theme.palette.mode === 'light' ? '#F9FBFB !important' : 'inherit'),
}));

const DateCell = styled(DataCell)(({ theme, isToday }) => ({
    fontWeight: 600,
    color: isToday ? theme.palette.primary.main : theme.palette.text.primary,
    padding: '20px',
}));

const LeaderCell = styled(DataCell)(({ theme }) => ({
    '& .name': {
        fontSize: theme.typography.body2.fontSize,
        lineHeight: '22px',
        fontWeight: 600,
        color: theme.palette.primary.main,
        marginBottom: '4px',
    },
    '& .title': {
        fontSize: theme.typography.body2.fontSize,
        lineHeight: '22px',
        fontWeight: 400,
        color: theme.palette.text.secondary,
    },
}));

const NoteCell = styled(DataCell)(({ theme }) => ({
    color: theme.palette.text.primary,
}));

const SelectMenuItem = styled(MenuItem)(({ theme }) => ({
    fontSize: theme.typography.body1.fontSize,
    lineHeight: '24px',
    '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
    },
    '&.Mui-selected:hover': {
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
    },
}));

const CalendarViewV2 = (props) => {
    const { fnCode, onSwitchView } = props;
    const theme = useTheme();
    const dispatch = useDispatch();
    const { data: scheduleData, loading: isLoading } = useSelector((state) => state.leadershipScheduleV2);
    const { crmSource } = useSelector((state) => state.config);

    const yearOptions = useMemo(
        () => crmSource?.find((item) => item.code === 'YEAR')?.data || [],
        [crmSource]
    );
    const yearOptionValues = useMemo(
        () => yearOptions.map((item) => Number(item.value)).filter(Number.isFinite).sort((a, b) => a - b),
        [yearOptions]
    );
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [canIncreaseWeek, setCanIncreaseWeek] = useState(false);
    const [canDecreaseWeek, setCanDecreaseWeek] = useState(false);
    const [isNavigatingWeek, setIsNavigatingWeek] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [anchorEl, setAnchorEl] = useState(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const weeksCacheRef = useRef(new Map());
    const weeksRequestRef = useRef(new Map());
    const openMenu = Boolean(anchorEl);

    const selectedYear = dayjs(currentDate).isoWeekYear();
    const selectedWeek = dayjs(currentDate).isoWeek();

    const scheduleItems = useMemo(() => scheduleData?.items?.[0]?.details || [], [scheduleData]);

    const fetchData = useCallback(() => {
        dispatch(fetchLeadershipScheduleV2({
            page: 1,
            limit: 25,
            'filter[week]': selectedWeek,
            'filter[year]': selectedYear,
            processFn: fnCode,
        }));
    }, [dispatch, fnCode, selectedWeek, selectedYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const normalizeWeeks = useCallback((weeks) => {
        if (!Array.isArray(weeks)) return [];
        return [...new Set(
            weeks
                .map((week) => Number(week))
                .filter((week) => Number.isInteger(week) && week > 0)
        )];
    }, []);
    const fetchAvailableWeeks = useCallback(async (year) => {
        if (!Number.isInteger(year)) return [];
        const cachedWeeks = weeksCacheRef.current.get(year);
        if (cachedWeeks) return cachedWeeks;
        const pendingRequest = weeksRequestRef.current.get(year);
        if (pendingRequest) return pendingRequest;
        const request = (async () => {
            try {
                const response = await api.get(`${API_GET_WEEK}?year=${year}`);
                const weeks = response?.data?.success ? normalizeWeeks(response?.data?.data || []) : [];
                weeksCacheRef.current.set(year, weeks);
                return weeks;
            } catch (error) {
                weeksCacheRef.current.set(year, []);
                return [];
            } finally {
                weeksRequestRef.current.delete(year);
            }
        })();
        weeksRequestRef.current.set(year, request);
        return request;
    }, [normalizeWeeks]);
    useEffect(() => {
        let isMounted = true;
        const fetchWeeks = async () => {
            const weeks = await fetchAvailableWeeks(selectedYear);
            if (isMounted) {
                setAvailableWeeks(weeks);
            }
        };
        fetchWeeks();
        return () => {
            isMounted = false;
        };
    }, [fetchAvailableWeeks, selectedYear]);
    const findAdjacentScheduledWeek = useCallback(async ({ currentYear, currentWeek, direction }) => {
        const isNext = direction === 'next';
        const currentYearIndex = yearOptionValues.indexOf(currentYear);
        const candidateYears = [];
        if (currentYearIndex >= 0) {
            const step = isNext ? 1 : -1;
            for (
                let index = currentYearIndex;
                index >= 0 && index < yearOptionValues.length;
                index += step
            ) {
                candidateYears.push(yearOptionValues[index]);
            }
        } else {
            candidateYears.push(currentYear);
        }
        for (const year of candidateYears) {
            const weeks = await fetchAvailableWeeks(year);
            if (!weeks.length) continue;
            const sortedWeeks = [...weeks].sort((a, b) => a - b);
            if (year === currentYear) {
                const targetWeek = isNext
                    ? sortedWeeks.find((week) => week > currentWeek)
                    : [...sortedWeeks].reverse().find((week) => week < currentWeek);
                if (targetWeek) {
                    return { year, week: targetWeek };
                }
                const hasCurrentWeek = sortedWeeks.includes(currentWeek);
                if (!hasCurrentWeek) {
                    const boundaryWeek = isNext
                        ? sortedWeeks[sortedWeeks.length - 1]
                        : sortedWeeks[0];
                    if (Number.isInteger(boundaryWeek)) {
                        return { year, week: boundaryWeek };
                    }
                }
                continue;
            }
            return isNext
                ? { year, week: sortedWeeks[0] }
                : { year, week: sortedWeeks[sortedWeeks.length - 1] };
        }
        return null;
    }, [fetchAvailableWeeks, yearOptionValues]);
    useEffect(() => {
        let isMounted = true;
        const checkWeekNavigationAvailability = async () => {
            const [nextWeek, previousWeek] = await Promise.all([
                findAdjacentScheduledWeek({ currentYear: selectedYear, currentWeek: selectedWeek, direction: 'next' }),
                findAdjacentScheduledWeek({ currentYear: selectedYear, currentWeek: selectedWeek, direction: 'prev' }),
            ]);
            if (!isMounted) return;
            setCanIncreaseWeek(Boolean(nextWeek));
            setCanDecreaseWeek(Boolean(previousWeek));
        };
        checkWeekNavigationAvailability();
        return () => {
            isMounted = false;
        };
    }, [findAdjacentScheduledWeek, selectedWeek, selectedYear]);
    const setDateByYearWeek = useCallback((yearNumber, weekNumber) => {
        const startOfIsoYear = dayjs(new Date(yearNumber, 0, 4)).startOf('isoWeek');
        setCurrentDate(startOfIsoYear.add(weekNumber - 1, 'week').toDate());
    }, []);
    const setDateByWeek = useCallback((weekNumber) => {
        setDateByYearWeek(selectedYear, weekNumber);
    }, [selectedYear, setDateByYearWeek]);
    const handleWeekChange = useCallback((e) => {
        setDateByWeek(parseInt(e.target.value, 10));
    }, [setDateByWeek]);
    const setDateByYear = useCallback((yearNumber) => {
        setDateByYearWeek(yearNumber, selectedWeek);
    }, [selectedWeek, setDateByYearWeek]);
    const handleYearChange = useCallback((e) => {
        setDateByYear(parseInt(e.target.value, 10));
    }, [setDateByYear]);
    const handleSelectStepMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);
    const handleIncreaseWeek = useCallback(async () => {
        if (isNavigatingWeek) return;
        setIsNavigatingWeek(true);
        try {
            const nextWeek = await findAdjacentScheduledWeek({
                currentYear: selectedYear,
                currentWeek: selectedWeek,
                direction: 'next',
            });
            if (nextWeek) {
                setDateByYearWeek(nextWeek.year, nextWeek.week);
            }
        } finally {
            setIsNavigatingWeek(false);
        }
    }, [findAdjacentScheduledWeek, isNavigatingWeek, selectedWeek, selectedYear, setDateByYearWeek]);
    const handleDecreaseWeek = useCallback(async () => {
        if (isNavigatingWeek) return;
        setIsNavigatingWeek(true);
        try {
            const previousWeek = await findAdjacentScheduledWeek({
                currentYear: selectedYear,
                currentWeek: selectedWeek,
                direction: 'prev',
            });
            if (previousWeek) {
                setDateByYearWeek(previousWeek.year, previousWeek.week);
            }
        } finally {
            setIsNavigatingWeek(false);
        }
    }, [findAdjacentScheduledWeek, isNavigatingWeek, selectedWeek, selectedYear, setDateByYearWeek]);

    const handleIncreaseYear = useCallback(() => {
        const currentIndex = yearOptionValues.indexOf(selectedYear);
        const nextYear = currentIndex >= 0 ? yearOptionValues[currentIndex + 1] : selectedYear + 1;
        if (nextYear) {
            setDateByYear(nextYear);
        }
    }, [selectedYear, yearOptionValues, setDateByYear]);

    const handleDecreaseYear = useCallback(() => {
        const currentIndex = yearOptionValues.indexOf(selectedYear);
        const nextYear = currentIndex >= 0 ? yearOptionValues[currentIndex - 1] : selectedYear - 1;
        if (nextYear) {
            setDateByYear(nextYear);
        }
    }, [selectedYear, yearOptionValues, setDateByYear]);

    const handleSetToday = useCallback(() => setCurrentDate(new Date()), []);
    const handleSwitchToCalendar = useCallback(() => onSwitchView('calendar'), [onSwitchView]);
    const handleSwitchToList = useCallback(() => onSwitchView('list'), [onSwitchView]);

    const dayNames = {
        1: 'Chủ nhật',
        2: 'Thứ hai',
        3: 'Thứ ba',
        4: 'Thứ tư',
        5: 'Thứ năm',
        6: 'Thứ sáu',
        7: 'Thứ bảy',
    };

    const getLeaderTitle = useCallback((dayItem) => {
        const title = (
            dayItem?.leaderPosition ||
            dayItem?.leaderTitle ||
            dayItem?.dutyLeader?.title ||
            dayItem?.position
        );
        return title && String(title).trim() ? title : '';
    }, []);

    const handleAdd = useCallback(() => {
        const componentInfo = getComponentByKey('CREATE_LEADER_DUTY_SCHEDULE');
        if (componentInfo) {
            openDetailDialog({
                ...componentInfo,
                defaultProps: {
                    ...componentInfo.defaultProps,
                    setReloadData: fetchData,
                },
            }, null);
        }
    }, [fetchData]);

    const handleOpenImport = useCallback(() => {
        setIsImportOpen(true);
    }, []);

    const handleCloseImport = useCallback(() => {
        setIsImportOpen(false);
    }, []);

    const handleOpenMenu = useCallback((event) => {
        setAnchorEl(event.currentTarget);
    }, []);

    const handleCloseMenu = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const pdfHeaderBg = theme.palette.mode === 'light' ? theme.palette.common.white : theme.palette.primary.main;
    const pdfHeaderColor = theme.palette.mode === 'light' ? theme.palette.text.primary : theme.palette.primary.contrastText;
    const pdfBorderColor = theme.palette.divider;
    const pdfTodayBg = alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.1 : 0.2);
    const pdfCellText = theme.palette.text.primary;
    const pdfTableBg = theme.palette.background.paper;

    const processExportExcel = useCallback((fileName = 'Lich_truc_lanh_dao.xlsx', tableId = 'leadership-schedule-table') => {
        const table = document.getElementById(tableId);
        if (!table) return;

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.table_to_sheet(table);

        ws['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 40 },
            { wch: 50 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Lịch trực');
        XLSX.writeFile(wb, fileName);
    }, []);

    const processExportPdf = useCallback(async (fileName = 'Lich_truc_lanh_dao.pdf', tableId = 'leadership-schedule-table') => {
        const table = document.getElementById(tableId);
        if (!table) return;

        const doc = new jsPDF('l', 'mm', 'a4');

        try {
            const response = await fetch(RobotoRegular);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                if (base64data) {
                    doc.addFileToVFS('Roboto-Regular.ttf', base64data);
                    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                    doc.setFont('Roboto');
                }

                doc.html(table, {
                    callback: function (pdfDoc) {
                        pdfDoc.save(fileName);
                    },
                    x: 10,
                    y: 10,
                    width: 280,
                    windowWidth: 1200,
                    html2canvas: {
                        useCORS: true,
                        backgroundColor: pdfTableBg,
                        onclone: (clonedDoc) => {
                            const clonedTable = clonedDoc.getElementById(tableId);
                            if (clonedTable) {
                                clonedTable.style.width = '1200px';
                                clonedTable.style.backgroundColor = pdfTableBg;

                                const ths = clonedTable.querySelectorAll('th');
                                ths.forEach((th) => {
                                    th.style.backgroundColor = pdfHeaderBg;
                                    th.style.color = pdfHeaderColor;
                                    th.style.border = `1px solid ${pdfBorderColor}`;
                                    th.style.padding = '12px';
                                });

                                const tds = clonedTable.querySelectorAll('td');
                                tds.forEach((td) => {
                                    td.style.backgroundColor = td.dataset.isToday === 'true' ? pdfTodayBg : pdfTableBg;
                                    td.style.border = `1px solid ${pdfBorderColor}`;
                                    td.style.color = pdfCellText;
                                });
                            }

                            const allElements = clonedDoc.body.getElementsByTagName('*');
                            for (let i = 0; i < allElements.length; i += 1) {
                                allElements[i].style.fontFamily = 'Roboto, sans-serif';
                            }
                        },
                    },
                });
            };

            reader.readAsDataURL(blob);
        } catch (error) {
            doc.html(table, {
                callback: function (pdfDoc) {
                    pdfDoc.save(fileName);
                },
                x: 10,
                y: 10,
                width: 280,
                windowWidth: 1200,
                html2canvas: {
                    useCORS: true,
                    backgroundColor: pdfTableBg,
                },
            });
        }
    }, [pdfBorderColor, pdfCellText, pdfHeaderBg, pdfHeaderColor, pdfTableBg, pdfTodayBg]);

    const handleExportCurrentView = useCallback((type) => {
        handleCloseMenu();
        if (type === 'excel') {
            processExportExcel('Lịch trực ban lãnh đạo.xlsx', 'leadership-schedule-table');
        } else {
            processExportPdf('Lịch trực ban lãnh đạo.pdf', 'leadership-schedule-table');
        }
    }, [handleCloseMenu, processExportExcel, processExportPdf]);

    const handleExportExcel = useCallback(() => handleExportCurrentView('excel'), [handleExportCurrentView]);
    const handleExportPdf = useCallback(() => handleExportCurrentView('pdf'), [handleExportCurrentView]);

    if (isLoading) return <Loading />;

    return (
        <Container>
            <NavBar>
                <LeftBox>
                    <DateRangeLabel>
                        {dayjs(currentDate).startOf('isoWeek').format('D/M/YYYY')} - {dayjs(currentDate).endOf('isoWeek').format('D/M/YYYY')}
                    </DateRangeLabel>

                    <ViewTodayButton variant="contained" onClick={handleSetToday}>
                        Hôm nay
                    </ViewTodayButton>

                    <DateFilterBox>
                        <SelectWrapper>
                            <CustomSelect
                                value={selectedWeek.toString()}
                                onChange={handleWeekChange}
                                size="small"
                                IconComponent={SelectEmptyIcon}
                            >
                                {availableWeeks.map((weekNum) => (
                                    <SelectMenuItem key={weekNum} value={String(weekNum)}>
                                        Tuần {weekNum}
                                    </SelectMenuItem>
                                ))}
                            </CustomSelect>
                            <SelectIconArea>
                                <SelectStepButton
                                    type="button"
                                    aria-label="Tăng tuần"
                                    disabled={isNavigatingWeek || !canIncreaseWeek}
                                    onMouseDown={handleSelectStepMouseDown}
                                    onClick={handleIncreaseWeek}
                                >
                                    <SelectChevronUp />
                                </SelectStepButton>
                                <SelectStepButton
                                    type="button"
                                    aria-label="Giảm tuần"
                                    disabled={isNavigatingWeek || !canDecreaseWeek}
                                    onMouseDown={handleSelectStepMouseDown}
                                    onClick={handleDecreaseWeek}
                                >
                                    <SelectChevronDown />
                                </SelectStepButton>
                            </SelectIconArea>
                        </SelectWrapper>

                        <SelectWrapper>
                            <CustomSelect
                                value={selectedYear.toString()}
                                onChange={handleYearChange}
                                size="small"
                                IconComponent={SelectEmptyIcon}
                            >
                                {yearOptions.map((item) => (
                                    <SelectMenuItem key={item.value} value={String(item.value)}>
                                        {item.title}
                                    </SelectMenuItem>
                                ))}
                            </CustomSelect>
                            <SelectIconArea>
                                <SelectStepButton
                                    type="button"
                                    aria-label="Tăng năm"
                                    disabled={selectedYear >= yearOptionValues[yearOptionValues.length - 1]}
                                    onMouseDown={handleSelectStepMouseDown}
                                    onClick={handleIncreaseYear}
                                >
                                    <SelectChevronUp />
                                </SelectStepButton>
                                <SelectStepButton
                                    type="button"
                                    aria-label="Giảm năm"
                                    disabled={selectedYear <= yearOptionValues[0]}
                                    onMouseDown={handleSelectStepMouseDown}
                                    onClick={handleDecreaseYear}
                                >
                                    <SelectChevronDown />
                                </SelectStepButton>
                            </SelectIconArea>
                        </SelectWrapper>
                    </DateFilterBox>
                </LeftBox>

                <RightBox>
                    <Tooltip title="Xuất file">
                        <ActionIconButton
                            variant="contained"
                            onClick={handleOpenMenu}
                            aria-controls={openMenu ? 'export-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={openMenu ? 'true' : undefined}
                        >
                            <FileDownload />
                        </ActionIconButton>
                    </Tooltip>

                    <Tooltip title="Nhập file">
                        <ActionIconButton
                            variant="contained"
                            onClick={handleOpenImport}
                        >
                            <ImportExportIcon />
                        </ActionIconButton>
                    </Tooltip>

                    <Menu
                        id="export-menu"
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleCloseMenu}
                        MenuListProps={{ 'aria-labelledby': 'export-button' }}
                    >
                        <MenuItem onClick={handleExportExcel}>Xuất Excel</MenuItem>
                        <MenuItem onClick={handleExportPdf}>Xuất PDF</MenuItem>
                    </Menu>

                    <Tooltip title="Thêm mới">
                        <AddButton onClick={handleAdd} variant="contained" startIcon={<Add />}>
                            Thêm mới
                        </AddButton>
                    </Tooltip>

                    <ViewSwitchContainer>
                        <Tooltip title="Dạng lịch">
                            <ViewSwitchButton active onClick={handleSwitchToCalendar}>
                                <CalendarToday />
                            </ViewSwitchButton>
                        </Tooltip>
                        <Tooltip title="Dạng danh sách">
                            <ViewSwitchButton onClick={handleSwitchToList}>
                                <ListAltIcon />
                            </ViewSwitchButton>
                        </Tooltip>
                    </ViewSwitchContainer>
                </RightBox>
            </NavBar>

            <TableContainer>
                <StyledTable id="leadership-schedule-table">
                    <thead>
                        <tr>
                            <Th>THỨ</Th>
                            <Th>NGÀY</Th>
                            <Th>LÃNH ĐẠO TRỰC</Th>
                            <Th>GHI CHÚ</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {scheduleItems.length === 0 ? (
                            <tr>
                                <DataCell colSpan={4} align="center">
                                    Chưa có dữ liệu lịch trực cho tuần này
                                </DataCell>
                            </tr>
                        ) : (
                            scheduleItems.map((dayItem, dIdx) => {
                                const isToday = dayjs().isSame(dayItem.dutyDate, 'day');
                                const leaderName = dayItem?.leaderName && String(dayItem.leaderName).trim() ? dayItem.leaderName : '';
                                const leaderTitle = getLeaderTitle(dayItem);

                                return (
                                    <DataRow key={dayItem.id || `day-${dIdx}`} isToday={isToday}>
                                        <DayCell isToday={isToday} data-is-today={isToday}>
                                            {dayNames[dayItem.dayOfWeek] || ''}
                                        </DayCell>
                                        <DateCell isToday={isToday} data-is-today={isToday}>
                                            {dayItem.dutyDate ? dayjs(dayItem.dutyDate).format('DD/MM/YYYY') : ''}
                                        </DateCell>
                                        <LeaderCell isToday={isToday} data-is-today={isToday}>
                                            {leaderName && <div className="name">{leaderName}</div>}
                                            {leaderTitle && <div className="title">{leaderTitle}</div>}
                                        </LeaderCell>
                                        <NoteCell isToday={isToday} data-is-today={isToday}>
                                            {dayItem.notes || ''}
                                        </NoteCell>
                                    </DataRow>
                                );
                            })
                        )}
                    </tbody>
                </StyledTable>
            </TableContainer>

            <ImportExcel
                open={isImportOpen}
                onClose={handleCloseImport}
                endpoint="/api/leadership-duty-schedules/import"
                title="Nhập lịch trực chỉ huy từ Excel"
                templateKey="IMPORT_LEADERSHIP_DUTY_ROSTER_TEMPLATE"
                setReloadData={fetchData}
            />
        </Container>
    );
};

export default CalendarViewV2;


