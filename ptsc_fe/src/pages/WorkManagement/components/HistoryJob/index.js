import { styled, Box } from '@mui/material';
import { SkyBox, SkyTypography } from '@styles/SkyStyles';
import React, { memo } from 'react'
import { JobNoteIcon } from '@pages/WorkManagement/components/Job.styles';
import dayjs from 'dayjs';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const TimelineContainer = styled(SkyBox)(({ theme }) => ({
  position: 'relative',
  paddingLeft: '32px',
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  maxHeight: 465,
  overflowY: 'auto',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '15px',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
  },
  /* Custom scrollbar for better aesthetics */
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.mode === 'dark' ? '#475569' : '#CBD5E1',
    borderRadius: '10px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.mode === 'dark' ? '#64748B' : '#94A3B8',
  },
}));

const TimelineItem = styled(SkyBox)(({ theme }) => ({
  position: 'relative',
  paddingBottom: theme.spacing(3),
  '&:last-child': {
    paddingBottom: 0,
  },
}));

const TimelineDot = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: '-23px', // paddingLeft(32px) - 23px = 9px. 9px + (12px/2) = 15px (centered on line)
  top: '6px',
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: '#2364B0',
  border: `2px solid ${theme.palette.background.paper}`,
  zIndex: 1,
  boxShadow: '0 0 0 1px rgba(35, 100, 176, 0.2)',
}));


const ContentWrapper = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}));

const ActionText = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== 'isRejected',
})(({ theme, isRejected }) => ({
  fontSize: '0.9375rem',
  color: isRejected ? '#2364B0' : theme.palette.text.primary,
  lineHeight: 1.5,
  '& strong': {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
}));

const TimeText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.8125rem',
  color: theme.palette.text.secondary,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginTop: '2px',
}));

const EmptyBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
}));

const EmptyText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const StyledJobNoteIcon = styled(JobNoteIcon)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  fontSize: '1.1rem',
  verticalAlign: 'middle',
  cursor: 'pointer',
  '&:hover': {
    color: '#1a4d8a',
  },
}));

const StyledAccessTimeIcon = styled(AccessTimeIcon)(() => ({
  fontSize: '0.9rem',
  color: 'inherit',
}));

const HistoryJob = (props) => {
  const { historyData, createHandleNoteClick } = props;

  if (!historyData || historyData.length === 0) {
    return (
      <EmptyBox elevation={0}>
        <EmptyText variant="body2">
          Chưa có lịch sử hoạt động
        </EmptyText>
      </EmptyBox>
    );
  }

  return (
    <TimelineContainer>
      {historyData.map((item) => {
        const isRejected = item?.details?.toLowerCase()?.includes('từ chối');
        
        return (
          <TimelineItem key={item.id}>
            <TimelineDot />
            <ContentWrapper>
              <ActionText isRejected={isRejected}>
                <strong>{item.fullName}</strong> {item.details}
                {isRejected && (
                  <StyledJobNoteIcon 
                    onClick={createHandleNoteClick(item.note)} 
                  />
                )}
              </ActionText>
              <TimeText>
                <StyledAccessTimeIcon />
                {item.createdAt ? dayjs(item.createdAt).format("DD/MM/YYYY HH:mm") : "---"}
              </TimeText>
            </ContentWrapper>
          </TimelineItem>
        );
      })}
    </TimelineContainer>
  );
};


export default memo(HistoryJob);