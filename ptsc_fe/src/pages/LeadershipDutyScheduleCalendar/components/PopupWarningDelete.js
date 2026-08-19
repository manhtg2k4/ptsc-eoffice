import React from "react";
import { styled } from '@mui/material/styles';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import withSharedComponents from "@components/WrapperComponent";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

const ContentContainer = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
}));

const ConfirmationText = styled(SkyTypography)(({ theme }) => ({
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
    textAlign: 'left',
}));

const TitleWrapper = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
}));

const StyledIcon = styled(WarningAmberIcon)(() => ({
    fontSize: "2rem",
    color: "#ffeb3b", 
}));

const ScheduleTitle = styled('span')(() => ({
    color: '#005baa',
    fontWeight: 'bold',
}));

const SecondaryText = styled(SkyTypography)(({ theme }) => ({
    color: theme.palette.text.secondary,
    textAlign: 'left',
}));

const PopupWarningDelete = ({
    open,
    onClose,
    onConfirm,
    title,
    isLoading = false,
}) => {
    const renderContent = () => {
        return (
            <SkyBox>
                <ConfirmationText variant="body1">
                    Bạn có chắc muốn xóa lịch trực <ScheduleTitle>&quot;{title}&quot;</ScheduleTitle>?
                </ConfirmationText>
                <SecondaryText variant="body2" align="center">
                    Tác vụ này sẽ không thể hoàn tác
                </SecondaryText>
            </SkyBox>
        );
    };

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            onSave={onConfirm}
            title={
                <TitleWrapper>
                    <StyledIcon />
                    THÔNG BÁO
                </TitleWrapper>
            }
            titleAlign="center"
            saveButtonText="Đồng ý"
            cancelButtonText="Đóng"
            size="sm"
            isLoading={isLoading}
        >
            <ContentContainer>
                {renderContent()}
            </ContentContainer>
        </CustomDialog>
    );
};

export default withSharedComponents(PopupWarningDelete);
