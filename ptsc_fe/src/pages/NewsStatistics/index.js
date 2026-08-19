
import React, { useCallback } from 'react';
import CustomTable from '@components/CustomTable/CustomTableStatic';
import Swipper from '@components/Swipper';
import { styled, useMediaQuery, useTheme, Chip } from '@mui/material';
import { SkyBox } from '@styles/SkyStyles';
import {
    REPORT_OPTIONS
} from './constants';
import { useSelector } from 'react-redux';
import api from '@services/api';
import { API_EXPORT_FILE_EXCEL_REPORT_DOCUMENTS } from '@EnvironmentFile/constants/urlConfig';

const BoxContainer = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'isGadget'
})(({ isGadget }) => ({
    height: '100%',
    padding: isGadget ? '0' : '0',
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
}));

// Styled component cho Chip
const StyledStatusChip = styled(Chip, {
    shouldForwardProp: (prop) => prop !== 'customBgColor' && prop !== 'customTextColor' && prop !== 'customBorderColor'
})(({ customBgColor, customTextColor, customBorderColor }) => ({
    backgroundColor: customBgColor,
    color: customTextColor,
    border: `1px solid ${customBorderColor}`,
    fontWeight: 'bold',
    borderRadius: '20px',
    minWidth: '110px',
    height: '28px',
    '& .MuiChip-label': {
        padding: '0 8px',
    }
}));

const NewsStatistics = (props) => {
    const { open, onClose, title, item } = props;
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const isGadget = !!item || !open;
    
    const [reportType, setReportType] = React.useState(REPORT_OPTIONS[0].value);
    const { dataViewConfig } = useSelector((state) => state.viewConfig);

    // Handler cho report change
    const handleReportChange = useCallback((val) => {
        setReportType(val);
    }, []);

    const selectedOption = React.useMemo(() => {
        return REPORT_OPTIONS.find(opt => opt.value === reportType) || REPORT_OPTIONS[0]
    }, [reportType]);

    const configItem = React.useMemo(() => {
        return dataViewConfig?.find((item) => item.code === reportType);
    }, [dataViewConfig, reportType]);

    const currentColumns = React.useMemo(() => {
        const fields = configItem?.field || [];
        return fields.map(f => ({
            ...f,
            title: f.name,
            row: f.key,
            isShow: f.hidden !== true
        }));
    }, [configItem]);

    const currentAdvancedFilterConfig = React.useMemo(() => {
        return currentColumns.filter(f => f.showFilter);
    }, [currentColumns]);

    const currentFilter = React.useMemo(() => {
        return currentColumns.filter(f => f.showFilter);
    }, [currentColumns]);

    // Phói màu cho trạng thái
    const getStatusColor = useCallback((status) => {
        switch (status) {
            case 'Đã duyệt': return { bg: '#e6ffed', color: '#2e7d32', border: '#b7eb8f' };
            case 'Chờ duyệt': return { bg: '#fffbe6', color: '#faad14', border: '#ffe58f' };
            case 'Trả lại': return { bg: '#f5f5f5', color: '#8c8c8c', border: '#d9d9d9' };
            case 'Hủy tin': return { bg: '#fff1f0', color: '#f5222d', border: '#ffa39e' };
            case 'Thu hồi': return { bg: '#f9f0ff', color: '#722ed1', border: '#d3adf7' };
            default: return { bg: '#f5f5f5', color: '#595959', border: '#d9d9d9' };
        }
    }, []);

    const renderStatus = useCallback((status) => {
        if (!status) return null;
        const colors = getStatusColor(status);
        return (
            <StyledStatusChip 
                label={status} 
                size="small" 
                customBgColor={colors.bg}
                customTextColor={colors.color}
                customBorderColor={colors.border}
            />
        );
    }, [getStatusColor]);

    const handleExport = useCallback(async (params) => {
        try {
            const finalParams = { 
                ...params,
                processFn: selectedOption?.processFn,
                filename: selectedOption?.label || 'Báo cáo'
            };

            const response = await api.get(API_EXPORT_FILE_EXCEL_REPORT_DOCUMENTS, {
                params: finalParams,
                responseType: 'blob',
                timeout: 60000
            });
            return response.data;
        } catch (error) {
            return null;
        }
    }, [selectedOption]);

    const getData = useCallback(async (params) => {
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

            const dataWithStatus = data.map(item => ({
                ...item,
                displayStatus: renderStatus(item.displayStatus)
            }));

            return { data: dataWithStatus, total };
        } catch (error) {
            return { data: [], total: 0 };
        }
    }, [selectedOption, renderStatus]);


    const content = (
        <BoxContainer isGadget={isGadget}>
            <CustomTable
                title="THỐNG KÊ CHI TIẾT"
                advancedFilterConfig={currentAdvancedFilterConfig}
                fetchData={getData}
                columns={currentColumns}
                disableAdd
                disableAct
                filtersAdvanced
                disableDeletePQ
                filter={currentFilter}
                disableDelete
                disableSelectAll
                disableCheckbox
                disableSynchronize
                customMaxHeight={isMobileOrTablet ? 450 : (isGadget ? 275 : 285)}
                fileName={selectedOption?.label || 'Báo cáo'}
                showReportSelect
                reportOptions={REPORT_OPTIONS}
                reportValue={reportType}
                onReportChange={handleReportChange}
                isExportAll
                onExportAll={handleExport}
                disableSearch
            />
        </BoxContainer>
    );

    if (open) {
        return (
            <Swipper open={open} onClose={onClose} title={title || 'Thống kê danh sách'} type="view">
                {content}
            </Swipper>
        );
    }

    return content;
};

export default NewsStatistics;
