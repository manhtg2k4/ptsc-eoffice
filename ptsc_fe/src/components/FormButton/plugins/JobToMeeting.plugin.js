
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Box } from '@mui/material';
import { CustomDialog } from '@components/CustomDialog';
import axiosInstance from '@utils/axiosInstance';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import CustomInput from '@components/CustomInput/CustomInputBase';
const ViewJobToDocument = React.lazy(() => import("@pages/WorkManagement/components/ViewJobToDocument"));
const ViewJob = React.lazy(() => import("@pages/WorkManagement/components/ViewJob"));
const ViewJobToMeeting = React.lazy(() => import("@pages/WorkManagement/components/ViewJobToMeeting"));



const SubmitApproval = React.lazy(() => import("@components/SubmitApproval"))

// Component Container chứa tất cả các loại popup cho luồng Meeting
const JobToMeetingContainer = (props) => {
    const {
        openSubmit,
        openConfirm,
        openReject,
        submitProps,
        confirmProps,
        rejectProps,
        note = "",
        handleChangeNote = () => { },
        openConfirmAdjust,
        confirmAdjust,
        isLoading,
        dataDetail,
        actionCode,
        onClose,
    } = props;

    const [isSubmit, setIsSubmit] = useState(false);
    const [isViewJobOpen, setIsViewJobOpen] = useState(false);
    const [viewJobData, setViewJobData] = useState(null);

    useEffect(() => {
        if (!openReject) {
            setIsSubmit(false);
        }
    }, [openReject]);

    const handleSaveReject = useCallback(async () => {
        if (note.trim() === "") {
            setIsSubmit(true);
        } else {
            await rejectProps.onSave();
        }
    }, [note, rejectProps]);

    const handleCloseViewJob = useCallback(() => {
        setIsViewJobOpen(false);
        setViewJobData(null);
        // Sau khi đóng ViewJob trong luồng DONG_Y_DIEU_CHINH → đóng luôn ApprovalDetails
        if (actionCode === "DONG_Y_DIEU_CHINH") {
            onClose?.();
        }
    }, [actionCode, onClose]);

    // Wrapper cho confirmAdjust.onSave để đóng popup sau khi đồng ý điều chỉnh
    const handleConfirmAdjust = useCallback(async () => {
        if (confirmAdjust && confirmAdjust.onSave) {
            await confirmAdjust.onSave();
        }
    }, [confirmAdjust]);


    // Wrapper cho confirmProps.onSave để mở màn hình chi tiết sau khi đồng ý
    const handleConfirmSave = useCallback(async () => {
        if (confirmProps.onSave) {
            await confirmProps.onSave();
            // Sau khi đồng ý thành công, mở màn hình chi tiết
            setViewJobData(dataDetail);
            setIsViewJobOpen(true);
        }
    }, [confirmProps, dataDetail]);


    return (
        <>
            {/* Popup Phê duyệt / Điều chỉnh (SubmitApproval) */}
            {openSubmit && (
                <React.Suspense fallback={null}>
                    <SubmitApproval {...submitProps} />
                </React.Suspense>
            )}

            {/* Popup Đồng ý (CustomDialog) */}
            <CustomDialog
                isLoading={isLoading}
                open={openConfirm}
                {...confirmProps}
                onSave={handleConfirmSave}
            >
                <Typography>
                    <b>Bạn có muốn đồng ý công việc không?</b>
                </Typography>
            </CustomDialog>

            {/* Popup Từ chối (CustomDialog) */}
            <CustomDialog
                isLoading={isLoading}
                open={openReject}
                {...rejectProps}
                title="Lý do từ chối"
                titleButton="Xác nhận"
                disabled={note.trim() === ""}
                onSave={handleSaveReject}
            >
                <Box p={2}>
                    <CustomInput
                        value={note}
                        multiline
                        rows={4}
                        error={isSubmit && note.trim() === ""}
                        helperText={isSubmit && note.trim() === "" ? "Lý do từ chối không được để trống" : ""}
                        placeholder="Nhập lý do từ chối yêu cầu..."
                        onChange={handleChangeNote}
                    />
                </Box>
            </CustomDialog>


            {/* Xác nhận điều chỉnh */}

            <CustomDialog
                isLoading={isLoading}
                open={openConfirmAdjust}
                {...confirmAdjust}
                onSave={handleConfirmAdjust}
            >
                <Typography>
                    <b>Bạn có muốn xác nhận điều chỉnh công việc không?</b>
                </Typography>
            </CustomDialog>
 


            {/* Công việc general - chỉ mở khi actionCode là DONG_Y_DIEU_CHINH */}
            {actionCode === "DONG_Y_DIEU_CHINH" && (dataDetail?.typeTaskText === "general" || dataDetail?.typeTaskText === "project") && (
                <ViewJob
                    open={isViewJobOpen}
                    onClose={handleCloseViewJob}
                    data={viewJobData}
                    dataDetail={dataDetail}
                />
            )}
            {/* Công việc từ vb - chỉ mở khi actionCode là DONG_Y_DIEU_CHINH */}
            {actionCode === "DONG_Y_DIEU_CHINH" && dataDetail?.typeTaskText === "form_doc" && (
                <ViewJobToDocument
                    open={isViewJobOpen}
                    onClose={handleCloseViewJob}
                    data={viewJobData}
                    dataDetail={dataDetail}

                />
            )}
            {/* Công việc từ Cuộc họp - chỉ mở khi actionCode là DONG_Y_DIEU_CHINH */}
            {actionCode === "DONG_Y_DIEU_CHINH" && dataDetail?.typeTaskText === "form_meeting" && (
                <ViewJobToMeeting
                    open={isViewJobOpen}
                    onClose={handleCloseViewJob}
                    data={viewJobData}
                    dataDetail={dataDetail}
                />
            )}
        </>
    );
};

