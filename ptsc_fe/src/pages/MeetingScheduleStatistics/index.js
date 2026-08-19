import React, { useCallback, useMemo, useState } from "react";
import Swipper from "@components/Swipper";
import { useSelector } from "react-redux";
import api from "@services/api";
import { API_EXPORT_REPORT } from "@EnvironmentFile/constants/urlConfig";
import { REPORT_TYPES } from "./constantsMeetingScheduleStatistics";
import CustomTableReports from "@components/CustomTableReports";
import { PageContainer } from "@styles/StatisticsAndReports/StatisticsAndReports.styles";
import { useMediaQuery, useTheme } from "@mui/material";
import { useToast } from "@components/common/ToastProvider";
import LoadingDialog from "@components/LoadingDialog";
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import DOMPurify from "dompurify";
 
const MeetingScheduleStatistics = (props) => {
    const { open, onClose, title, item } = props;
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const isGadget = !!item || !open;
    const toast = useToast();

    const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
    const [loading, setLoading] = useState(false);
    const { dataViewConfig } = useSelector((state) => state.viewConfig);

    const { dataUser: authUser } = useSelector((state) => state.auth || {});
    const userData = authUser || {};

    const user = useMemo(() => userData?.user || {}, [userData]);
    const groupCodes = useMemo(() => user?.groupCodes || [], [user]);
    const isTruongPhong = useMemo(() => groupCodes.includes("truongphong"), [groupCodes]);
    const isBanLanhDao = useMemo(() => groupCodes.includes("BANLANHDAO"), [groupCodes]);
    const isCanBoCT = useMemo(() => groupCodes.includes("canboct"), [groupCodes]);

    const selectedOption = useMemo(() => {
        return REPORT_TYPES.find((opt) => opt.value === reportType) || REPORT_TYPES[0];
    }, [reportType]);

    const configItem = useMemo(() => {
        return dataViewConfig?.find((item) => item.code === reportType);
    }, [dataViewConfig, reportType]);

    const columns = useMemo(() => {
        const fields = configItem?.field || [];
        return fields.map((f) => {
            const label = f.lableFilter || f.labelFilter || f.label || f.name;
            let override = {};
            if (!isBanLanhDao) {
                // Logic cho đơn vị (truongphong)
                if (isTruongPhong && (label === "Phòng ban" || label === "Đơn vị thực hiện")) {
                    override = { disabled: true };
                }
                // Logic cho cá nhân (canboct)
                if (isCanBoCT && (label === "Cá nhân" || label === "Cá nhân thực hiện")) {
                    override = { disabled: true };
                }
            }
            return {
                ...f,
                ...override,
                title: f.name,
                row: f.key,
                isShow: f.hidden !== true,
            };
        });
    }, [configItem, isTruongPhong, isCanBoCT, isBanLanhDao]);

    const initialFilters = useMemo(() => {
        const init = {};
        if (!isBanLanhDao) {
            columns.forEach(f => {
                const label = f.lableFilter || f.labelFilter || f.label || f.name;
                
                // Logic cho đơn vị (áp dụng cho truongphong)
                if (isTruongPhong && user?.parent) {
                    if (label === "Phòng ban" || label === "Đơn vị thực hiện") {
                        init[f.key] = {
                            _id: user.parent._id || user.parent.id,
                            id: user.parent._id || user.parent.id,
                            name: user.parent.name || user.parent.organizationName,
                            fullName: user.parent.name || user.parent.organizationName,
                            title: user.parent.name || user.parent.organizationName,
                        };
                    }
                }

                // Logic cho cá nhân (áp dụng cho canboct)
                if (isCanBoCT && user) {
                    if (label === "Cá nhân" || label === "Cá nhân thực hiện") {
                        init[f.key] = {
                            _id: user._id || user.id,
                            id: user._id || user.id,
                            name: user.username,
                            fullName: user.username,
                            title: user.username,
                            username: user.username,
                        };
                    }
                }
            });
        }
        return init;
    }, [isBanLanhDao, isTruongPhong, isCanBoCT, user, columns]);

    const advancedFilterConfig = useMemo(() => {
        return columns.filter((f) => f.showFilter);
    }, [columns]);

    const filters = useMemo(() => {
        return columns.filter((f) => f.showFilter);
    }, [columns]);

    const handleReportChange = useCallback((e) => {
        setReportType(e.target.value);
    }, []);

    const handleExport = useCallback(async (exportType, filtersToExport) => {
        try {
            setLoading(true);
            const fileName = selectedOption?.label || "Báo cáo lịch họp";

            const finalParams = {
                viewConfigCode: selectedOption?.value,
                exportType: exportType,
                ...filtersToExport
            };

            const response = await api.get(API_EXPORT_REPORT, {
                params: finalParams,
                responseType: "blob",
                timeout: 60000,
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${fileName}.${exportType === "pdf" ? "pdf" : "xlsx"}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            setLoading(false);
        } catch (error) {
            setLoading(false);
            toast(error?.response?.data?.message || "Có lỗi khi xuất file", "error");
        }
    }, [selectedOption, toast]);

    const getData = useCallback(
        async (params) => {
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
                    total = result.total || result.totalCount || data.length;
                } else if (result?.items) {
                    data = result.items;
                    total = result.total || result.totalCount || data.length;
                }

                // Giữ lại xử lý meetingState nếu là báo cáo theo thời gian
                if (reportType === "thongkecuochoptheotg") {
                    data = data.map((row) => ({
                        ...row,
                        meetingState: row.meetingState ? (
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(row.meetingState) }} />
                        ) : null,
                    }));
                }

                return { data, total };
            } catch (error) {
                return { data: [], total: 0 };
            }
        },
        [selectedOption, reportType]
    );

    const currentFileName = useMemo(() => {
        return selectedOption?.label || "Báo cáo";
    }, [selectedOption]);

    const tableContent = (
        <CustomTableReports
            codeModule={reportType}
            key={reportType}
            title={`KẾT QUẢ BÁO CÁO: ${currentFileName}`}
            advancedFilterConfig={advancedFilterConfig}
            fetchData={getData}
            columns={columns}
            disableAdd
            disableAct
            filtersAdvanced
            disableDeletePQ
            filter={filters}
            initialFilters={initialFilters}
            disableDelete
            disableSelectAll
            disableCheckbox
            disableSynchronize
            customMaxHeight={isMobileOrTablet ? 550 : 500}
            tableSelectOptions={REPORT_TYPES}
            selectedTable={reportType}
            onChangeTable={handleReportChange}
            isExportAll
            onExport={handleExport}
            disableSearch
            disableClearReport
        />
    );

    const content = (
        <PageContainer isGadget={isGadget}>
            {tableContent}
            <LoadingDialog open={loading}>
                <StyledDialogContent>
                    {"Đang xử lý, vui lòng chờ trong giây lát..."}
                </StyledDialogContent>
            </LoadingDialog>
        </PageContainer>
    );

    if (open) {
        return (
            <Swipper
                open={open}
                onClose={onClose}
                title={title || "Thống kê lịch họp"}
                type="view"
            >
                {content}
            </Swipper>
        );
    }

    return content;
};

export default MeetingScheduleStatistics;
