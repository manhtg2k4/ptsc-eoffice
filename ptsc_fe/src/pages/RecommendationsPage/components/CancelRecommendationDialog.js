import React, { useState, useCallback, useEffect } from 'react';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { styled } from '@mui/material/styles';
import CustomDialog from '@components/CustomDialog/CustomDialog';
import { SkyFlexGap8, SkyBox, SkyTypography } from '@styles/SkyStyles';

const TitleContainer = styled(SkyFlexGap8)(() => ({
  // color: theme.palette.warning.main,
}));

const ContentContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const MainMessage = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1rem',
  color: theme.palette.text.primary,
}));

const SubMessage = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
}));

const InputWrapper = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const ReasonLabel = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  fontSize: '0.875rem',
  '& .required': {
    color: theme.palette.error.main,
  },
}));

const CancelRecommendationDialog = ({ open, onClose, onConfirm, data, isLoading, sharedComponents }) => {
  const { InputComponents } = sharedComponents;
  const [reason, setReason] = useState("");

  // Reset reason when dialog opens
  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!reason.trim()) {
      return;
    }
    onConfirm(reason);
  };

  const handleReasonChange = useCallback((e) => {
    setReason(e.target.value);
  }, []);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleConfirm}
      title={
        <TitleContainer>
          <WarningAmberIcon />
          Thông báo
        </TitleContainer>
      }
      isLoading={isLoading}
      titleButton={isLoading ? 'Đang xử lý...' : 'Đồng ý'}
      disabledSave={!reason.trim() || isLoading}
      size="md"
    >
      <ContentContainer>
        <SkyBox>
          <MainMessage>
            Đồng chí có chắc chắn muốn hủy phản ánh {data?.code ? `[${data.code}]` : ""} này không?
          </MainMessage>
          <SubMessage>
            Tác vụ này sẽ không thể hoàn tác
          </SubMessage>
        </SkyBox>

        <InputWrapper>
          <ReasonLabel>
            Lý do <span className="required">*</span>
          </ReasonLabel>
          <InputComponents
            placeholder="Nhập lý do hủy phản ánh"
            multiline
            rows={3}
            fullWidth
            value={reason}
            onChange={handleReasonChange}
          />
        </InputWrapper>
      </ContentContainer>
    </CustomDialog>
  );
};

export default CancelRecommendationDialog;
