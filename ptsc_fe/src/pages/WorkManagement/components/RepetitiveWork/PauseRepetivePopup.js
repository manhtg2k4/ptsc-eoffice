import React, { useState } from "react";
import {
    SkyBox,
    SkyGrid,
    SkySectionTitle,
    SkyRadio,
    SkyRadioGroup,
    SkyFormControlLabel,
} from "@styles/SkyStyles";
import { CustomDialog } from "@components/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInputBase";
import CustomDatePicker from "@components/CustomDatePicker";
import dayjs from "dayjs";
import { styled } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import LoadingDialog from "@components/LoadingDialog";

const SectionTitleNoMargin = styled(SkySectionTitle)(({ theme }) => ({
    marginTop: 0,
    marginBottom: "15px", // Reduced from default
    color: theme.palette.primary.main,
}));

const CompactSectionTitle = styled(SkySectionTitle)(({ theme }) => ({
    marginTop: '15px',
    marginBottom: '15px',
    color: theme.palette.primary.main,
    fontSize: theme.typography.fontSize,
}));

const FlexGridCenter = styled(SkyGrid)({
    display: "flex",
    alignItems: "center",
});

const RadioGridItem = styled(SkyGrid)({
    display: "flex",
    marginRight: "-8px",
});

const CompactRadio = styled(SkyRadio)({
    padding: "4px",
});

const IndefiniteBox = styled(SkyBox)({
    marginTop: "20px",
});

const PauseRepetivePopup = ({ open, onClose, dataDetail, docId, setReloadData, onCloseDialog }) => {
    const { crmSource } = useSelector((state) => state.config);
    const optionModeOfWork =
        crmSource.find((item) => item.code === "CONGVIECLAPLAI")?.data || [];
    const [reason, setReason] = useState("");
    const [pauseType, setPauseType] = useState("range"); // 'range' or 'indefinite'
    const [startDate, setStartDate] = useState(dayjs());
    const [endDate, setEndDate] = useState(dayjs());
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const id = dataDetail?.id || docId;

    const handleConfirm = React.useCallback(async () => {
        const isIndefinite = pauseType === "indefinite";
        const payload = {
            pauseReason: reason,
            pauseStartDate: startDate?.format("YYYY-MM-DD") ?? null,
            pauseEndDate: isIndefinite
                ? null
                : endDate?.format("YYYY-MM-DD") ?? null,
            pauseIndefinitely: isIndefinite,
            status: 2,
        };
        setIsLoading(true);
        try {
            const response = await axiosInstance.put(`${APP_BASE}/api/tasks/recurring/${id}`, payload);
            if (response) {
                toast("Tạm dừng công việc lặp thành công!", "success");
                setReloadData?.(new Date());
                onClose?.();
                onCloseDialog?.();
                setIsLoading(false);
            }
        } catch (error) {
            setIsLoading(false);
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
        } finally {
            setIsLoading(false);
        }

    }, [reason, pauseType, startDate, endDate, toast, id, setReloadData, onClose, onCloseDialog]);

    const handleReasonChange = React.useCallback((e) => {
        setReason(e.target.value);
    }, []);

    const handlePauseTypeChange = React.useCallback((e) => {
        setPauseType(e.target.value);
    }, []);

    const handleStartDateChange = React.useCallback((date) => {
        setStartDate(date);
    }, []);

    const handleEndDateChange = React.useCallback((date) => {
        setEndDate(date);
    }, []);

    const handleClose = React.useCallback(() => {
        onClose?.();
        setReason("");
        setPauseType("range");
        setStartDate(dayjs());
        setEndDate(dayjs());
    }, [onClose]);

    return (
        <CustomDialog
            open={open}
            onClose={handleClose}
            title="Tạm dừng công việc lặp"
            onSave={handleConfirm}
            titleButton="Xác nhận"
            size="md"
            isLoading={isLoading}

        >
            <SkyBox>
                {/* THÔNG TIN CHUNG */}
                <SectionTitleNoMargin variant="h6">
                    THÔNG TIN CHUNG
                </SectionTitleNoMargin>
                <SkyGrid container spacing={2}>
                    <SkyGrid item xs={6}>
                        <CustomInput
                            label="Tên công việc"
                            value={dataDetail?.name || ""}
                            disabled
                            fullWidth
                        />
                    </SkyGrid>
                    <SkyGrid item xs={6}>
                        <CustomInput
                            label="Công việc lặp lại"
                            value={dataDetail?.repetitiveTask || ""}
                            select
                            options={optionModeOfWork}
                            customLabel="title"
                            customValue="value"
                            disabled
                            fullWidth
                        />
                    </SkyGrid>
                </SkyGrid>

                {/* LÝ DO TẠM DỪNG */}
                <CompactSectionTitle variant="h6">LÝ DO TẠM DỪNG</CompactSectionTitle>
                <CustomInput
                    placeholder="Nhập lý do tạm dừng..."
                    value={reason}
                    onChange={handleReasonChange}
                    multiline
                    rows={5}
                />

                {/* THỜI GIAN TẠM DỪNG */}
                <CompactSectionTitle variant="h6">THỜI GIAN TẠM DỪNG</CompactSectionTitle>
                <SkyRadioGroup
                    value={pauseType}
                    onChange={handlePauseTypeChange}
                >
                    <FlexGridCenter container spacing={1}>
                        <RadioGridItem item>
                            <CompactRadio
                                value="range"
                                size="small"
                            />
                        </RadioGridItem>
                        <SkyGrid item xs>
                            <SkyGrid container spacing={1}>
                                <SkyGrid item xs={6}>
                                    <CustomDatePicker
                                        label="Bắt đầu tạm dừng"
                                        value={startDate}
                                        onChange={handleStartDateChange}
                                        disabled={pauseType !== "range"}
                                        required
                                        futureOnly
                                    />
                                </SkyGrid>
                                <SkyGrid item xs={6}>
                                    <CustomDatePicker
                                        label="Kết thúc tạm dừng"
                                        value={endDate}
                                        onChange={handleEndDateChange}
                                        disabled={pauseType !== "range"}
                                        required
                                        futureOnly
                                    />
                                </SkyGrid>
                            </SkyGrid>
                        </SkyGrid>
                    </FlexGridCenter>

                    <IndefiniteBox>
                        <SkyFormControlLabel
                            value="indefinite"
                            control={<CompactRadio size="small" />}
                            label="Tạm dừng vô thời hạn"
                        />
                    </IndefiniteBox>
                </SkyRadioGroup>
            </SkyBox>
            <LoadingDialog open={isLoading}>
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>

        </CustomDialog>
    );
};

export default PauseRepetivePopup;
