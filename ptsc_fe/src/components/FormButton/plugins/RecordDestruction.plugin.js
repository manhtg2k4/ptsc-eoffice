import React, { memo, useMemo, useState } from 'react';
import CommanderApprovalModal from '@components/SubmitApprovalModal/CommanderApprovalModal';
import ReturnReasonModal from '@components/ReturnReasonModal/ReturnReasonModal';
import ConfirmDestroyModal from '@components/ConfirmDestroyModal/ConfirmDestroyModal';
import { useToast } from '@components/common/ToastProvider';
import axiosInstance from '@utils/axiosInstance';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';

const RecordDestructionPluginContainer = (props) => {
    const {
        openSubmit,
        openReturn,
        openApprove,
        openDestroy,
        onCloseDialog,
        dataDetail,
        documentId,
        workItem,
        actionCode,
        setReloadData,
        onClose
    } = props;

    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // Determine config for CommanderApprovalModal dynamically
    const commanderModalProps = useMemo(() => {
        if (openApprove) {
            // Director Approve workflow
            const actions = dataDetail?.availableActions || [];
            const directorAction = actions.find(a => 
                a.type === "director_approve_destroy_records" || 
                a.subActions?.some(sub => sub.type === "director_approve_destroy_records")
            );
            let code = actionCode;
            if (directorAction) {
                code = directorAction.type === "director_approve_destroy_records" 
                    ? directorAction.code 
                    : directorAction.subActions?.find(sub => sub.type === "director_approve_destroy_records")?.code;
            }
            return {
                title: "CHUYỂN XỬ LÝ",
                endpoint: "leaders-approve-destroy-records",
                roles: "VAN_THU",
                actionCode: code
            };
        }

        if (openSubmit) {
            // Submit approval / Commander approve workflow
            const actions = dataDetail?.availableActions || [];
            const isCommander = actions.some(a => 
                a.type === "commander_approve_destroy_records" || 
                a.subActions?.some(sub => sub.type === "commander_approve_destroy_records")
            );
            if (isCommander) {
                return {
                    title: "TRÌNH PHÊ DUYỆT",
                    endpoint: "commanders-destroy-records",
                    roles: "BAN_LANH_DAO",
                    actionCode: actionCode
                };
            } else {
                return {
                    title: "CHUYỂN XỬ LÝ",
                    endpoint: "leaders-destroy-records",
                    roles: "CHANH_VAN_PHONG",
                    actionCode: actionCode
                };
            }
        }

        return null;
    }, [openSubmit, openApprove, dataDetail, actionCode]);

    // Handle submit for CommanderApprovalModal
    const handleSubmitApprovalData = () => {
        setReloadData?.(new Date() * 1);
        onCloseDialog();
        onClose?.();
    };

    // Handle Reject/Return confirmation
    const handleReturnReasonConfirm = async (reason) => {
        let selectedActionCode = "CHP_TU_CHOI_HHS"; 
        let endpoint = "reject"; 
        
        dataDetail?.availableActions?.forEach(action => {
            if (action.type === "commander_reject_destroy_records") {
                selectedActionCode = action.code;
                endpoint = "reject";
            } else if (action.type === "directors_return_destroy_records") {
                selectedActionCode = action.code;
                endpoint = "leader-reject";
            } else if (action.subActions) {
                const subMatch = action.subActions.find(sub => 
                    sub.type === "commander_reject_destroy_records" || 
                    sub.type === "directors_return_destroy_records"
                );
                if (subMatch) {
                    selectedActionCode = subMatch.code;
                    endpoint = subMatch.type === "directors_return_destroy_records" ? "leader-reject" : "reject";
                }
            }
        });
        
        const payload = {
            actionCode: selectedActionCode,
            noteDetail: `Lý do trả lại hồ sơ: ${reason}`,
            workItem: {
                id: workItem
            }
        };

        try {
            setLoading(true);
            await axiosInstance.post(`${APP_BASE}/api/destroy-records/${documentId}/${endpoint}`, payload);
            toast("Trả lại hồ sơ thành công", "success");
            onCloseDialog();
            setReloadData?.(new Date() * 1);
            onClose?.();
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi trả lại hồ sơ", "error");
        } finally {
            setLoading(false);
        }
    };

    // Handle Clerical Destroy execution confirmation
    const handleConfirmDestroy = async () => {
        let selectedActionCode = "VT_TIEU_HUY"; 
        
        dataDetail?.availableActions?.forEach(action => {
            if (action.type === "clerical_destroy_records") {
                selectedActionCode = action.code;
            } else if (action.subActions) {
                const subMatch = action.subActions.find(sub => 
                    sub.type === "clerical_destroy_records"
                );
                if (subMatch) {
                    selectedActionCode = subMatch.code;
                }
            }
        });

        const payload = {
            actionCode: selectedActionCode,
            workItem: {
                id: workItem
            }
        };

        try {
            setLoading(true);
            await axiosInstance.post(`${APP_BASE}/api/destroy-records/${documentId}/clerical-execute`, payload);
            toast("Tiêu hủy hồ sơ thành công", "success");
            onCloseDialog();
            setReloadData?.(new Date() * 1);
            onClose?.();
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi tiêu hủy hồ sơ", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Submit Approval Modal */}
            {(openSubmit || openApprove) && commanderModalProps && (
                <CommanderApprovalModal
                    open={openSubmit || openApprove}
                    onClose={onCloseDialog}
                    onSubmit={handleSubmitApprovalData}
                    documentId={documentId}
                    actionCode={commanderModalProps.actionCode}
                    workItem={workItem}
                    flowConfig={dataDetail?.bpmnVersion}
                    title={commanderModalProps.title}
                    endpoint={commanderModalProps.endpoint}
                    roles={commanderModalProps.roles}
                />
            )}

            {/* Return Reason Modal */}
            {openReturn && (
                <ReturnReasonModal
                    open={openReturn}
                    onClose={onCloseDialog}
                    onSubmit={handleReturnReasonConfirm}
                    isLoading={loading}
                />
            )}

            {/* Confirm Destroy Modal */}
            {openDestroy && (
                <ConfirmDestroyModal
                    open={openDestroy}
                    onClose={onCloseDialog}
                    onConfirm={handleConfirmDestroy}
                    isLoading={loading}
                />
            )}
        </>
    );
};

export default {
    name: 'RecordDestructionPlugin',
    component: memo(RecordDestructionPluginContainer),
    mapProps: (openDialog, allProps) => {
        const {
            dataDetail,
            setReloadData,
            onClose,
            handleCloseDialog,
            actionCode,
            documentId
        } = allProps;

        const workItem = dataDetail?.workItem || {};
        const id = dataDetail?.documentId || dataDetail?.id || documentId;

        // Determine which dialog is open based on ACTION_MAP triggers
        const isSubmit = !!openDialog?.SubmitDestroyRecords;
        const isReturn = !!openDialog?.ReturnReasonDestroyRecords;
        const isApprove = !!openDialog?.ApproveConfirmDestroyRecords;
        const isDestroy = !!openDialog?.ConfirmDestroyRecords;

        // Close handlers to clear the specific dialog key
        const closeDialog = () => {
            if (isSubmit) handleCloseDialog('SubmitDestroyRecords');
            if (isReturn) handleCloseDialog('ReturnReasonDestroyRecords');
            if (isApprove) handleCloseDialog('ApproveConfirmDestroyRecords');
            if (isDestroy) handleCloseDialog('ConfirmDestroyRecords');
        };

        return {
            openSubmit: isSubmit,
            openReturn: isReturn,
            openApprove: isApprove,
            openDestroy: isDestroy,
            onCloseDialog: closeDialog,
            dataDetail,
            documentId: id,
            workItem,
            actionCode,
            setReloadData,
            onClose
        };
    }
};
