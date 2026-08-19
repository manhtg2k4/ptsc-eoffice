import { useToast } from '@components/common/ToastProvider'
import CustomTable from '@components/CustomTable/CustomTableStatic'
import { API_EXPORT_FILE_REPORT, APP_DHVB_BASE } from '@EnvironmentFile/constants/urlConfig'
import Swipper from '@components/Swipper'
import { useMediaQuery, useTheme } from '@mui/material'
import api from '@services/api'
import React, { useCallback } from 'react'
import { advancedFilterConfig, filter } from './constants'

const ListJobToReports = (props) => {
    const { open = false, onClose, idList } = props
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const toast = useToast()

    const fetchData = useCallback(async (params) => {
        try {
             // Loại bỏ processID (CustomTableStatic tự thêm, không cần) và thêm deptId
            const { processID, ...restParams } = params || {};
            logger.log("processID", processID);
            const response = await api.get(`${APP_DHVB_BASE}/task-report/dept-task-detail`, {
                params: {
                    ...restParams,
                    deptId: idList
                }
            })
            const result = response?.data || response;

            let data = [];
            let total = 0; if (Array.isArray(result)) {
                data = result;
                total = result.length;
            } else if (result?.items) {
                data = result.items;
                total = result.total || result.items.length || 0;
            } else if (result?.data && Array.isArray(result.data)) {
                data = result.data;
                total = result.total || result.totalCount || result.data.length || 0;
            } else if (typeof result === 'object' && result !== null) {
                // Handle case where it might be an object with results in another field or just return empty
                data = result.data || [];
                total = result.total || data.length || 0;
            }

            return { data, total };

        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Không thể lấy danh sách uỷ quyền", "error");
            return { data: [], total: 0 };
        }
    }, [toast, idList])

    const handleExport = useCallback(async (params) => {
        try {
            const { page, limit, exportType, ...filters } = params || {};
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
                    viewConfigCode: "ListJobByRepost",
                    exportType: exportType,
                    deptId: idList
                },
                responseType: "blob",
                timeout: 60000,
            });
            return response.data;
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Không thể xuất file", "error");
        }
    }, [idList, toast]);

    return (
        <>
            <Swipper open={open} onClose={onClose} title="Danh sách công việc">
                <CustomTable
                    fetchData={fetchData}
                    idList={idList}
                    codeModule="ListJobByRepost"
                    fixedHeight
                    disableDelete
                    disableAdd
                    disableEdit
                    isExportAll
                    onExportAll={handleExport}
                    fileName="Danh sách công việc"
                    disableSynchronize
                    customMaxHeight={isMobileOrTablet ? 400 : 200}
                    disableAct
                    filter={filter}
                    disableCheckbox
                    filtersAdvanced
                    advancedFilterConfig={advancedFilterConfig}
                />
            </Swipper>
        </>
    )
}

export default React.memo(ListJobToReports) 