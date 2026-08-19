import React, { useState } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SchedulerCalendar from '@components/SchedulerCalendar';

// Styled components
const StyledContainer = styled(Box)({
  width: '100%',
  height: '600px', // Give it a fixed height for initial render
  display: 'flex',
  flexDirection: 'column'
});

const StyledDialogTitle = styled(DialogTitle)({
  borderBottom: '1px solid #e0e0e0'
});

const StyledDialogContent = styled(DialogContent)({
  padding: '24px',
  minWidth: '400px'
});

const EventTitle = styled(Typography)({
  marginBottom: '8px',
  fontWeight: 500
});

const EventDetail = styled(Typography)({
  marginBottom: '4px',
  color: '#666'
});

const CloseButton = styled(Button)({
  marginRight: '8px'
});

const DemoScheduler = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);



  const handleEventClick = (event) => {
    try {
      logger.info('[DemoScheduler] Handling event click:', event?.title);
      setSelectedEvent(event);
      setDialogOpen(true);
    } catch (error) {
      logger.error('[DemoScheduler] Error in handleEventClick:', error);
    }
  };

  const handleDateClick = () => {
    try {
      logger.info('[DemoScheduler] Handling date click');
      // Handle date click - có thể mở form tạo event mới
    } catch (error) {
      logger.error('[DemoScheduler] Error in handleDateClick:', error);
    }
  };

  const handleCloseDialog = () => {
    try {
      logger.info('[DemoScheduler] Closing dialog');
      setDialogOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      logger.error('[DemoScheduler] Error in handleCloseDialog:', error);
    }
  };

  return (
    <StyledContainer>
      <SchedulerCalendar 
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
      />

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <StyledDialogTitle>Chi tiết sự kiện</StyledDialogTitle>
        <StyledDialogContent>
          {selectedEvent && (
            <>
              <EventTitle variant="h6">
                {selectedEvent.title}
              </EventTitle>
              <EventDetail variant="body2">
                Bắt đầu: {selectedEvent.start?.toLocaleString()}
              </EventDetail>
              {selectedEvent.end && (
                <EventDetail variant="body2">
                  Kết thúc: {selectedEvent.end?.toLocaleString()}
                </EventDetail>
              )}
            </>
          )}
        </StyledDialogContent>
        <DialogActions>
          <CloseButton onClick={handleCloseDialog}>
            Đóng
          </CloseButton>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
};

export default DemoScheduler;
