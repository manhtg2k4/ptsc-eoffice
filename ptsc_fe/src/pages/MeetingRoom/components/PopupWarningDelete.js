import React from "react";
import { styled } from '@mui/material/styles';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import withSharedComponents from "@components/WrapperComponent";


const ContentContainer = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    // textAlign: "center",
    gap: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
}));

const ConfirmationText = styled(SkyTypography)(({ theme }) => ({
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
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


import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

const PopupWarningDelete = ({
  open,
  onClose,
}) => {
  // --- PREPARE DISPLAY CONTENT ---
  const renderContent = () => {
      return (
        <SkyBox>
           <ConfirmationText variant="body1">
              Phòng họp chưa thể &quot;Bảo trì&quot; vì đang có cuộc họp đăng ký sử dụng. Vui lòng hủy hoặc chuyển cuộc họp sang phòng khác trước khi bảo trì.
           </ConfirmationText>
        </SkyBox>
      );
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={
        <TitleWrapper>
          <StyledIcon />
          THÔNG BÁO
        </TitleWrapper>
      }
      titleAlign="center"
      disableSave
      cancelButtonText="ĐÓNG"
      size="sm"
    >
      <ContentContainer>
        {renderContent()}
      </ContentContainer>
    </CustomDialog>
  );
};

export default withSharedComponents(PopupWarningDelete);