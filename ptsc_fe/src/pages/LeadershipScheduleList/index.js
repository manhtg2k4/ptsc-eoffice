import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { fetchLeadershipSchedule } from '@redux/slices/LeadershipSchedule/LeadershipScheduleSlice';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import { unwrapResult } from '@reduxjs/toolkit';
import { useTheme, useMediaQuery } from '@mui/material';

// --- API & UTILS ---
import CustomTable from "@components/CustomTable/CustomTableStaticForCalendar";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.locale('vi');



// Define styled icons to avoid "sx/style prop forbidden" lint
// const StyledPdfIcon = styled(PictureAsPdf)({
//     color: '#d32f2f',
// });

// const StyledExcelIcon = styled(Description)({
//     color: '#1b5e20',
// });

// ==========================================
// MAIN COMPONENT
// ==========================================

const LeadershipScheduleList = (props) => {
    const {  fnCode, params, onSelectWeek } = props;
    const { year, month } = params || {};
    const dispatch = useDispatch();
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down('md'));
    const [selectedRows, setSelectedRows] = useState([]);
    const [isLoadingTable, setIsLoadingTable] = React.useState(false);
    const [tableDataLength, setTableDataLength] = useState(0);


    const columns = useMemo(() => [
        {
            row: 'meetingWeek',
            label: 'Lịch tuần',
            align: 'left',
            width: 150,
        },
        {
            row: 'meetingFrom',
            label: 'Từ ngày',
            align: 'left',
            width: 100,
            render: (row) => row.meetingFrom ? dayjs(row.meetingFrom).format('DD/MM') : ''
        },
        {
            row: 'meetingTo',
            label: 'Đến ngày',
            align: 'left',
            width: 100,
            render: (row) => row.meetingTo ? dayjs(row.meetingTo).format('DD/MM') : ''
        },
        {
            row: 'meetingYear',
            label: 'Năm',
            align: 'left',
            width: 80,
        },
        {
            row: 'meetingUpdate',
            label: 'Ngày cập nhật nội dung',
            align: 'left',
            width: 200,
            render: (row) => row.meetingUpdate ? dayjs(row.meetingUpdate).format('DD/MM/YYYY') : ''
        },
        {
            row: 'meetingTimeUpdate',
            label: 'Thời gian cập nhật',
            align: 'left',
            width: 150,
        },
    ], []);

    // Add custom actions column if actions are provided
    const columnsWithActions = useMemo(() => {
        if (!props.actions || props.actions.length === 0) {
            return columns;
        }
        return [
            ...columns,
            {
                row: 'customActions',
                label: 'Hành động',
                align: 'center',
                width: 120,
                render: (row) => {
                    return (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {props.actions.map((action, index) => {
                                const handleClick = (e) => {
                                    e.stopPropagation();
                                    if (action.onClick) {
                                        // Extract week info from row
                                        const weekStr = row.meetingWeek || "";
                                        const match = weekStr.match(/(\d+)/);
                                        const weekNumber = match ? parseInt(match[0], 10) : null;
                                        const weekInfo = {
                                            week: weekNumber,
                                            year: row.meetingYear,
                                            id: row.id || row._id
                                        };
                                        action.onClick(weekInfo, row, e);
                                    }
                                };

                                return (
                                    <div key={`action-${index}`} onClick={handleClick} style={{ display: 'inline-flex' }}>
                                        {action.component}
                                    </div>
                                );
                            })}
                        </div>
                    );
                }
            }
        ];
    }, [columns, props.actions]);

    // const actions = useMemo(() => [
    //     {
    //         id: 'pdf',
    //         config: {
    //             displayName: 'Tải PDF',
    //             icon: <StyledPdfIcon />,
    //         }
    //     },
    //     {
    //         id: 'excel',
    //         config: {
    //             displayName: 'Tải Excel',
    //             icon: <StyledExcelIcon />,
    //         }
    //     }
    // ], []);

    // const handleAction = useCallback((action, row) => {
    //     // Suppress unused variable warning by using them in a controlled way or valid code
    //     if (action.id === 'pdf') {
    //         // console.log("Download PDF for", row);
    //     } else if (action.id === 'excel') {
    //         // console.log("Download Excel for", row);
    //     }
    //     // Temporary usage to avoid lint error until implementation
    //     if (row) return;
    // }, []);

    const handleSelectRows = useCallback((selection) => {
        // CustomTable with selectionReturns="object" will pass array of full row objects
        if (Array.isArray(selection)) {
            // Updated to handle MULTIPLE selections
            setSelectedRows(selection);

            // Gọi callback của parent để chuyển view về tuần đã chọn
            if (onSelectWeek) {
                const selectedWeeksInfo = selection.map(item => {
                    if (!item) return null;
                    const weekStr = item.meetingWeek || "";
                    const match = weekStr.match(/(\d+)/);
                    const weekNumber = match ? parseInt(match[0], 10) : null;
                    return {
                        week: weekNumber,
                        year: item.meetingYear,
                        id: item._id || item.id
                    };
                }).filter(info => info && info.week && info.year);

                onSelectWeek(selectedWeeksInfo);
            }
        }
    }, [onSelectWeek]);

    const getData = useCallback(async (tableParams) => {
        setIsLoadingTable(true);
        try {
            const actionResult = await dispatch(fetchLeadershipSchedule({
                page: tableParams?.page || 1,
                limit: tableParams?.limit || 25,
                type: 'list',
                processFn: fnCode,
                'year': year,
                'month': month,
            }));
            const response = unwrapResult(actionResult);
            
            // Create unique IDs for rows to ensure selection works correct across pages/filters
            const itemsWithIds = (response?.items || []).map(item => {
                const weekStr = item.meetingWeek || "";
                const match = weekStr.match(/(\d+)/);
                const weekNumber = match ? parseInt(match[0], 10) : 0;
                return {
                    ...item,
                    // Use composite key as ID: Year_Week. Fallback to original ID if parsing fails.
                    id: (item.meetingYear && weekNumber) ? `${item.meetingYear}_${weekNumber}` : (item.id || item._id)
                };
            });
            setTableDataLength(itemsWithIds.length);

            return {
                data: itemsWithIds,
                total: response?.total || 0,
            };

        } catch (error) {
            // console.error("Failed to fetch schedule list:", error);
            return { data: [], total: 0 };
        } finally {
            setIsLoadingTable(false);
        }
    }, [dispatch, fnCode, year, month]);

    const dynamicTableMaxHeight = useMemo(() => {
        if (isMobileOrTablet) return 450;
        if (tableDataLength <= 5) return 540;
        if (tableDataLength <= 10) return 500;
        return 420;
    }, [isMobileOrTablet, tableDataLength]);


    return (
        // <Container>
            // <TableWrapper>
                <CustomTable
                    columns={columnsWithActions}
                    fetchData={getData}
                    selection={selectedRows}
                    onSelectionChange={handleSelectRows}
                    loading={isLoadingTable}
                    disableAdd
                    disableAct
                    noneTitle
                    disableDeletePQ
                    disableDelete
                    disableSearch
                    // disableSelectAll
                    disableSynchronize
                    customMaxHeight={dynamicTableMaxHeight}
                    selectionReturns="object"
                    fixedHeight
                    onlyTable
                    paginationProps={{ enabled: true }}
                />
            // </TableWrapper>
        // </Container>
    );
};

export default LeadershipScheduleList;
