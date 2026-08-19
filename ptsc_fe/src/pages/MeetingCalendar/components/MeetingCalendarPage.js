import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Paper, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import './calendar.styles.css';
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE, API_GET_MEETING_COMPANY, API_GET_MEETING_INDIVIDUAL, API_GET_MEETING_UNITS } from "@EnvironmentFile/constants/urlConfig";
import { MEETING_STATUS } from './constants';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/vi';

// Initialize dayjs
dayjs.extend(customParseFormat);
dayjs.locale('vi');

// Styled components
const StyledPaper = styled(Paper)({
  padding: '0',
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
  width: '100%',
  height: '100%'
});

const calendarOptions = {
  height: '100%'
};

const MeetingCalendarPage = ({ onEventClick, onDateClick, editable = false, fnCode }) => {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const calendarRef = useRef(null);
  const [currentView, setCurrentView] = useState('timeGridDay');

  const fetchEvents = async (queryString) => {
    try {
      let apiUrl = API_ADD_MEETING_SCHEDULE;

      // Kiểm tra fnCode để đổi API
      if (fnCode === 'LICHCONGTY') { // Thay 'LICH_TONG_CTY' bằng mã thực tế của tab bạn cấu hình
        apiUrl = API_GET_MEETING_COMPANY;
      } else if (fnCode === 'LICHCANHAN') {
        apiUrl = API_GET_MEETING_INDIVIDUAL;
      } else if (fnCode === 'LICHDONVI') {
        apiUrl = API_GET_MEETING_UNITS;
      }

      // console.log("Fetching events from:", apiUrl, "with query:", queryString);
      const response = await axiosInstance.get(`${apiUrl}?${queryString}`);
      if (response && response.items) {
        // console.log("API Response Items:", response.items);
        // console.log("Total Events:", response.total);
        
        // Lưu total vào state
        setTotalEvents(response.total || 0);
        
        const mappedEvents = response.items.map(item => {
          const statusKey = item.status || 'DRAFT';
          const statusInfo = MEETING_STATUS[statusKey] || MEETING_STATUS.DRAFT;
          
          
          // Format date to YYYY-MM-DD to safely combine with time
          // Explicitly parse DD/MM/YYYY since BE returns that format
          const datePart = dayjs(item.meetingDate, 'DD/MM/YYYY').format('YYYY-MM-DD');

          let start = datePart;
          let end = datePart;
          let allDay = true; // Mặc định là cả ngày nếu không có giờ cụ thể
          
          if (item.meetingDate && item.meetingTime) {
            // Handle time format "13:30-16:00" or "13:30 - 16:00"
            // Sử dụng regex để split cả dấu gạch ngang (-) và gạch nối dài (–) phòng trường hợp copy paste
            const timeParts = item.meetingTime.split(/[-–]/);
            if (timeParts.length >= 2) {
                const startTime = timeParts[0].trim();
                const endTime = timeParts[1].trim();
                // Ensure proper ISO format if needed, but T is standard
                start = `${datePart}T${startTime}:00`;
                end = `${datePart}T${endTime}:00`;
                allDay = false; // Đã parse được giờ thì không phải allDay
            }
          }

          return {
            id: item.id,
            title: item.title,
            start: start,
            end: end,
            allDay: allDay,
            className: statusInfo ? `event-${statusInfo.bg}` : 'event-blue',
            backgroundColor: statusInfo.bg,
            borderColor: statusInfo.border,
            textColor: statusInfo.border,
            extendedProps: { 
                ...item,
                time: item.meetingTime,
                creator: `Người tạo: ${item.createdByName || ''}`
            }
          };
        });
        // console.log("Mapped Events:", mappedEvents);
        setEvents(mappedEvents);
      } else {
        // console.log("No items in response or invalid format", response);
        setEvents([]);
        setTotalEvents(0);
      }
    } catch (error) {
      logger.error("Error fetching meetings:", error);
      setEvents([]);
    }
  };

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

  const handleDatesSet = (dateInfo) => {
    let type = 'day';
    let queryString = '';

    if (dateInfo.view.type === 'dayGridMonth') {
      type = 'month';
      // Sử dụng currentStart để lấy tháng đang được xem (ngày mùng 1 của tháng)
      const currentMonth = dayjs(dateInfo.view.currentStart).format('YYYY-MM');
      queryString = `type=${type}&filter[currentMonth]=${currentMonth}`;
    }
    else if (dateInfo.view.type === 'timeGridWeek') {
      type = 'week';
      const startDate = dayjs(dateInfo.start).format('YYYY-MM-DD');
      const endDate = dayjs(dateInfo.end).format('YYYY-MM-DD');
      queryString = `type=${type}&filter[currentWeek][startDate]=${startDate}&filter[currentWeek][endDate]=${endDate}`;
    }
    else if (dateInfo.view.type === 'timeGridDay') {
      type = 'day';
      // Sử dụng currentStart cho ngày hiện tại đang xem
      const currentDate = dayjs(dateInfo.view.currentStart).format('YYYY-MM-DD');
      queryString = `type=${type}&filter[currentDate]=${currentDate}`;
    }
    
    fetchEvents(queryString);
    setCurrentView(type);
  };

  // Update event count text dynamically for day view
  useEffect(() => {
    if (currentView === 'day') {
      // Wait for DOM to be ready
      setTimeout(() => {
        const eventCountElement = document.querySelector('.fc-timeGridDay-view .fc-daygrid-day-events');
        if (eventCountElement) {
          // Remove existing custom element if any
          const existingCount = eventCountElement.querySelector('.custom-event-count');
          if (existingCount) {
            existingCount.remove();
          }
          
          // Create and insert new element
          const countDiv = document.createElement('div');
          countDiv.className = 'custom-event-count';
          countDiv.style.cssText = 'display: block; color: #1976d2; font-size: 13px; font-weight: 400; margin-bottom: 4px;';
          countDiv.textContent = `${totalEvents} sự kiện hôm nay`;
          
          // Insert at the beginning
          eventCountElement.insertBefore(countDiv, eventCountElement.firstChild);
        }
      }, 100);
    }
  }, [totalEvents, currentView]);

  /* Custom event content render for TimeGrid views (Day/Week)
     Displays Title on top, then Time below */
  const renderEventContent = (eventInfo) => {
    return (
      <div>
        <div className="fc-event-title">
          {eventInfo.event.title}
        </div>
        <div className="fc-event-time">
          {eventInfo.timeText}
        </div>
      </div>
    );
  };

  return (
    <StyledPaper elevation={0}>
      <ScrollableWrapper>
        <CalendarContainer data-theme={theme.palette.mode}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="timeGridDay"
          // initialDate="2026-12-09" // Removed hardcoded initial date to show current date or let it default to today
          locale="vi"
          headerToolbar={{
            left: 'customToday customPrev,title,customNext',
            center: '',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          customButtons={{
            customToday: {
              text: 'Hiện tại',
              click: () => {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.today();
              }
            },
            customPrev: {
              text: '<',
              click: () => {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.prev();
              }
            },
            customNext: {
              text: '>',
              click: () => {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.next();
              }
            }
          }}
          buttonText={{
            month: 'LỊCH THÁNG',
            week: 'LỊCH TUẦN',
            day: 'LỊCH NGÀY'
          }}
          titleFormat={(info) => {
            const date = dayjs(info.date.marker);
            const view = calendarRef.current?.getApi().view;
            
            if (view?.type === 'timeGridWeek') {
              // Week view: show date range like "8 - 14 Tháng 12 2025"
              const start = dayjs(view.currentStart);
              const end = dayjs(view.currentEnd).subtract(1, 'day'); // Subtract 1 day because end is exclusive
              
              // If same month
              if (start.month() === end.month()) {
                return `${start.date()} - ${end.date()} ${start.format('[tháng] MM [năm] YYYY')}`;
              } else {
                // Different months
                return `${start.date()} ${start.format('[tháng] MM')} - ${end.date()} ${end.format('[tháng] MM [năm] YYYY')}`;
              }
            }
            
            if (view?.type === 'timeGridDay') {
              return date.format('[Ngày] DD [tháng] MM [năm] YYYY');
            }

            // Month view or fallback
            return date.format('MMMM [năm] YYYY');
          }}
          dayHeaderFormat={{ weekday: 'long' }}
          events={events}
          editable={editable}
          selectable
          selectMirror
          dayMaxEvents={3}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          views={{
            timeGrid: {
              eventContent: renderEventContent
            }
          }}
          {...calendarOptions}
          firstDay={1} // Bắt đầu từ thứ Hai
          dayHeaderContent={(args) => {
            const view = calendarRef.current?.getApi().view;
            const weekdayNames = {
              0: 'Chủ Nhật',
              1: 'Thứ Hai',
              2: 'Thứ Ba',
              3: 'Thứ Tư',
              4: 'Thứ Năm',
              5: 'Thứ Sáu',
              6: 'Thứ Bảy'
            };
            
            // Week view or Day view: show day number in circle + weekday name
            if (view?.type === 'timeGridWeek' || view?.type === 'timeGridDay') {
              const dayNumber = args.date.getDate();
              const weekdayName = weekdayNames[args.date.getDay()];
              const isToday = dayjs(args.date).isSame(dayjs(), 'day');
              
              const isDayView = view?.type === 'timeGridDay';
              const showCircle = isDayView || isToday;

              return (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isDayView ? 'row' : 'column', 
                  alignItems: 'center', 
                  gap: isDayView ? '12px' : '4px',
                  padding: isDayView ? '10px' : '0'
                }}>
                  <div style={{
                    width: showCircle ? (isDayView ? '48px' : '32px') : 'auto',
                    height: showCircle ? (isDayView ? '48px' : '32px') : 'auto',
                    borderRadius: showCircle ? '50%' : '0',
                    backgroundColor: showCircle ? '#1976d2' : 'transparent',
                    color: showCircle ? '#fff' : theme.palette.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: showCircle ? (isDayView ? '20px' : '18px') : '18px',
                    fontWeight: (showCircle || isDayView) ? '600' : '400',
                    flexShrink: 0
                  }}>
                    {dayNumber}
                  </div>
                  <div style={{ 
                    fontSize: isDayView ? '16px' : '13px', 
                    color: isDayView ? theme.palette.text.primary : theme.palette.text.secondary,
                    fontWeight: isDayView ? '400' : '400'
                  }}>
                    {weekdayName}
                  </div>
                </div>
              );
            }
            
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
          scrollTime="08:00:00"
          moreLinkText={(num) => `+${num} khác`}
          noEventsText="Không có sự kiện"
        />
        </CalendarContainer>
      </ScrollableWrapper>
    </StyledPaper>
  );
};

export default MeetingCalendarPage;
