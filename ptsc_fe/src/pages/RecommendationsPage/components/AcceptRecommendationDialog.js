import React from 'react';
import { styled } from '@mui/material';
import CustomDialog from '@components/CustomDialog/CustomDialog';
import dayjs from 'dayjs';
import { SkyFlexGap8, SkyBox, SkyTypography } from '@styles/SkyStyles';
import DOMPurify from "dompurify";
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
  gap: theme.spacing(6),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const InfoLabel = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
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
  flex: 1,
}));

const HighlightValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.error.main,
  fontWeight: 400,
  wordBreak: 'break-word',
  flex: 1,
}));

const AcceptRecommendationDialog = ({ open, onClose, onConfirm, data, isLoading }) => {
  const deadlineVal = data?.deadlineHighlight || data?.deadline;

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={onConfirm}
      title={
        <TitleContainer>
          Tiếp nhận xử lý
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
          <InfoLabel>Hạn xử lý</InfoLabel>
          <HighlightValue>
            {deadlineVal?.includes('<') ? (
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(deadlineVal) }} />
            ) : (
              deadlineVal ? (dayjs(deadlineVal).isValid() ? dayjs(deadlineVal).format("DD/MM/YYYY HH:mm") : deadlineVal) : ""
            )}
          </HighlightValue>
        </InfoRow>
      </DialogContentContainer>
    </CustomDialog>
  );
};

export default AcceptRecommendationDialog;
