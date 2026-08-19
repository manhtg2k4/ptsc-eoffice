import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeadershipScheduleV2 } from '@redux/slices/LeadershipSchedule/LeadershipScheduleV2Slice';
import { getDataDetailLeadershipDutyRoster } from '@redux/slices/LeadershipDutyRoster/LeadershipDutyRosterSlice';
import { styled, useTheme, Box, useMediaQuery } from '@mui/material';
import CustomTableStaticForCalendar from '@components/CustomTable/CustomTableStaticForCalendar';
import ImportExcel from '@components/ImportExcel';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import { getComponentByKey } from '@builder-table/components/componentRegistry';
import { openDetailDialog } from '@components/GlobalDialogPortal';
import { LEADERSHIP_SCHEDULE_FILTER_CONFIG, LEADERSHIP_SCHEDULE_FILTERS } from './constants';
import api from '@services/api';
import { useToast } from "@components/common/ToastProvider";
import { API_LEADERSHIP_DUTY_SCHEDULE, DATA_TABLE_BPMN } from '@EnvironmentFile/constants/urlConfig';
import { deleteLeadershipDutySchedule } from '@services/leadershipDutyScheduleService';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);

// ==========================================
// STYLED COMPONENTS
// ==========================================

const Container = styled(Box)(() => ({
    padding: '10px 20px',
    backgroundColor: "inherit",
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    "& .MuiButton-root:has(.MuiSvgIcon-root[data-testid='SettingsIcon'])": {
        backgroundColor: "#FFFFFF !important",
        border: "1px solid #5A6573",
        color: "#5A6573 !important",
        boxShadow: "none !important",
    },
    "& .MuiButton-root:has(.MuiSvgIcon-root[data-testid='SettingsIcon']) .MuiSvgIcon-root": {
        color: "#5A6573 !important",
    },
    "& .MuiButton-root:has(.MuiSvgIcon-root[data-testid='SettingsIcon']):hover": {
        backgroundColor: "#F4F5F7 !important",
        borderColor: "#5A6573",
    },
}));


// ==========================================
// MAIN COMPONENT
// ==========================================