export default {
    name: 'JobToMeetingPlugin',
    component: JobToMeetingContainer,

    mapProps: (openDialog, allProps) => {
        const {
            dataDetail,
            setReloadData,
            onClose,
            documentId,
            workItem,
            userId,
            actionCode,
            handleCloseDialog,
            toast,
            note, // Nội dung ghi chú từ FormButton
            handleChangeNote,
            isLoading,
            setIsLoading
        } = allProps;


        // 1. Phân loại Dialog nào đang mở (Dựa trên key mapping trong constant.js)
        const isApproveForm = !!openDialog?.ApproveTaskFormMeeting;
        const isTaskForm = !!openDialog?.TaskFormMeeting;
        const isApproveModel = !!openDialog?.Approvetask || !!openDialog?.ApprovetaskMeeting;
        const isRejecttaskAction = !!openDialog?.Rejecttask || !!openDialog?.RejecttaskMeeting;
        const isConfirmAdjust = !!openDialog?.UpdateTaskFormMeeting || !!openDialog?.UpdateTaskFormDoc;


        // 2. Props cho SubmitApproval (Phê duyệt/Điều chỉnh)
        const submitProps = {
            open: isApproveForm || isTaskForm,
            onCloseDialog: () => {
                const key = isApproveForm ? 'ApproveTaskFormMeeting' : 'TaskFormMeeting';
                handleCloseDialog?.(key);
            },
            actionCode,
            dataDetail,
            documentId,
            workItem,
            userId,
            setReloadData,
            onCloseAppBar: onClose,
            viewMode: 'meeting',
            ...(isApproveForm && {
                label: 'TRÌNH PHÊ DUYỆT',
                typeAction: openDialog?.typeAction
            }),

        };

        // 3. Props cho Đồng ý (CustomDialog)
        const confirmProps = {
            title: openDialog?.label || 'Xác nhận đồng ý',
            onClose: () => handleCloseDialog?.(openDialog?.Approvetask ? 'Approvetask' : 'ApprovetaskMeeting'),
            titleButton: "Đồng ý",
            size: "sm",
            onSave: async () => {
                try {
                    setIsLoading(true);
                    const id = dataDetail?.id || dataDetail?._id;
                    await axiosInstance.post(`${APP_BASE}/api/tasks/sendadjust`, {
                        taskId: id,
                        actionCode: actionCode,
                        // note: note
                    });
                    toast?.("Đồng ý phê duyệt công việc thành công", "success");
                    setIsLoading(false);
                    setReloadData?.(new Date());
                    handleCloseDialog?.(openDialog?.Approvetask ? 'Approvetask' : 'ApprovetaskMeeting');
                    if (actionCode !== "DONG_Y_DIEU_CHINH") onClose?.();
                } catch (error) {
                    setIsLoading(false);
                    toast?.(error?.response?.data?.message || "Có lỗi xảy ra", "error");
                }
            }
        };

        // 4. Props cho Từ chối (CustomDialog)
        const rejectProps = {
            title: openDialog?.label || 'Xác nhận từ chối',
            onClose: () => {
                handleCloseDialog?.(openDialog?.Rejecttask ? 'Rejecttask' : 'RejecttaskMeeting');
                // Reset note khi đóng dialog
                if (allProps.setNote) {
                    allProps.setNote('');
                }
            },
            titleButton: "Từ chối",
            size: "sm",
            onSave: async () => {
                try {
                    const id = dataDetail?.id || dataDetail?._id;
                    setIsLoading(true);
                    await axiosInstance.post(`${APP_BASE}/api/tasks/sendadjust`, {
                        taskId: id,
                        actionCode: actionCode,
                        note: note
                    });
                    toast?.("Từ chối công việc thành công", "success");
                    setIsLoading(false);
                    setReloadData?.(new Date());
                    handleCloseDialog?.(openDialog?.Rejecttask ? 'Rejecttask' : 'RejecttaskMeeting');
                    onClose?.();
                    // Reset note sau khi submit thành công
                    if (allProps.setNote) {
                        allProps.setNote('');
                    }
                } catch (error) {
                    setIsLoading(false);
                    toast?.(error?.response?.data?.message || "Có lỗi xảy ra", "error");
                }
            }
        };

        // Xác nhận điều chỉnh
        const confirmAdjust = {
            title: openDialog?.label || 'Xác nhận điều chỉnh',
            onClose: () => {
                const key = openDialog?.UpdateTaskFormDoc ? 'UpdateTaskFormDoc' : 'UpdateTaskFormMeeting';
                handleCloseDialog?.(key);
       
            },
            titleButton: "Đồng ý",
            size: "sm",
            
            onSave: async () => {
                try {
                    setIsLoading(true);
                    const id = dataDetail?.id || dataDetail?._id;
                    const isFormDoc = dataDetail?.typeTaskText === "form_doc";
                    
                    const endpoint = isFormDoc 
                        ? `${APP_BASE}/api/tasks/confirm-adjust-form-doc`
                        : `${APP_BASE}/api/tasks/confirm-adjust`;

                    const payload = isFormDoc 
                        ? { id: id, actionCode: actionCode }
                        : { id: Number(id) };

                    await axiosInstance.post(endpoint, payload);
                    
                    toast?.("Xác nhận điều chỉnh công việc thành cônga", "success");
                    setIsLoading(false);
                    setReloadData?.(new Date());
                    
                    const key = openDialog?.UpdateTaskFormDoc ? 'UpdateTaskFormDoc' : 'UpdateTaskFormMeeting';
                    handleCloseDialog?.(key);
                      onClose?.();
                     
                } catch (error) {
                    setIsLoading(false);
                    toast?.(error?.response?.data?.message || "Có lỗi xảy ra", "error");
                }
            }
        };


        return {
            openSubmit: isApproveForm || isTaskForm,
            openConfirm: isApproveModel,
            openReject: isRejecttaskAction,
            submitProps,
            confirmProps,
            rejectProps,
            note,
            handleChangeNote,
            confirmAdjust,
            openConfirmAdjust: isConfirmAdjust,
            isLoading,
            openDialog,
            dataDetail,
            onClose,
            actionCode

        };
    },
};
