import React, { useState, useMemo, useCallback, useEffect } from 'react'
import api from '@services/api'
import {
    listTableSelectOptions
} from './constants'
import { API_EXPORT_FILE_REPORT, APP_DHVB_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from '@components/common/ToastProvider'
import LoadingDialog from '@components/LoadingDialog'
import { StyledDialogContent } from "@styles/CustomDialog.styles"
import { PageContainer } from '@styles/StatisticsAndReports/StatisticsAndReports.styles'
import { useMediaQuery, useTheme } from '@mui/material'
import CustomTableReports from '@components/CustomTableReports';
import { useSelector } from 'react-redux';
import axiosInstance from '@utils/axiosInstance';
import ListJobToReports from './ListJobToReports';
import { useLocation } from 'react-router-dom';

const DASHBOARD_DEPARTMENT_REPORT_TABLE = 'columnsPerformanceJobPerson'
const DEPARTMENT_REPORT_TYPE = 'department'
const DASHBOARD_FILTER_PARAM_BY_VIEW_CODE = {
    columnsPerformanceJobDepartmental: 'phongBan',
}

const buildDashboardFilterParams = (viewCode, id) => {
  if (!id) {
    return {}
  }
  const filterKey = DASHBOARD_FILTER_PARAM_BY_VIEW_CODE[viewCode]
  if (!filterKey) {
    return {}
  }
  return {
    [`filter[${filterKey}][]`]: id,
  }
}


const StatisticsAndReports = () => {
		const location = useLocation();
    const locationDepartmentId = useMemo(() => {
        const searchParams = new URLSearchParams(location.search || '');
        const fromQuery = searchParams.get('departmentId') || searchParams.get('deptId');
        const fromState = location.state?.departmentId || location.state?.deptId || location.state?.id;
        return fromQuery || fromState || null;
    }, [location.search, location.state]);

    const isFromDashboardDepartmentReport = Boolean(locationDepartmentId)

    const { userPermissions, isSuperAdmin } = useSelector((state) => state.users || {});
    const filteredOptions = useMemo(() => {
        const hasRoomStatistics = isSuperAdmin || userPermissions?.staticPermissions?.some(p => p.code === "RoomStatistics");
        if (hasRoomStatistics) {
            return listTableSelectOptions;
        }
        return listTableSelectOptions.filter(opt => opt.value !== 'columnsDeptWorkStats');
    }, [userPermissions, isSuperAdmin]);

    const [selectedTable, setSelectedTable] = useState(
        isFromDashboardDepartmentReport
            ? DASHBOARD_DEPARTMENT_REPORT_TABLE
            : listTableSelectOptions[0].value
    )
    const [loading, setLoading] = useState(false)
    const toast = useToast()
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const { dataViewConfig } = useSelector((state) => state.viewConfig)
    const [checkRoleGroup, setCheckRoleGroup] = useState(null)
    const isLeader = useMemo(() => checkRoleGroup?.isLeader, [checkRoleGroup?.isLeader])
    const [openListJob, setOpenListJob] = useState({
        open: false,
        idList: null
    })
    
 
    const [reportType, setReportType] = useState(
        isFromDashboardDepartmentReport ? DEPARTMENT_REPORT_TYPE : 'personal'
    )

    const fetchDataRoleGroup = useCallback(async () => {
        try {
            const response = await axiosInstance.get(`${APP_DHVB_BASE}/task-report/is-leader`)
            setCheckRoleGroup(response)
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi khi lấy thông tin", "error")
        }
    }, [toast])

    useEffect(() => {
        if(selectedTable === 'columnsPerformanceJobPerson') {
            fetchDataRoleGroup()
        }
    }, [fetchDataRoleGroup, selectedTable])

    useEffect(() => {
        if (!isFromDashboardDepartmentReport) {
            return
        }

        setSelectedTable(DASHBOARD_DEPARTMENT_REPORT_TABLE)
        setReportType(DEPARTMENT_REPORT_TYPE)
    }, [isFromDashboardDepartmentReport])

    // Đảm bảo reset về 'personal' nếu user không phải là leader
    useEffect(() => {
        if (checkRoleGroup && checkRoleGroup.isLeader === false) {
            setReportType('personal')
        }
    }, [checkRoleGroup?.isLeader,checkRoleGroup])


     
    const showRadioFilter = selectedTable === 'columnsPerformanceJobPerson'
 
    const effectiveViewConfigCode = useMemo(() => {
        if (selectedTable === 'columnsPerformanceJobPerson' && reportType === 'department') {
            return 'columnsPerformanceJobDepartmental';
        }
        return selectedTable;
    }, [selectedTable, reportType]);

    const selectedOption = useMemo(() => {
        return filteredOptions.find(opt => opt.value === selectedTable) || filteredOptions[0]
    }, [selectedTable, filteredOptions]);

    const configItem = useMemo(() => {
        let code = effectiveViewConfigCode;
        if (selectedTable === 'columnsPerformanceJobPerson' && reportType === 'department') {
            code = 'columnsPerformanceJobPerson';
        }
        const item = dataViewConfig?.find((item) => item.code === code);
        return item;
    }, [dataViewConfig, effectiveViewConfigCode, selectedTable, reportType]);
 
    const column = useMemo(() => {
        const fields = configItem?.field || [];
        return fields.map(f => {
            let title = f?.name || f?.title;
            let label = f?.label || f?.name || f?.title;
            let labelFilter = f?.labelFilter;
            let lableFilter = f?.lableFilter;
            let row = f?.code || f?.key;
            let apiUrl = f?.apiUrl;
            let code = f?.code;
            let key = f?.key;

            if (selectedTable === 'columnsPerformanceJobPerson' && reportType === 'department') {
                if (f?.apiUrlDepartment) {
                    apiUrl = f?.apiUrlDepartment;
                }
                if (f?.codeDepartment) {
                    code = f?.codeDepartment;
                    key = f?.codeDepartment;
                }
                const isPhongBanOrNguoiChuTri = f?.code === 'nguoiChuTri' || f?.key === 'nguoiChuTri' || f?.code === 'phongBan' || f?.key === 'phongBan' || f?.row === 'phongBan';
                if (isPhongBanOrNguoiChuTri) {
                    const shouldChangeToCoQuan = isLeader;
                    const labelText = shouldChangeToCoQuan ? "Cơ quan, đơn vị" : "Phòng ban";
                    title = labelText;
                    label = labelText;
                    labelFilter = labelText;
                    lableFilter = labelText;
                    row = 'phongBan';
                }
            } else {
                const isPhongBan = f?.code === 'phongBan' || f?.key === 'phongBan' || f?.row === 'phongBan';
                if (isPhongBan) {
                    const shouldChangeToCoQuan = isLeader;
                    const labelText = shouldChangeToCoQuan ? "Cơ quan, đơn vị" : "Phòng ban";
                    title = labelText;
                    label = labelText;
                    labelFilter = labelText;
                    lableFilter = labelText;
                }
            }

            return {
                ...f,
                title,
                name: title,
                label,
                lableFilter,
                labelFilter,
                row,
                code,
                key,
                apiUrl,
                isShow: f?.hidden !== true && f?.hidde !== true
            };
        });
    }, [configItem, isLeader, checkRoleGroup, selectedTable, reportType]);

    const activeFilterConfig = useMemo(() => {
        return column.filter(f => {
            if (selectedTable === 'columnsPerformanceJobPerson' && reportType === 'personal' && (f.code === 'assigner' || f.key === 'assigner')) {
                return false;
            }
            return f.showFilter;
        });
    }, [column, reportType, selectedTable]);

    const fetchDataTable = useCallback(async (params) => {
        try {
            let apiUrl = selectedOption?.api
            let requestParams = {
                ...(params || {}),
            };

            // Chỉ gọi API phòng ban nếu đúng bảng, đúng quyền leader và đã chọn 'department'
            if (selectedTable === 'columnsPerformanceJobPerson' && 
                reportType === 'department' && 
                checkRoleGroup?.isLeader) {
                apiUrl = `${APP_DHVB_BASE}/task-report/dept-performance`
                if (locationDepartmentId) {
                    requestParams = {
                        ...requestParams,
                        ...buildDashboardFilterParams(effectiveViewConfigCode, locationDepartmentId),
                    }
                }
            }

            const response = await api.get(apiUrl, { params: requestParams });
            let data = [];
            let total = 0;
            let chartStats = null;

            if (Array.isArray(response)) {
                data = response;
                total = response.length;
            } else if (response?.data?.data) {
                data = response.data.data;
                total = response.data.total || data.length;
                chartStats = response.data.chartStats || null;
            } else if (response?.items) {
                data = response.items;
                total = response.total || data.length;
                chartStats = response.chartStats || null;
            } else if (response?.data && Array.isArray(response.data)) {
                data = response.data;
                total = response.total || data.length;
                chartStats = response.data.chartStats || null;
            } else if (response?.chartStats) {
                chartStats = response.chartStats;
            }

            return { data, total, chartStats };
        } catch (error) {
            // logger.log('Error fetching data:', error);
            return { data: [], total: 0 };
        }
    }, [selectedOption, selectedTable, reportType, checkRoleGroup?.isLeader, locationDepartmentId, effectiveViewConfigCode]);

    const handleExport = useCallback(async (exportType, params) => {
        try {
            setLoading(true)
            const processFn = effectiveViewConfigCode

            const { page, limit, ...filters } = params || {};
            const exportParams = {
                ...(page && { page }),
                ...(limit && { limit }),
            };

            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                    const cleanKey = key.endsWith('[]') ? key.slice(0, -2) : key;
                    exportParams[`filter[${cleanKey.replace(/\./g, '][')}]`] = filters[key];
                }
            });

            const response = await api.get(API_EXPORT_FILE_REPORT, {
                params: {
                    ...exportParams,
                    viewConfigCode: processFn,
                    exportType: exportType,
                },
                responseType: "blob",
                timeout: 60000,
            });
            setLoading(false)
            return response.data;

        } catch (error) {
            setLoading(false)
            let message = "Có lỗi khi xuất file";
            if (error?.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const json = JSON.parse(text);
                    message = json?.message || message;
                } catch {
                    // ignore parse lỗi
                }
            } else {
                message = error?.response?.data?.message || message;
            }
            toast(message, "error");
        }
    }, [effectiveViewConfigCode, toast])

    const currentFileName = useMemo(() => {
        return selectedOption?.label || 'Báo cáo'
    }, [selectedOption])

    const handleChangeTable = useCallback((e) => {
        setSelectedTable(e.target.value);
        setReportType('personal');
        setCheckRoleGroup(null); // Reset role group khi đổi bảng
    }, [])

    const onCloseListJob = useCallback(() => {
        setOpenListJob({
            open: false,
            idList: null
        })
    }, [])

      const handleViewRowDocument = useCallback((row) => {
        const id = row?.documentId || row?.id || row?._id || row?.deptId;
        if (id) {
            setOpenListJob({
                open: true,
                idList: id
            })
        }
      }, []);



    return (
       <>
            <PageContainer>
                <CustomTableReports
                    codeModule={effectiveViewConfigCode}
                    columns={column}
                    fetchData={fetchDataTable}
                    filter={activeFilterConfig}
                    autoGenerateReport={Boolean(
                        locationDepartmentId &&
                        selectedTable === DASHBOARD_DEPARTMENT_REPORT_TABLE &&
                        reportType === DEPARTMENT_REPORT_TYPE &&
                        checkRoleGroup?.isLeader
                    )}
                    disableDelete
                    disableSelectAll
                    disableSynchronize
                    customMaxHeight={isMobileOrTablet ? 450 : 370}
                    selectionReturns="object"
                    tableSelectOptions={filteredOptions}
                    selectedTable={selectedTable}
                    onChangeTable={handleChangeTable}
                    advancedFilterConfig={activeFilterConfig}
                    onExport={handleExport}
                    fileName={currentFileName}
                    title={`KẾT QUẢ BÁO CÁO: ${currentFileName}`}
                    isLeader={isLeader}
                    isTruongPhong={checkRoleGroup?.isTruongPhong}
                    reportType={reportType}
                    onReportTypeChange={setReportType}
                    onSelectView={isLeader ? handleViewRowDocument : undefined}
                    showRadioFilter={showRadioFilter}
                    key={`${selectedTable}-${reportType}`} // Remount when changing table or type
                />
    
                <LoadingDialog open={loading}>
                    <StyledDialogContent>
                        {"Đang xử lý, vui lòng chờ trong giây lát..."}
                    </StyledDialogContent>
                </LoadingDialog>
            </PageContainer>
            <ListJobToReports open={openListJob.open} onClose={onCloseListJob} idList={openListJob.idList} />
       </>
    )
}

export default StatisticsAndReports

