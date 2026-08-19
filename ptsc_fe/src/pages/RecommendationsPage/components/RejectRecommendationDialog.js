import React, { useState, useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import CustomDialog from '@components/CustomDialog/CustomDialog';
import withSharedComponents from '@components/WrapperComponent';
import { SkyFlexGap8, SkyBox, SkyTypography } from '@styles/SkyStyles';

const TitleContainer = styled(SkyFlexGap8)(() => ({
  color: '#2364B0',
  width: '100%',
  justifyContent: 'center',
}));

const ContentContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const LabelText = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.875rem',
  marginBottom: theme.spacing(1),
  '& .required': {
    color: theme.palette.error.main,
  },
}));

const RejectRecommendationDialog = ({ open, onClose, onConfirm, sharedComponents, isLoading }) => {
  const { InputComponents } = sharedComponents;
  const [reason, setReason] = useState("");

  // Reset state khi dialog mở
  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  const handleReasonChange = useCallback((e) => {
    setReason(e.target.value);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(reason);
  }, [onConfirm, reason]);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleConfirm}
      title={
        <TitleContainer>
          Từ chối xử lý
        </TitleContainer>
      }
      isLoading={isLoading}
      titleButton={isLoading ? "Đang xử lý..." : "Xác nhận"}
      disabledSave={!reason?.trim() || isLoading}
      size="md"
    >
      <ContentContainer>
        <SkyBox>
          <LabelText>
            Ý kiến từ chối <span className="required">*</span>
          </LabelText>
          <InputComponents
            placeholder="Nhập lý do từ chối"
            multiline
            rows={4}
            value={reason}
            onChange={handleReasonChange}
            fullWidth
          />
        </SkyBox>
      </ContentContainer>
    </CustomDialog>
  );
};

export default withSharedComponents(RejectRecommendationDialog);