const ListViewV2 = (props) => {
    const { onSwitchView, fnCode } = props;
    const dispatch = useDispatch();
    const { data: scheduleData} = useSelector((state) => state.leadershipScheduleV2);
    
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const triggerReload = useCallback(() => setReloadTrigger(prev => prev + 1), []);
    const [advancedFilters, setAdvancedFilters] = useState({});
    const [isImportOpen, setIsImportOpen] = useState(false);
    
    const handleOpenImport = useCallback(() => {
        setIsImportOpen(true);
    }, []);
    
    const handleCloseImport = useCallback(() => {
        setIsImportOpen(false);
    }, []);
    const [appliedFilters, setAppliedFilters] = useState({}); 
    const [keyword, setKeyword] = useState('');
    const [searchCodes, setSearchCodes] = useState([]); 
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));
        const isFutureSchedule = useCallback((row) => {
        const dateStr = row.fromDate; 
        if (!dateStr) return false;

        const scheduleDate = dayjs(dateStr, 'DD/MM/YYYY');
        const today = dayjs().startOf('day');

        return scheduleDate.isValid() && scheduleDate.isAfter(today);
    }, []);

    const getData = useCallback(async (tableParams) => {
        const { page: paramPage, limit: paramLimit } = tableParams || {};
        const dynamicFilters = {};
        if (keyword && searchCodes && searchCodes.length > 0) {
            searchCodes.forEach(code => {
                dynamicFilters[`filter[${code}]`] = keyword;
            });
        }
        Object.keys(appliedFilters).forEach(key => {
            const value = appliedFilters[key];
            // Chỉ gửi những trường có giá trị (user không bỏ trống)
            if (value !== null && value !== undefined && value !== '') {
                dynamicFilters[`filter[${key}]`] = value;
            }
        });
        
        try {
            const response = await dispatch(fetchLeadershipScheduleV2({
                page: paramPage,
                limit: paramLimit,
                processFn: fnCode,
                ...dynamicFilters,
            })).unwrap();
            
            return {
                data: response?.items || [],
                total: response?.total || 0,
            };
        } catch (error) {
            logger.error("Lỗi khi tải lịch trực chỉ huy:", error);
            return { data: [], total: 0 };
        }
    }, [dispatch, fnCode, keyword, searchCodes, appliedFilters]);

    const toast = useToast();

    const handleExportAll = useCallback(async (tableParams) => {
        // tableParams là object do CustomTable truyền ra, chứa exportType ('pdf' hoặc 'excel')
        const { exportType, page: exportPage, limit: exportLimit } = tableParams || {};

        // 1. Lấy lại y hệt bộ lọc đang có (giống hệt hàm fetchData)
        const dynamicFilters = {};
        if (keyword && searchCodes && searchCodes.length > 0) {
            searchCodes.forEach(code => {
                dynamicFilters[`filter[${code}]`] = keyword;
            });
        }
        Object.keys(appliedFilters).forEach(key => {
            const value = appliedFilters[key];
            if (value !== null && value !== undefined && value !== '') {
                dynamicFilters[`filter[${key}]`] = value;
            }
        });

        const payload = {
            page: exportPage || 1,
            limit: exportLimit || 25,
            processFn: fnCode,
            exportType: exportType, 
            ...dynamicFilters
        };

        try {
            const response = await api.get(`${DATA_TABLE_BPMN}`, {
                params: payload,
                responseType: 'blob' 
            });
            return response.data || response; 
        } catch (error) {
            logger.error("Lỗi khi xuất file:", error);
            toast("Có lỗi xảy ra khi xuất file!", "error");
            return null;
        }
    },[fnCode, keyword, searchCodes, appliedFilters, toast]);

    // Dữ liệu được fetch tự động qua CustomTableStaticForCalendar

    const handleView = useCallback(async (rowOrId) => {
        const id = typeof rowOrId === 'object' ? (rowOrId.id || rowOrId._id) : rowOrId;
        if (!id) return;
        
        try {
            const result = await dispatch(getDataDetailLeadershipDutyRoster(id)).unwrap();
            const fullData = result?.items?.[0] || result;

            const componentInfo = getComponentByKey('VIEW_LEADER_DUTY_SCHEDULE');
            if (componentInfo && fullData) {
                openDetailDialog({
                    ...componentInfo,
                    defaultProps: {
                        ...componentInfo.defaultProps,
                        data: fullData,
                        setReloadData: triggerReload
                    }
                }, null);
            }
        } catch (error) {
            logger.error("Error fetching leadership schedule details:", error);
        }
    }, [dispatch, triggerReload]);

    const handleSearch = useCallback((text, codes) => {
        setKeyword(text);
        setSearchCodes(codes || []); 
    },[]);

    const handleAdvancedFieldChange = useCallback((key, value) => {
        setAdvancedFilters(prev => ({ ...prev, [key]: value }));
    },[]);

    const handleEdit = useCallback(async (rowOrId) => {
        const id = typeof rowOrId === 'object' ? (rowOrId.id || rowOrId._id) : rowOrId;
        if (!id) return;

        try {
            const result = await dispatch(getDataDetailLeadershipDutyRoster(id)).unwrap();
            const fullData = result?.items?.[0] || result;

            const componentInfo = getComponentByKey('UPDATE_LEADER_DUTY_SCHEDULE');
            if (componentInfo && fullData) {
                openDetailDialog({
                    ...componentInfo,
                    defaultProps: {
                        ...componentInfo.defaultProps,
                        data: fullData,
                        setReloadData: triggerReload
                    }
                }, null);
            }
        } catch (error) {
            logger.error("Error fetching leadership schedule details for update:", error);
        }
    }, [dispatch, triggerReload]);


    const handleApplyFilter = useCallback((filters) => {
        setAppliedFilters(filters);  
        setAdvancedFilters(filters); 
    },[]);

    const handleAdd = useCallback(() => {
        const componentInfo = getComponentByKey('CREATE_LEADER_DUTY_SCHEDULE');
        if (componentInfo) {
            openDetailDialog({
                ...componentInfo,
                defaultProps: {
                    ...componentInfo.defaultProps,
                    setReloadData: triggerReload
                }
            }, null);
        }
    }, [triggerReload]);

    const handleSetting = useCallback(() => {
        // Handle setting logic
    }, []);

    const handleBulkDelete = useCallback(async (selectedItems) => {
        // selectedItems có thể là mảng ID hoặc Object tùy cấu hình CustomTable
        // Nếu là ID, ta tìm lại object trong scheduleData.items
        const itemsToDelete = scheduleData?.items?.filter(item => 
            selectedItems.includes(item.id) || selectedItems.includes(item)
        ) || [];

        // Kiểm tra xem có mục nào không phải tương lai không
        const invalidItems = itemsToDelete.filter(item => !isFutureSchedule(item));
        
        if (invalidItems.length > 0) {
            toast("Không được xóa lịch hiện tại hoặc quá khứ!", "error");
            return;
        }

        const ids = itemsToDelete.map(item => item.id);

        try {
            await api.delete(`${API_LEADERSHIP_DUTY_SCHEDULE}/delete-many`, {
                data: { ids: ids },
            });
            toast("Xóa thành công", "success");
            triggerReload(); 
        } catch (error) {
            toast("Có lỗi xảy ra khi xóa", "error");
        }
    }, [toast, triggerReload, scheduleData, isFutureSchedule]);

    const handleRowDelete = useCallback(async (row) => {
        // Validate trước khi xóa
        if (!isFutureSchedule(row)) {
            toast("Không được xóa lịch hiện tại hoặc quá khứ!", "error");
            return;
        }

        const id = row.id || row._id;
        try {
            await deleteLeadershipDutySchedule(id);
            toast("Xóa thành công", "success");
            triggerReload();
        } catch (error) {
            toast("Có lỗi xảy ra khi xóa", "error");
        }
    }, [toast, triggerReload, isFutureSchedule]);


    // if (isLoading && page === 1) return <Loading />;

    return (
        <Container>
            {/* {isLoading && page === 1 && <Loading />}  */}
            <CustomTableStaticForCalendar
                fetchData={getData}
                reload={reloadTrigger}
                onExportAll={handleExportAll}
                fileName={`Danh_Sach_Lich_Truc_Chi_Huy`}
                advancedFilterConfig={LEADERSHIP_SCHEDULE_FILTER_CONFIG}
                advancedFilters={advancedFilters}
                onRowDelete={handleRowDelete}
                onDelete={handleBulkDelete}  
                onAdvancedFieldChange={handleAdvancedFieldChange}
                handleApplyFilterClick={handleApplyFilter}
                filter={LEADERSHIP_SCHEDULE_FILTERS}
                filtersAdvanced
                onSearch={handleSearch}
                customMaxHeight={isSmall ? 470 : 220}
                fixedHeight
                paperPaddingBottom={24}
                hideHeaderColumnResizer
                fullGridBorder
                searchToolbarVariant="unified"
                hasCheckbox
                onSwitchView={onSwitchView}
                viewMode="list"
                codeModule="LTCH"
                onAdd={handleAdd}
                onEdit={handleEdit}
                onView={handleView}
                onSetting={handleSetting}
                disableSynchronize
                isExportAll
                isSetting
                onImport={handleOpenImport}
                importIcon={<ImportExportIcon />}
            />

            <ImportExcel
                open={isImportOpen}
                onClose={handleCloseImport}
                endpoint="/api/leadership-duty-schedules/import"
                title="Nhập lịch trực chỉ huy từ Excel"
                templateKey="IMPORT_LEADERSHIP_DUTY_ROSTER_TEMPLATE"
                setReloadData={triggerReload}
            />
        </Container>
    );
};

export default ListViewV2;
