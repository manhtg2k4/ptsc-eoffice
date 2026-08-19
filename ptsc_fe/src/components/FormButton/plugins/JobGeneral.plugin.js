import React from 'react';
import { CustomDialog } from '@components/CustomDialog';
import axiosInstance from '@utils/axiosInstance';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';

import LoadingDialog from '@components/LoadingDialog';
import { SkyTypography } from '@styles/SkyStyles';
import { Box, Typography, styled } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const SuccessTitleBox = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
}));

const SuccessTitleText = styled(Typography)(() => ({
    fontWeight: 'bold',
    color: '#2364B0',
    fontSize: '1.25rem',
    textTransform: 'uppercase',
}));

const SuccessIcon = styled(WarningAmberIcon)(() => ({
    color: '#ffc107',
    fontSize: '2.5rem',
}));

const SuccessContentBox = styled(Box)(({ theme }) => ({
    // textAlign: 'center',
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
}));

const GreenText = styled('span')(() => ({
    color: '#4caf50',
}));

const BoldBoldTypography = styled(SkyTypography)(({ theme }) => ({
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
    fontSize: '1.1rem',
}));

const SecondaryTextTypography = styled(SkyTypography)(({ theme }) => ({
    color: theme.palette.text.secondary,
    fontSize: '0.95rem',
}));

const ReasonContentBox = styled(Box)(({ theme }) => ({
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(2),
}));

const ReasonTitleTypography = styled(Typography)(({ theme }) => ({
    marginBottom: theme.spacing(1),
    fontWeight: 500,
    fontSize: '0.95rem',
}));

