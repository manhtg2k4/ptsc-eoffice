import React, { useState, useCallback } from 'react';
import { styled } from "@mui/material";
import Input from "@components/CustomInput/CustomInputBase";
import { useToast } from '@components/common/ToastProvider';
import { 
    StyledDialog,
    StyledDialogTitle, 
    StyledDialogContent, 
    StyledDialogActions, 
    SaveButton, 
    CancelButton 
} from "@styles/CustomDialog.styles";

const RequiredStar = styled('span')(() => ({
    color: 'white',
}));

// --- Component ---

const ReturnReasonModal = ({ open, onClose, onSubmit, isLoading }) => {
    const [reason, setReason] = useState('');
    const toast = useToast();

    // Reset reason when modal closes
    React.useEffect(() => {
        if (!open) {
            setReason('');
        }
    }, [open]);

    const handleChangeReason = useCallback((e) => {
        setReason(e.target.value);
    }, []);

    const handleSubmit = useCallback(() => {
        if (!reason.trim()) {
            toast('Vui lòng nhập lý do trả lại',
                'error'
            );
            return;
        }
        if (reason.length > 1000) {
            toast('Lý do trả lại không được vượt quá 1000 ký tự',
                'error'
            );
            return;
        }
        if (onSubmit) {
            onSubmit(reason);
        }
    }, [reason, onSubmit, toast]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    return (
        <StyledDialog
            open={open}
            onClose={handleClose}
            fullWidth
            dialogSize="sm"
        >
            <StyledDialogTitle>
                LÝ DO TRẢ LẠI <RequiredStar>*</RequiredStar>
            </StyledDialogTitle>

            <StyledDialogContent>
                <Input
                    value={reason}
                    onChange={handleChangeReason}
                    placeholder="Nhập lý do trả lại..."
                    multiline
                    rows={6}
                    required
                    disabled={isLoading}
                />
            </StyledDialogContent>

            <StyledDialogActions>
                <SaveButton
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN'}
                </SaveButton>
                <CancelButton variant="contained" onClick={handleClose} disabled={isLoading}>
                    ĐÓNG
                </CancelButton>
            </StyledDialogActions>
        </StyledDialog>
    );
};

export default ReturnReasonModal;
