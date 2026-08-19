import React, { useEffect, useState } from 'react';
import {
  Container,
  // Typography,
  // // Dialog,
  // DialogTitle,
  // DialogContent,
  // // DialogActions,
  // Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MeetingScheduleCalendar from './components/MeetingScheduleCalendar';
// import CalendarFooter from './components/CalendarFooter';
import ViewMeetingSchedule from './components/ViewMeetingSchedule';
import withSharedComponents from "@components/WrapperComponent";
import { getGlobalTableState, subscribeGlobalTableState } from '@utils/GlobalTableState';

// Styled components
const StyledContainer = styled(Container)(({ theme }) => ({
  maxWidth: '100% !important',
  // padding: '16px 0',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.up('sm')]: {
    paddingLeft: '0 !important',
    paddingRight: '0 !important',
  }
}));

// const PageTitle = styled(Typography)({
//   marginBottom: '24px',
//   fontWeight: 600
// });

// const StyledDialogTitle = styled(DialogTitle)({
//   borderBottom: '1px solid #e0e0e0'
// });

// const StyledDialogContent = styled(DialogContent)({
//   padding: '24px',
//   minWidth: '400px'
// });

// const EventTitle = styled(Typography)({
//   marginBottom: '8px',
//   fontWeight: 500
// });

// const EventDetail = styled(Typography)({
//   marginBottom: '4px',
//   color: '#666'
// });

// const CloseButton = styled(Button)({
//   marginRight: '8px'
// });

const MeetingCalendar = ({ sharedComponents, ...props }) => {

  const [globalState, setGlobalState] = useState(getGlobalTableState());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
const effectiveFullscreen = Boolean(
        globalState.isFullscreen || 
        globalState.fullscreen ||
        props.isFullscreen
    );
    // console.log('MeetingCalendar - effectiveFullscreen from global:', effectiveFullscreen);
  useEffect(() => {
    // Đảm bảo lấy state mới nhất khi mount
    setGlobalState(getGlobalTableState());

    // Subscribe thay đổi
    const unsubscribe = subscribeGlobalTableState((newState) => {
      setGlobalState(prev => ({ ...prev, ...newState }));
    });
    return unsubscribe;
  }, []);
  const context = { ...globalState };
  const currentFnCode = props.fnCode ||context?.fnCode;

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleDateClick = () => {
    // Handle date click - có thể mở form tạo event mới
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEvent(null);
  };

  return (
    <StyledContainer >
      {/* <PageTitle variant="h4">
        Demo Scheduler Calendar
      </PageTitle> */}

      <MeetingScheduleCalendar
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        fnCode={currentFnCode}
        item={props.item || context.item}
        templateApiUrl={props.templateApiUrl || context.templateApiUrl}
        queryParams={props.queryParams || context.queryParams}
        isFullscreen={effectiveFullscreen}
                isFullScreen={effectiveFullscreen}
                isCalendarFullscreen={effectiveFullscreen}
                fullscreen={effectiveFullscreen}

      />
      {/* <CalendarFooter /> */}

      <ViewMeetingSchedule
        open={dialogOpen}
        onClose={handleCloseDialog}
        meetingId={selectedEvent?.id}
        sharedComponents={sharedComponents}
        listparammeeting={selectedEvent?.listparammeeting || context.queryParams?.listparammeeting}
      />
    </StyledContainer>
  );
};

export default withSharedComponents(MeetingCalendar);
