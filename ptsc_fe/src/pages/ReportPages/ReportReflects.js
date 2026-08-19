import React, { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
    REPORT_OPTIONS
} from '@pages/RecommendationsPage/constants';
import { API_EXPORT_REPORT } from "@EnvironmentFile/constants/urlConfig";
import api from '@services/api';
import { useToast } from '@components/common/ToastProvider';
import LoadingDialog from '@components/LoadingDialog';
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import { PageContainer } from '@styles/StatisticsAndReports/StatisticsAndReports.styles';
import { useMediaQuery, useTheme } from '@mui/material';
import CustomTableReports from '@components/CustomTableReports';

const ReportReflects = () => {
    const [selectedTable, setSelectedTable] = useState(REPORT_OPTIONS[0].value);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const { dataViewConfig } = useSelector((state) => state.viewConfig);

    const selectedOption = useMemo(() => {
        return REPORT_OPTIONS.find(opt => opt.value === selectedTable) || REPORT_OPTIONS[0];
    }, [selectedTable]);

    const configItem = useMemo(() => {
        return dataViewConfig?.find((item) => item.code === selectedTable);
    }, [dataViewConfig, selectedTable]);

    const columns = useMemo(() => {
        const fields = configItem?.field || [];
        return fields.map(f => ({
            ...f,
            title: f.name,
            row: f.key,
            isShow: f.hidden !== true
        }));
    }, [configItem]);

    const advancedFilterConfig = useMemo(() => {
        return columns.filter(f => f.showFilter);
    }, [columns]);

    const filters = useMemo(() => {
        return columns.filter(f => f.showFilter);
    }, [columns]);

    const fetchDataTable = useCallback(async (params) => {
        try {
            const apiUrl = selectedOption?.api;
            if (!apiUrl) return { data: [], total: 0 };

            const response = await api.get(apiUrl, { params });
            const result = response.data;

            let data = [];
            let total = 0;

            if (Array.isArray(result)) {
                data = result;
                total = result.length;
            } else if (result?.data) {
                data = Array.isArray(result.data) ? result.data : [];
                total = result.total || data.length;
            } else if (result?.items) {
                data = result.items;
                total = result.total || data.length;
            } else {
                data = [];
                total = 0;
            }

            return { data, total };
        } catch (error) {
            return { data: [], total: 0 };
        }
    }, [selectedOption]);

    const handleExport = useCallback(async (exportType, filtersToExport) => {
        try {
            setLoading(true);
            const fileName = selectedOption?.label || 'Báo cáo phản ánh';

            const filterParams = {};
            Object.keys(filtersToExport || {}).forEach(key => {
                if (filtersToExport[key]) {
                    if (key.includes('.')) {
                        const bracketKey = key.split('.').join('][');
                        filterParams[`filter[${bracketKey}]`] = filtersToExport[key];
                    } else {
                        filterParams[`filter[${key}]`] = filtersToExport[key];
                    }
                }
            });

            const finalParams = {
                viewConfigCode: selectedOption?.value,
                exportType: exportType
            };

            const response = await api.get(API_EXPORT_REPORT, {
                params: finalParams,
                responseType: 'blob',
                timeout: 60000,
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${fileName}.${exportType === 'pdf' ? 'pdf' : 'xlsx'}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            setLoading(false);
        } catch (error) {
            setLoading(false);
            toast(error?.response?.data?.message || "Có lỗi khi xuất file", "error");
        }
    }, [selectedOption, toast]);

    const currentFileName = useMemo(() => {
        return selectedOption?.label || 'Báo cáo';
    }, [selectedOption]);

    const handleChangeTable = useCallback((e) => {
        setSelectedTable(e.target.value);
    }, []);

    return (
        <PageContainer>
            <CustomTableReports
                codeModule={selectedTable}
                columns={columns}
                fetchData={fetchDataTable}
                disableAdd
                disableAct
                filtersAdvanced
                noneTitle
                disableDeletePQ
                filter={filters}
                disableDelete
                disableSelectAll
                disableSynchronize
                customMaxHeight={isMobileOrTablet ? 550 : 500}
                selectionReturns="object"
                tableSelectOptions={REPORT_OPTIONS}
                selectedTable={selectedTable}
                onChangeTable={handleChangeTable}
                advancedFilterConfig={advancedFilterConfig}
                onExport={handleExport}
                title={`KẾT QUẢ BÁO CÁO: ${currentFileName.toUpperCase()}`}
            />

            <LoadingDialog open={loading}>
                <StyledDialogContent>
                    {"Đang xử lý, vui lòng chờ trong giây lát..."}
                </StyledDialogContent>
            </LoadingDialog>
        </PageContainer>
    );
};

export default ReportReflects;
