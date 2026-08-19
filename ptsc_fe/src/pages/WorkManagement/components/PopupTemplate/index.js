import { useToast } from '@components/common/ToastProvider';
import { CustomDialog } from '@components/CustomDialog'
import LoadingDialog from '@components/LoadingDialog';
import { styled } from '@mui/material';
import { DialogTitleBox, StyledWarningIcon } from '@pages/MeetingCalendar/componentStyle/MeetingAttendance.styles';
import { SkyBox, SkyTypography } from '@styles/SkyStyles';
 import React, { memo, useState } from 'react'

export const StyleSkyTypography = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  color: theme.palette.dialog?.headerColor || "#ffffff",
}));

const customTitle = (
    <DialogTitleBox>
        <StyledWarningIcon />
        <StyleSkyTypography> THÔNG BÁO</StyleSkyTypography>
    </DialogTitleBox>
);

const PopupTemplate = (props) => {
    const { open, onClose, onSave, templateName } = props
    const [isLoading, setIsLoading] = useState(false)
    const toast = useToast()

     const handleConfirm = React.useCallback(async () => {
        try {
            if (onSave) {
                setIsLoading(true);
                await onSave();
                onClose?.();
                // Các xử lý sau khi save thành công sẽ được handle trong onSubmit
                // nên không cần gọi onClose, onCloseDialog, setReloadData ở đây nữa
            }
        } catch (error) {
            setIsLoading(false);
            toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
        } finally {
            setIsLoading(false);
        }
    }, [toast, onSave, onClose])

    return (
        <CustomDialog open={open} onClose={onClose}
            titleButton={'Xác nhận'}
            titleAlign
            title={customTitle}
            onSave={handleConfirm}
            isLoading={isLoading}
        >
            <SkyBox>
                <SkyTypography mb={1}>
                    <b>Quy trình “{templateName || ""}” có tổng thời gian thực hiện nhiều hơn thời gian thực hiện của công việc đang tạo. Bạn có chắc chắn muốn tạo công việc này? </b>
                </SkyTypography>
                
                <SkyTypography>
                      Nếu đồng ý, những công việc nào trong quy trình có thời gian vượt quá hạn kết thúc sẽ báo đỏ để cập nhật lại.
                </SkyTypography>

            </SkyBox>
            <LoadingDialog open={isLoading}>
                Đang xử lý, vui lòng đợi...
            </LoadingDialog>

        </CustomDialog>
    )
}

export default memo(PopupTemplate)