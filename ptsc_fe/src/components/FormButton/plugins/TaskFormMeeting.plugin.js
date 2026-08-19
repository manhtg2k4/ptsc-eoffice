
import React from 'react';

const SubmitApproval = React.lazy(() => import("@components/SubmitApproval"))

export default {
    name: 'TaskFormMeeting',
    component: SubmitApproval,

    mapProps: (openDialog, allProps) => {
        const {
            dataDetail,
            setReloadData,
            onClose,
            documentId,
            workItem,
            userId,
            actionCode,
        } = allProps;

        return {
            open: openDialog?.TaskFormMeeting || false,
            onCloseDialog: () => {
                if (allProps.handleCloseDialog) {
                    allProps.handleCloseDialog('TaskFormMeeting');
                }
            },
            // Truyền các props cần thiết cho SubmitApproval
            actionCode,
            dataDetail,
            documentId,
            workItem,
            userId,
            setReloadData,
            onCloseAppBar: onClose,
            viewMode: 'meeting',
            // Không truyền label và typeAction để dùng mặc định của component cho "Gửi điều chỉnh"
        };
    },
};
