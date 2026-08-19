import React, { useState, useMemo, useCallback } from 'react'
import api from '@services/api'
import {
  listTableSelectOptions
} from './constantsReportIncomingDoc'
import { API_EXPORT_FILE_REPORT } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from '@components/common/ToastProvider'
import LoadingDialog from '@components/LoadingDialog'
import { StyledDialogContent } from "@styles/CustomDialog.styles"
import { PageContainer } from '@styles/StatisticsAndReports/StatisticsAndReports.styles'
import { useMediaQuery, useTheme } from '@mui/material'
import CustomTableReports from '@components/CustomTableReports';
import { useSelector } from 'react-redux';

const ReportIncomingDoc = () => {
  const [selectedTable, setSelectedTable] = useState(listTableSelectOptions[0].value)
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
  const { dataViewConfig } = useSelector((state) => state.viewConfig)
  logger.log('dataViewConfig', dataViewConfig)

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
    return fields.map(f => ({
      ...f,
        title: f.name,
        row: f.key,
        isShow: f.hidden !== true && f.hidde !== true
    }));
  }, [configItem]);

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
      } else if (response?.data?.data) {
        data = response.data.data;
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
            setLoading(true)
            const processFn = selectedOption?.value;

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
    }, [selectedOption, toast])


  const currentFileName = useMemo(() => {
    return selectedOption?.label || 'Báo cáo'
  }, [selectedOption])

  const handleChangeTable = useCallback((e) => {
    setSelectedTable(e.target.value);
  }, [])

  return (
    <PageContainer>
      <CustomTableReports
        columns={column}
        codeModule={selectedTable}
        fileName={currentFileName}
        fetchData={fetchDataTable}
        filter={activeFilterConfig}
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
        title={`KẾT QUẢ BÁO CÁO: ${currentFileName}`}
      />

      <LoadingDialog open={loading}>
        <StyledDialogContent>
          {"Đang xử lý, vui lòng chờ trong giây lát..."}
        </StyledDialogContent>
      </LoadingDialog>
    </PageContainer>
  )
};

export default ReportIncomingDoc;
