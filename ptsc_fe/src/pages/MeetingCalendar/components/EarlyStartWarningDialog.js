import React, { useCallback } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Avatar,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import InputComponents from '@components/CustomInput/CustomInput';

const StyledDialog = styled(Dialog)({
  '& .MuiPaper-root': {
    borderRadius: 8,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
});

const StyledDialogTitle = styled(DialogTitle)({
  margin: 0,
  padding: '16px 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontWeight: 600,
  fontSize: '1.125rem',
  color: '#111827',
  borderBottom: '1px solid #F3F4F6',
});

const CloseIconButton = styled(IconButton)(() => ({
  color: '#9CA3AF',
  padding: 8,
  marginRight: -8,
  '&:hover': {
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
  },
}));

const StyledDialogContent = styled(DialogContent)({
  padding: '24px !important',
  overflowY: 'hidden', // Ngăn scroll toàn bộ popup
});

const WarningBox = styled(Box)({
  backgroundColor: '#FFFBEB',
  color: '#92400E',
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  marginBottom: 24,
  borderLeft: '4px solid #F59E0B',
});

const WarningIcon = styled(WarningAmberIcon)({
  color: '#D97706',
  marginRight: 12,
  fontSize: 20,
});

const WarningText = styled(Typography)({
  fontWeight: 500,
  fontSize: '0.875rem',
});

const SectionBox = styled(Box)({
  marginBottom: 24,
});

const SectionTitleTypography = styled(Typography)({
  fontWeight: 600,
  color: '#64748B',
  display: 'flex',
  alignItems: 'center',
  marginBottom: 12,
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
});

const SectionWarningIcon = styled(WarningAmberIcon)({
  color: '#D97706',
  fontSize: 16,
  marginRight: 6,
});

const ConflictList = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: '260px',
  overflowY: 'auto',
  paddingRight: 8,
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#D1D5DB',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: '#9CA3AF',
  },
});

const UserConflictItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  backgroundColor: '#F8FAFC',
  borderRadius: 6,
  border: '1px solid #E2E8F0',
});

const UserAvatar = styled(Avatar)({
  width: 36,
  height: 36,
  marginRight: 12,
  backgroundColor: '#E2E8F0',
  color: '#475569',
  fontSize: '0.875rem',
  fontWeight: 600,
});

const UserNameText = styled(Typography)({
  fontWeight: 600,
  color: '#1E293B',
  fontSize: '0.875rem',
  lineHeight: 1.4,
});

const UserMeetingText = styled(Typography)({
  color: '#DC2626',
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.75rem',
  marginTop: 2,
});

const BusyIcon = styled(EventBusyIcon)({
  fontSize: 14,
  marginRight: 4,
});

const RoomConflictItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px',
  backgroundColor: '#FFFFFF',
  borderRadius: 6,
  border: '1px solid #E2E8F0',
});

const RoomInfoBox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
});

const RoomIconWrapper = styled(Box)({
  marginRight: 16,
  color: '#0284C7',
  display: 'flex',
  alignItems: 'center',
});

const RoomNameText = styled(Typography)({
  fontWeight: 600,
  color: '#1E293B',
  fontSize: '0.875rem',
});

const RoomLocationText = styled(Typography)({
  color: '#64748B',
  fontSize: '0.8125rem',
  marginTop: 2,
});

const RoomStatusBox = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
});

const InUseBadge = styled(Box)({
  backgroundColor: '#FEE2E2',
  color: '#DC2626',
  padding: '4px 8px',
  borderRadius: 4,
  fontSize: '0.75rem',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  marginBottom: 4,
});

const InUseDot = styled(Box)({
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: '#DC2626',
  marginRight: 6,
});

const InUseTimeText = styled(Typography)({
  color: '#64748B',
  fontSize: '0.75rem',
});

const ReasonTitle = styled(Typography)({
  fontWeight: 600,
  color: '#64748B',
  display: 'block',
  marginBottom: 8,
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
});


const StyledDialogActions = styled(DialogActions)({
  padding: '16px 24px',
  backgroundColor: '#F8FAFC',
  borderTop: '1px solid #F3F4F6',
});

