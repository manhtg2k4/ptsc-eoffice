import React, { useCallback } from 'react';
import {
    Typography,
    styled,
    Box
} from '@mui/material';
// import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { 
    StyledDialogContent, 
} from "@styles/CustomDialog.styles";
import CustomDialog from "@components/CustomDialog/CustomDialog";
// --- Styled Components ---

// const DialogTitleWrapper = styled(StyledDialogTitle)(() => ({
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: '10px',
//     backgroundColor: '#0062ac',
//     color: '#ffffff',
//     textTransform: 'uppercase',
//     fontWeight: 'bold',
//     '& .MuiTypography-root': {
//         fontWeight: 'bold',
//     }
// }));
const TitleContainer = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
}));
// const StyledWarningIcon = styled(WarningAmberIcon)(() => ({
//     color: '#ffc107',
//     fontSize: '28px',
// }));

const ConfirmContent = styled(StyledDialogContent)(({ theme }) => ({
    textAlign: 'center',
    padding: theme.spacing(1,1),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    paddingTop: '20px !important',
}));

const MainMessage = styled(Typography)(() => ({
    fontWeight: 'bold',
    fontSize: '18px',
    color: '#000000',
}));

const SubMessage = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.secondary,
    fontSize: '16px',
}));

// --- Component ---

const ConfirmDestroyModal = ({ open, onClose, onConfirm, mainMessage, subMessage, isLoading }) => {

    const handleConfirm = useCallback(() => {
        if (onConfirm) {
            onConfirm();
        }
        if (isLoading === undefined) {
            onClose();
        }
    }, [onConfirm, onClose, isLoading]);

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            onSave={handleConfirm}
            title={
                <TitleContainer>
                    {/* <StyledWarningIcon /> */}
                    THÔNG BÁO
                </TitleContainer>
            }
            titleButton={isLoading ? "ĐANG XỬ LÝ..." : "ĐỒNG Ý"}
            cancelButtonText="HỦY"
            isLoading={isLoading}
            size="sm"
        >
            <ConfirmContent>
                <MainMessage>
                    {mainMessage || "Xác nhận tiêu hủy hồ sơ"}
                </MainMessage>
                <SubMessage>
                    {subMessage || "Hồ sơ sẽ bị xóa vĩnh viễn khỏi Hệ thống"}
                </SubMessage>
            </ConfirmContent>

        </CustomDialog>
    );
};

export default ConfirmDestroyModal;
