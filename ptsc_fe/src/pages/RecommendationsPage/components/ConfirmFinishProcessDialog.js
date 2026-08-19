import React from 'react';
import { styled } from '@mui/material/styles';
import CustomDialog from '@components/CustomDialog/CustomDialog';
import dayjs from 'dayjs';
import { SkyFlexGap8, SkyBox, SkyTypography } from '@styles/SkyStyles';

const TitleContainer = styled(SkyFlexGap8)(() => ({
  color: '#2364B0',
  width: '100%',
  justifyContent: 'center',
}));

const DialogContentContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1, 0),
}));

const InfoRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  marginBottom: theme.spacing(1.5),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const InfoLabel = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 400,
  width: '140px',
  minWidth: '140px',
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}));

const InfoValue = styled(SkyTypography)(() => ({
  fontSize: '0.875rem',
  color: '#334155',
  fontWeight: 'bold',
  wordBreak: 'break-word',
}));

const ConfirmFinishProcessDialog = ({ open, onClose, onConfirm, data, resultContent, isLoading }) => {
  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={onConfirm}
      title={
        <TitleContainer>
          Xác nhận hoàn tất xử lý phản ánh
        </TitleContainer>
      }
      isLoading={isLoading}
      titleButton={isLoading ? "Đang xử lý..." : "Xác nhận"}
      size="sm"
    >
      <DialogContentContainer>
        <InfoRow>
          <InfoLabel>Loại phản ánh</InfoLabel>
          <InfoValue>{data?.type_name || data?.types || ""}</InfoValue>
        </InfoRow>
        
        <InfoRow>
          <InfoLabel>Tiêu đề</InfoLabel>
          <InfoValue>{data?.title || ""}</InfoValue>
        </InfoRow>

        <InfoRow>
          <InfoLabel>Nội dung</InfoLabel>
          <InfoValue>{data?.content || ""}</InfoValue>
        </InfoRow>

        <InfoRow>
          <InfoLabel>Đơn vị xử lý</InfoLabel>
          <InfoValue>{data?.unitName || data?.unit_name || data?.unitId || ""}</InfoValue>
        </InfoRow>

        <InfoRow>
          <InfoLabel>Người xử lý</InfoLabel>
          <InfoValue>{data?.processorName || data?.processor_name || data?.processorId || ""}</InfoValue>
        </InfoRow>

        <InfoRow>
          <InfoLabel>Kết quả xử lý</InfoLabel>
          <InfoValue>{resultContent || ""}</InfoValue>
        </InfoRow>

        <InfoRow>
          <InfoLabel>Thời gian hoàn tất</InfoLabel>
          <InfoValue>{dayjs().format('DD/MM/YYYY HH:mm:ss')}</InfoValue>
        </InfoRow>
      </DialogContentContainer>
    </CustomDialog>
  );
};

export default ConfirmFinishProcessDialog;