const CancelButton = styled(Button)({
  color: '#475569',
  borderColor: '#E2E8F0',
  backgroundColor: '#FFFFFF',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  borderRadius: 6,
  padding: '6px 20px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '&:hover': {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
});

const ConfirmButton = styled(Button)({
  backgroundColor: '#0284C7',
  color: '#FFFFFF',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  borderRadius: 6,
  padding: '6px 20px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '&:hover': {
    backgroundColor: '#0369A1',
  },
  '&.Mui-disabled': {
    backgroundColor: '#93C5FD',
    color: '#FFFFFF',
  }
});

const EarlyStartWarningDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  data, 
  reason, 
  setReason 
}) => {
  const { userConflicts = [], roomConflicts = [] } = data || {};

  const handleReasonChange = useCallback((e) => {
    const val = e?.target !== undefined ? e.target.value : e;
    setReason(val);
  }, [setReason]);

  return (
    <StyledDialog 
      open={open} 
      onClose={onClose} 
      fullWidth
    >
      <StyledDialogTitle>
        Cảnh báo bắt đầu họp sớm
        <CloseIconButton
          aria-label="close"
          onClick={onClose}
        >
          <CloseIcon />
        </CloseIconButton>
      </StyledDialogTitle>
      
      <StyledDialogContent>
        <WarningBox>
          <WarningIcon />
          <WarningText variant="body2">
            Bạn đang bắt đầu cuộc họp sớm hơn thời gian dự kiến.
          </WarningText>
        </WarningBox>

        {userConflicts.length > 0 && (
          <SectionBox>
            <SectionTitleTypography variant="caption">
              <SectionWarningIcon />
              Thành viên đang bận
            </SectionTitleTypography>
            <ConflictList>
              {userConflicts.map((user, idx) => (
                <UserConflictItem key={idx}>
                  <UserAvatar>
                    {user.userName?.substring(0, 2).toUpperCase()}
                  </UserAvatar>
                  <Box>
                    <UserNameText variant="subtitle2">
                      {user.userName}
                    </UserNameText>
                    <UserMeetingText variant="caption">
                      <BusyIcon /> 
                      Đang họp: {user.meetingName} {user.meetingTime ? `(${user.meetingTime})` : ''}
                    </UserMeetingText>
                  </Box>
                </UserConflictItem>
              ))}
            </ConflictList>
          </SectionBox>
        )}

        {roomConflicts.length > 0 && (
          <SectionBox>
            <SectionTitleTypography variant="caption">
              Trạng thái phòng họp
            </SectionTitleTypography>
            <ConflictList>
              {roomConflicts.map((room, idx) => (
                <RoomConflictItem key={idx}>
                  <RoomInfoBox>
                    <RoomIconWrapper>
                      <MeetingRoomIcon />
                    </RoomIconWrapper>
                    <Box>
                      <RoomNameText variant="subtitle2">
                        {room.roomName || 'Phòng họp'}
                      </RoomNameText>
                      <RoomLocationText variant="caption">
                        {room.location || ''}
                      </RoomLocationText>
                    </Box>
                  </RoomInfoBox>
                  <RoomStatusBox>
                    <InUseBadge>
                      <InUseDot />
                      Đang được sử dụng
                    </InUseBadge>
                    <InUseTimeText variant="caption">
                      Đến {room.endTime || room.meetingTime} hôm nay
                    </InUseTimeText>
                  </RoomStatusBox>
                </RoomConflictItem>
              ))}
            </ConflictList>
          </SectionBox>
        )}

        <Box>
          <ReasonTitle variant="caption">
            Lý do bắt đầu sớm
          </ReasonTitle>
          <InputComponents
            multiline
            rows={3.5}
            fullWidth
            placeholder="Nhập lý do bắt đầu cuộc họp sớm..."
            value={reason}
            onChange={handleReasonChange}
          />
        </Box>
      </StyledDialogContent>
      
      <StyledDialogActions>
        <CancelButton 
          onClick={onClose} 
          variant="outlined" 
        >
          Hủy bỏ
        </CancelButton>
        <ConfirmButton 
          onClick={onConfirm} 
          variant="contained" 
          disabled={!reason.trim()}
        >
          Xác nhận & Bắt đầu
        </ConfirmButton>
      </StyledDialogActions>
    </StyledDialog>
  );
};

export default EarlyStartWarningDialog;