// Component Container chứa tất cả các loại popup cho luồng Meeting
const JobGeneralContainer = (props) => {
    const {
        openConfirmAdjust,
        confirmAdjust,
        openTaskSucessFull,
        sucessFull,
        isLoading,
        handleCloseDialog,
        isSlowReason,
        note,
        handleChangeNote
    } = props;

  
    const handleCloseConfirmAdjust = () => {
        handleCloseDialog?.('UpdateTask');
    };

    return (
        <>
            {/* Xác nhận điều chỉnh */}
            <CustomDialog
                open={openConfirmAdjust}
                {...confirmAdjust}
                isLoading={isLoading}
                onClose={handleCloseConfirmAdjust}
            >
                <SkyTypography>
                    <b>Bạn có muốn xác nhận điều chỉnh công việc không?</b>
                </SkyTypography>
            </CustomDialog>

            {/* Hoàn thành công việc */}
            <CustomDialog
                open={openTaskSucessFull}
                {...sucessFull}
                isLoading={isLoading}
            >
                {isSlowReason ? (
                    <ReasonContentBox>
                        <ReasonTitleTypography>
                            Nhập lý do chậm tiến độ <span style={{ color: 'red' }}>*</span>
                        </ReasonTitleTypography>
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                padding: '10px',
                                borderRadius: '6px',
                                border: '1px solid #ccc',
                                outline: 'none',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                fontSize: '0.95rem'
                            }}
                            placeholder="Nhập lý do chậm tiến độ..."
                            value={note}
                            onChange={handleChangeNote}
                        />
                    </ReasonContentBox>
                ) : (
                    <SuccessContentBox>
                        <BoldBoldTypography>
                            Xác nhận <GreenText>Hoàn thành</GreenText> công việc, người dùng sẽ không thể thay đổi nội dung công việc khi công việc ở trạng thái <GreenText>Hoàn thành.</GreenText>
                        </BoldBoldTypography>
                        <SecondaryTextTypography>
                            Tác vụ này sẽ không thể hoàn tác
                        </SecondaryTextTypography>
                    </SuccessContentBox>
                )}
            </CustomDialog>

            <LoadingDialog open={isLoading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
        </>
    );
};
export default {
    name: 'JobGeneralPlugin',
    component: JobGeneralContainer,

    mapProps: (openDialog, allProps) => {
        const {
            dataDetail,
            setReloadData,
            onClose,

            handleCloseDialog,
            toast,
            note, // Nội dung ghi chú từ FormButton
            handleChangeNote,
            isLoading,
            setIsLoading,
            actionCode
        } = allProps;

        // Xác nhận điều chỉnh
        const confirmAdjust = {
            title: openDialog?.label || 'Xác nhận điều chỉnh',
            onClose: () => {
                handleCloseDialog?.('UpdateTask');

            },
            titleButton: "Phản hồi",
            size: "sm",
            onSave: async () => {
                try {
                    setIsLoading(true);
                    const id = dataDetail?.id || dataDetail?._id;
                    await axiosInstance.post(`${APP_BASE}/api/tasks/confirm-adjust`, {
                        id: Number(id),
                    });
                    toast?.("Xác nhận điều chỉnh công việc thành công", "success");
                    setIsLoading(false);
                    setReloadData?.(new Date());
                    handleCloseDialog?.('UpdateTask');
                    onClose?.();
                } catch (error) {
                    toast?.(error?.response?.data?.message || "Có lỗi xảy ra", "error");
                    setIsLoading(false);
                }
            }
        };

        const isSlowReason = dataDetail?.flags?.isSlowReason === true;

        // Hoàn thành công việc 
        const sucessFull = isSlowReason ? {
            title: "ĐỀ NGHỊ GIẢI TRÌNH LÝ DO CHẬM TIẾN ĐỘ",
            onClose: () => {
                handleCloseDialog?.('TaskSucessFull');
            },
            titleButton: "HOÀN THÀNH",
            cancelButtonText: "ĐÓNG",
            size: "sm",
            onSave: async () => {
                if (!note || note.trim() === '') {
                    toast?.("Vui lòng nhập lý do", "error");
                    return;
                }
                try {
                    setIsLoading(true);
                    const id = dataDetail?.id || dataDetail?._id;
                    
                    await axiosInstance.post(`${APP_BASE}/api/task/${id}/comments`, {
                        type: "slowReason",
                        content: note,
                        fileId: [],
                        mentionIds: []
                    });

                    await axiosInstance.post(`${APP_BASE}/api/tasks/sendadjust`, {
                        taskId: id,
                        actionCode: actionCode,
                        note: note
                    });
                    toast?.("Hoàn thành công việc thành công", "success");
                    setIsLoading(false);
                    setReloadData?.(new Date());
                    handleCloseDialog?.('TaskSucessFull');
                    onClose?.();
                } catch (error) {
                    setIsLoading(false);
                    toast?.(error?.response?.data?.message || "Có lỗi xảy ra", "error");
                }
            }
        } : {
            title: (
                <SuccessTitleBox>
                    <SuccessIcon />
                    <SuccessTitleText>
                        THÔNG BÁO
                    </SuccessTitleText>
                </SuccessTitleBox>
            ),
            onClose: () => {
                handleCloseDialog?.('TaskSucessFull');
            },
            titleButton: "ĐỒNG Ý",
            cancelButtonText: "HUỶ",
            size: "sm",
            titleAlign: "center",
            onSave: async () => {
                try {
                    setIsLoading(true);
                    const id = dataDetail?.id || dataDetail?._id;
                    await axiosInstance.post(`${APP_BASE}/api/tasks/sendadjust`, {
                        taskId: id,
                        actionCode: actionCode,
                        // note: note
                    });
                    toast?.("Hoàn thành công việc thành công", "success");
                    setIsLoading(false);
                    setReloadData?.(new Date());
                    handleCloseDialog?.('TaskSucessFull');
                    onClose?.();
                } catch (error) {
                    setIsLoading(false);
                    toast?.(error?.response?.data?.message || "Có lỗi xảy ra", "error");
                }
            }
        };

        return {
            openDialog,
            note,
            handleChangeNote,
            confirmAdjust,
            openConfirmAdjust: openDialog?.UpdateTask === true,
            sucessFull,
            openTaskSucessFull: openDialog?.TaskSucessFull === true,
            isLoading,
            handleCloseDialog,
            isSlowReason
        };
    },
};
