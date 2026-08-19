import React, { useState } from 'react'

import {
    SkyBox,
    SkyTypography,
} from "@styles/SkyStyles";
import { CustomDialog } from "@components/CustomDialog";
import { styled } from "@mui/material/styles";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import LoadingDialog from "@components/LoadingDialog";

const DialogTitleBox = styled(SkyBox)({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
});



const HighlightText = styled("span")(() => ({
    // color: theme.palette.error.main,
    fontWeight: "bold",
}));

const StyledWarningIcon = styled(WarningAmberIcon)({
    color: "#FFD700",
});



const ContinueRepetiviWork = ({ open, onClose, dataDetail, docId, setReloadData, onCloseDialog }) => {
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const id = dataDetail?.id || docId;

    const handleConfirm = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const payload = {
                status: 1,
            };
            const response = await axiosInstance.put(`${APP_BASE}/api/tasks/recurring/${id}`, payload);
            if (response) {
                toast("Tiếp tục công việc lặp thành công!", "success");
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
    }, [toast, id, setReloadData, onClose, onCloseDialog]);

    const customTitle = (
        <DialogTitleBox>
            <StyledWarningIcon />
            <>
                THÔNG BÁO
            </>
        </DialogTitleBox>
    );

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            title={customTitle}
            onSave={handleConfirm}
            titleButton="Xác nhận"
            size="sm"
            isLoading={isLoading}
        >
            <SkyBox>
                <SkyTypography>
                    Bạn có chắc chắn muốn <HighlightText>Tiếp tục</HighlightText> công việc có tên{" "}
                    <HighlightText>“{dataDetail?.name}”</HighlightText> này?
                </SkyTypography>

            </SkyBox>
            <LoadingDialog open={isLoading}>
                Đang xử lý, vui lòng đợi...
            </LoadingDialog>
        </CustomDialog>
    );
};

export default ContinueRepetiviWork;