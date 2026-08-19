import React, { useState, useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import CustomDialog from '@components/CustomDialog/CustomDialog';
import withSharedComponents from '@components/WrapperComponent';
import { SkyFlexGap8, SkyBox, SkyTypography, SkyRadioGroup, SkyFormControlLabel, SkyRadio } from '@styles/SkyStyles';

const TitleContainer = styled(SkyFlexGap8)(() => ({
  color: '#2364B0',
  width: '100%',
  justifyContent: 'center',
  fontWeight: 700,
  textTransform: 'uppercase',
}));

const ContentContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const RejectHeaderRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
}));

const StyledRadioGroup = styled(SkyRadioGroup)(({ theme }) => ({
  flexDirection: 'row',
  marginBottom: 0,
  gap: theme.spacing(2),
}));

const StyledFormControlLabel = styled(SkyFormControlLabel)(() => ({
  '& .MuiFormControlLabel-label': {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
}));

const LabelText = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.875rem',
  marginBottom: 0,
  textTransform: 'uppercase',
  '& .required': {
    color: theme.palette.error.main,
  },
}));

const RejectFBSuggestPendingDialog = ({ open, onClose, onConfirm, sharedComponents, isLoading }) => {
  const { InputComponents, toast } = sharedComponents;
  const [reason, setReason] = useState('');
  const [returnTarget, setReturnTarget] = useState('creator');

  // Reset state khi dialog mở
  useEffect(() => {
    if (open) {
      setReason('');
      setReturnTarget('creator');
    }
  }, [open]);

  const handleReasonChange = useCallback((e) => {
    setReason(e.target.value);
  }, []);

  const handleReturnTargetChange = useCallback((e) => {
    setReturnTarget(e.target.value);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!reason.trim()) {
      toast('Vui lòng nhập lý do từ chối!', 'warning');
      return;
    }
    onConfirm({ reason, returnTarget });
  }, [onConfirm, reason, returnTarget, toast]);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleConfirm}
      title={
        <TitleContainer>
          Từ chối phản ánh
        </TitleContainer>
      }
      isLoading={isLoading}
      titleButton={isLoading ? 'Đang xử lý...' : 'Đồng ý'}
      disabledSave={!reason.trim() || isLoading}
      size="md"
    >
      <ContentContainer>
        <RejectHeaderRow>
          <LabelText>
            Ý kiến từ chối <span className="required">*</span>
          </LabelText>
          <StyledRadioGroup value={returnTarget} onChange={handleReturnTargetChange}>
            <StyledFormControlLabel
              value="creator"
              control={<SkyRadio size="small" />}
              label="Trả về người tạo"
            />
            <StyledFormControlLabel
              value="dispatcher"
              control={<SkyRadio size="small" />}
              label="Trả về người điều phối"
            />
          </StyledRadioGroup>
        </RejectHeaderRow>

        <SkyBox>
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

export default withSharedComponents(RejectFBSuggestPendingDialog);
