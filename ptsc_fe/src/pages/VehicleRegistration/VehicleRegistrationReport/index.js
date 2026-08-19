import React, { useState, useMemo, useCallback } from 'react'
import api from '@services/api'
import {
    listTableSelectOptions
} from './constants'
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
// import { useToast } from '@components/common/ToastProvider'
import LoadingDialog from '@components/LoadingDialog'
import { StyledDialogContent } from "@styles/CustomDialog.styles"
import { PageContainer } from '@styles/StatisticsAndReports/StatisticsAndReports.styles'
import { useMediaQuery, useTheme } from '@mui/material'
import CustomTableReports from '@components/CustomTableReports';
import { useSelector } from 'react-redux';

const VehicleRegistrationReport = () => {
    const [selectedTable, setSelectedTable] = useState(listTableSelectOptions[0].value)
    const [loading] = useState(false)
    // const toast = useToast()
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const { dataViewConfig } = useSelector((state) => state.viewConfig)
    logger.log('dataViewConfig', dataViewConfig)

    const { dataUser: authUser } = useSelector((state) => state.auth || {});
    const userData = authUser || {};

    const user = useMemo(() => userData?.user || {}, [userData]);
    const groupCodes = useMemo(() => user?.groupCodes || [], [user]);
    const isTruongPhong = useMemo(() => groupCodes.includes("truongphong"), [groupCodes]);

    const selectedOption = useMemo(() => {
        return listTableSelectOptions.find(opt => opt.value === selectedTable) || listTableSelectOptions[0]
    }, [selectedTable]);

    const configItem = useMemo(() => {
        const item = dataViewConfig?.find((item) => item.code === selectedTable);
        return item;
    }, [dataViewConfig, selectedTable]);
    logger.log('configItem', configItem)
 
    const column = useMemo(() => {
        const fields = configItem?.field || [];
        return fields.map(f => {
            let override = {};
            const label = f.lableFilter || f.labelFilter || f.label || f.name;
            if (isTruongPhong && (label === "Phòng ban" || f.key === "department")) {
                override = { disabled: true };
            }
            return {
                ...f,
                ...override,
                title: f.name,
                row: f.key,
                isShow: f.hidden !== true && f.hidde !== true
            };
        });
    }, [configItem, isTruongPhong]);

    const initialFilters = useMemo(() => {
        const init = {};
        if (isTruongPhong && user?.parent) {
            column.forEach(f => {
                const label = f.lableFilter || f.labelFilter || f.label || f.name;
                if (label === "Phòng ban" || f.key === "department") {
                    init[f.key] = {
                        _id: user.parent._id || user.parent.id,
                        id: user.parent._id || user.parent.id,
                        name: user.parent.name || user.parent.organizationName,
                        fullName: user.parent.name || user.parent.organizationName,
                        title: user.parent.name || user.parent.organizationName,
                    };
                }
            });
        }
        return init;
    }, [isTruongPhong, user, column]);

    const activeFilterConfig = useMemo(() => {
        return column.filter(f => f.showFilter);
    }, [column]);


    const fetchDataTable = useCallback(async (params) => {
        try {
            const apiUrl = selectedOption?.api  
            const response = await api.get(apiUrl, { params });
            let data = [];
            let total = 0;

            if (Array.isArray(response)) {
                data = response;
                total = response.length;
            } else if (response?.data?.items) {
                data = response.data.items;
                total = response.data.total || data.length;
            } else if (response?.items) {
                data = response.items;
                total = response.total || data.length;
            } else if (response?.data && Array.isArray(response.data)) {
                data = response.data;
                total = response.total || data.length;
            }

            return { data, total };
        } catch (error) {
            // logger.log('Error fetching data:', error);
            return { data: [], total: 0 };
        }
    }, [selectedOption]);

    const handleExport = useCallback(async (exportType, params) => {
        try {
            const processFn = selectedOption?.processFn
            const response = await api.get(`${APP_BASE}/api/data-export/list`, {
                params: {
                    ...params,
                    viewConfigCode: processFn,
                    exportType: exportType,
                },
                responseType: 'blob',
                timeout: 60000,
            })

            return response.data;
        } catch (error) {
            return null;
        }
    }, [selectedOption])

    const currentFileName = useMemo(() => {
        return selectedOption?.label || 'Báo cáo'
    }, [selectedOption])

    const handleChangeTable = useCallback((e) => {
        setSelectedTable(e.target.value);
    }, [])

    return (
        <PageContainer>
            <CustomTableReports
                codeModule={selectedTable}
                columns={column}
                fetchData={fetchDataTable}
                filter={activeFilterConfig}
                initialFilters={initialFilters}

                disableDelete
                disableSelectAll
                disableSynchronize
                customMaxHeight={isMobileOrTablet ? 450 : 370}
                selectionReturns="object"
                tableSelectOptions={listTableSelectOptions}
                selectedTable={selectedTable}
                onChangeTable={handleChangeTable}
                advancedFilterConfig={activeFilterConfig}
                onExport={handleExport}
                fileName={currentFileName}
                title={`KẾT QUẢ BÁO CÁO: ${currentFileName}`}
            />

            <LoadingDialog open={loading}>
                <StyledDialogContent>
                    {"Đang xử lý, vui lòng chờ trong giây lát..."}
                </StyledDialogContent>
            </LoadingDialog>
        </PageContainer>
    )
}

export default VehicleRegistrationReport

