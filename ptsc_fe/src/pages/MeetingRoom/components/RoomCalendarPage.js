import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import './room.styles.css';

// Styled components
const StyledPaper = styled(Paper)({
  padding: '16px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const ScrollableWrapper = styled('div')({
  flex: 1,
  overflowX: 'auto',
  overflowY: 'hidden',
  minHeight: 0,
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px'
  },
  '&::-webkit-scrollbar-track': {
    background: '#f5f5f5',
    borderRadius: '4px'
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#bdbdbd',
    borderRadius: '4px'
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#9e9e9e'
  }
});

const CalendarContainer = styled('div')({
  minWidth: '1200px',
  height: '100%'
});

const calendarOptions = {
  height: '100%'
};

const RoomCalendarPage = ({ events = [], onEventClick, onDateClick, editable = false }) => {

  // Dữ liệu mẫu giống như trong ảnh với các màu khác nhau
  const defaultEvents = [
    // Thứ hai (2/12) - Xanh (bình thường)
    { id: '1', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-02', className: 'event-blue' },
    { id: '2', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-02', className: 'event-red' },
    
    // Thứ ba (3/12) - Xanh
    { id: '3', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-03', className: 'event-blue' },
    { id: '4', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-03', className: 'event-blue' },
    
    // Thứ tư (4/12) - Xanh
    { id: '5', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-04', className: 'event-blue' },
    
    // Thứ năm (9/12) - Nhiều màu
    { id: '6', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-09', className: 'event-blue' },
    { id: '7', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-09', className: 'event-blue' },
    { id: '8', title: '+ 4 khác', start: '2026-12-09', className: 'event-more' },
    
    // Thứ sáu (10/12) - Xanh
    { id: '9', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-10', className: 'event-blue' },
    { id: '10', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-10', className: 'event-blue' },
    { id: '11', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-10', className: 'event-blue' },
    
    // Thứ bảy (11/12) - Xanh
    { id: '12', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-11', className: 'event-blue' },
    { id: '13', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-11', className: 'event-blue' },
    { id: '14', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-11', className: 'event-blue' },
    
    // Chủ nhật (12/12) - Xanh
    { id: '15', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-12', className: 'event-blue' },
    { id: '16', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-12', className: 'event-blue' },
    
    // Thứ hai (13/12) - Xanh
    { id: '17', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-13', className: 'event-blue' },
    { id: '18', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-13', className: 'event-blue' },
    
    // Thứ hai (22/12) - Nhiều màu (xanh, đỏ, cam)
    { id: '19', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-22', className: 'event-blue' },
    { id: '20', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-22', className: 'event-red' },
    { id: '21', title: 'Tiêu đề lịch họp - Người tạo: Tên', start: '2026-12-22', className: 'event-orange' },
    
    // Events cho day view (9/12/2025) - với thời gian cụ thể
    { 
      id: 'day1', 
      title: 'Lịch họp giao ban định kỳ', 
      start: '2026-12-09T09:00:00',
      end: '2026-12-09T11:00:00',
      className: 'event-blue',
      extendedProps: {
        time: '09:00 - 11:00',
        creator: 'Người tạo: Tên người tạo'
      }
    },
    { 
      id: 'day2', 
      title: 'Báo cáo tài chính năm 2030', 
      start: '2026-12-09T11:00:00',
      end: '2026-12-09T12:00:00',
      className: 'event-green',
      extendedProps: {
        time: '11:00 - 12:00',
        creator: 'Người tạo: Tên người tạo'
      }
    },
    { 
      id: 'day3', 
      title: 'Họp khẩn cấp - Dự án mới', 
      start: '2026-12-09T13:00:00',
      end: '2026-12-09T14:30:00',
      className: 'event-red',
      extendedProps: {
        time: '13:00 - 14:30',
        creator: 'Người tạo: Nguyễn Văn A'
      }
    },
    { 
      id: 'day4', 
      title: 'Review code với team', 
      start: '2026-12-09T14:30:00',
      end: '2026-12-09T16:00:00',
      className: 'event-orange',
      extendedProps: {
        time: '14:30 - 16:00',
        creator: 'Người tạo: Trần Thị B'
      }
    },
    { 
      id: 'day5', 
      title: 'Đào tạo nhân viên mới', 
      start: '2026-12-09T16:00:00',
      end: '2026-12-09T17:30:00',
      className: 'event-purple',
      extendedProps: {
        time: '16:00 - 17:30',
        creator: 'Người tạo: Lê Văn C'
      }
    },
    
    // Events for week view - other days
    { 
      id: 'week1', 
      title: 'Họp ban giám đốc', 
      start: '2026-12-09T06:00:00',
      end: '2026-12-09T09:30:00',
      className: 'event-blue',
      extendedProps: {
        time: '06:00 - 09:30',
        creator: 'Người tạo: Tên người tạo'
      }
    },
    { 
      id: 'week2', 
      title: 'Họp ban giám đốc 2', 
      start: '2026-12-10T07:00:00',
      end: '2026-12-10T11:00:00',
      className: 'event-blue',
      extendedProps: {
        time: '07:00 - 11:00',
        creator: 'Người tạo: Tên người tạo'
      }
    },
    { 
      id: 'week3', 
      title: 'Training session', 
      start: '2026-12-11T09:00:00',
      end: '2026-12-11T12:00:00',
      className: 'event-green',
      extendedProps: {
        time: '09:00 - 12:00',
        creator: 'Người tạo: HR Team'
      }
    },
    { 
      id: 'week4', 
      title: 'Client meeting', 
      start: '2026-12-12T14:00:00',
      end: '2026-12-12T16:00:00',
      className: 'event-orange',
      extendedProps: {
        time: '14:00 - 16:00',
        creator: 'Người tạo: Sales Team'
      }
    },
  ];

  const calendarEvents = events.length > 0 ? events : defaultEvents;

  const handleEventClick = (clickInfo) => {
    if (onEventClick) {
      onEventClick(clickInfo.event);
    }
  };

  const handleDateClick = (arg) => {
    if (onDateClick) {
      onDateClick(arg);
    }
  };

  // Drag & drop đã bị tắt - không cần handlers

  return (
    <StyledPaper elevation={0}>
      <ScrollableWrapper>
        <CalendarContainer>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="timeGridDay"
          initialDate="2026-12-09"
          locale="vi"
          headerToolbar={{
            left: 'customToday customPrev,title,customNext',
            center: '',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          customButtons={{
            customToday: {
              text: 'Hiện tại',
              click: function() {
                const calendarApi = this;
                calendarApi.today();
              }
            },
            customPrev: {
              text: '<',
              click: function() {
                const calendarApi = this;
                calendarApi.prev();
              }
            },
            customNext: {
              text: '>',
              click: function() {
                const calendarApi = this;
                calendarApi.next();
              }
            }
          }}
          buttonText={{
            month: 'LỊCH THÁNG',
            week: 'LỊCH TUẦN',
            day: 'LỊCH NGÀY'
          }}
          titleFormat={{ year: 'numeric', month: 'long' }}
          dayHeaderFormat={{ weekday: 'long' }}
          events={calendarEvents}
          editable={editable}
          selectable
          selectMirror
          dayMaxEvents={3}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          {...calendarOptions}
          firstDay={1} // Bắt đầu từ thứ Hai
          dayHeaderContent={(args) => {
            const weekdayNames = {
              0: 'Chủ Nhật',
              1: 'Thứ Hai',
              2: 'Thứ Ba',
              3: 'Thứ Tư',
              4: 'Thứ Năm',
              5: 'Thứ Sáu',
              6: 'Thứ Bảy'
            };
            return weekdayNames[args.date.getDay()];
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          slotDuration="01:00:00"
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          allDaySlot
          allDayText="Cả ngày"
          nowIndicator
          scrollTime="08:00:00"
          moreLinkText={(num) => `+${num} khác`}
          noEventsText="Không có sự kiện"
        />
        </CalendarContainer>
      </ScrollableWrapper>
    </StyledPaper>
  );
};

export default RoomCalendarPage;
