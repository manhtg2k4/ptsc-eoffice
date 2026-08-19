import React, { useCallback } from 'react'
import { BoxContainer, SkyBox } from '@styles/SkyStyles'
import AsyncHRM from '@components/AsyncHRM'
import CustomTable from '@components/CustomTable/CustomTableStatic'
import { advancedFilterConfig, filter } from './constant'
// import { useToast } from '@components/common/ToastProvider'
import { useMediaQuery, useTheme } from '@mui/material'
import { usePageTitle } from '@builder-table/context/PageTitleContext'

import LoadingDialog from '@components/LoadingDialog'
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import EmployeeInformationDetail from './index';
import { API_EXPORT_FILE_REPORT, APP_BASE } from '@EnvironmentFile/constants/urlConfig'
import { useToast } from '@components/common/ToastProvider'
import api from '@services/api'



const EmployeeInformation = () => {
    const { setHideTitle } = usePageTitle();
    const [reloadData, setReloadData] = React.useState(false);
    const toast = useToast()
    const theme = useTheme();
    const [loading, setLoading] = React.useState(false)
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const [open, setOpen] = React.useState(false);


    React.useEffect(() => {
        setHideTitle(true);
        return () => setHideTitle(false);
    }, [setHideTitle]);


    const fetchData = useCallback(async (params) => {
        try {
            const response = await api.get(`${APP_BASE}/api/hrm/employees`, { params })
            let data = [];
            let total = 0;

            if (Array.isArray(response)) {
                data = response;
                total = response.length;
            } else if (response?.data?.data) {
                data = response.data.data;
                total = response.data.total || data.length;
            } else if (response?.data) {
                data = response.data;
                total = response.total || data.length;
            }
            return { data, total };



        } catch (error) {
            toast(
                error?.response?.data?.message || 'Lỗi khi lấy dữ liệu',
                'error'
            )
            return { data: [], total: 0 };
        }
    }, [toast])



    const [selectedId, setSelectedId] = React.useState(null);

    const handleViewDetail = (id) => {
        setSelectedId(id);
        setOpen(true);
    }

    const onClose = () => {
        setOpen(false);
        setSelectedId(null);
    }
    const handleSelectView = (row) => {
        handleViewDetail(row?._id || row?.id);
    }

    const handleExport = useCallback(async (exportType, params) => {
        try {
            setLoading(true)
            const processFn = 'employeeHRM'

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
    }, [toast])

    return (
        <BoxContainer >
            <SkyBox>
                <AsyncHRM setReloadData={setReloadData} setLoading={setLoading} loading={loading} />
            </SkyBox>
            <SkyBox>
                <CustomTable
                    advancedFilterConfig={advancedFilterConfig}
                    fetchData={fetchData}
                    codeModule="employeeHRM"
                    disableAdd
 
                    isExportAll
                    filtersAdvanced
                    reload={reloadData}
                    disableDeletePQ
                    filter={filter}
                    disableDelete
                    onExport={handleExport}
                    disableSelectAll
                    disableCheckbox
                    disableEdit
                     title={`Danh bạ nhân viên`}
                    disableSynchronize
                    onView={handleViewDetail}
                    onSelectView={handleSelectView}
                    customMaxHeight={isMobileOrTablet ? 500 : 410}
                // anableSTT

                />
            </SkyBox>
            <EmployeeInformationDetail
                open={open}
                onClose={onClose}
                setLoading={setLoading}
                id={selectedId}
            />
            <LoadingDialog open={loading}>
                <StyledDialogContent>
                    {"Đang cập nhật danh sách, vui lòng chờ trong giây lát..."}
                </StyledDialogContent>
            </LoadingDialog>
        </BoxContainer>
    )
}

export default EmployeeInformation