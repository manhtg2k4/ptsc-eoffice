import React, { useState, useMemo, useCallback } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DatePickerContainer,
  Header,
  MonthLabel,
  NavButton,
  WeekdaysRow,
  WeekdayLabel,
  DaysGrid,
  DayCell,
  Footer,
  ActionButton,
} from './CustomDatePicker.styles';

moment.locale('vi');

const Day = React.memo(({ day, isCurrentMonth, isSelected, isToday, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(day);
  }, [day, onClick]);

  return (
    <DayCell
      $isOtherMonth={!isCurrentMonth}
      $isSelected={isSelected}
      $isToday={isToday}
      onClick={handleClick}
    >
      {day.date()}
    </DayCell>
  );
});

Day.displayName = 'Day';

const CustomDatePicker = ({ value, onChange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(value ? moment(value) : moment());

  const daysInMonth = useMemo(() => {
    const start = moment(currentMonth).startOf('month').startOf('week');
    const end = moment(currentMonth).endOf('month').endOf('week');
    const days = [];
    let day = start.clone();

    while (day.isBefore(end)) {
      days.push(day.clone());
      day.add(1, 'day');
    }
    return days;
  }, [currentMonth]);

  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const handleDateClick = useCallback((date) => {
    onChange(date.format('YYYY-MM-DD'));
    if (onClose) onClose();
  }, [onChange, onClose]);

  const nextMonth = useCallback((e) => {
    e.stopPropagation();
    setCurrentMonth((prev) => moment(prev).add(1, 'month'));
  }, []);

  const prevMonth = useCallback((e) => {
    e.stopPropagation();
    setCurrentMonth((prev) => moment(prev).subtract(1, 'month'));
  }, []);

  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleTodayClick = useCallback(() => {
    handleDateClick(moment());
  }, [handleDateClick]);

  const handleClear = useCallback(() => {
    onChange("");
    if (onClose) onClose();
  }, [onChange, onClose]);

  return (
    <DatePickerContainer onClick={stopPropagation}>
      <Header>
        <NavButton type="button" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </NavButton>
        <MonthLabel>
          Tháng {currentMonth.format('MM, YYYY')}
        </MonthLabel>
        <NavButton type="button" onClick={nextMonth}>
          <ChevronRight size={16} />
        </NavButton>
      </Header>

      <WeekdaysRow>
        {weekdays.map((d) => (
          <WeekdayLabel key={d}>{d}</WeekdayLabel>
        ))}
      </WeekdaysRow>

      <DaysGrid>
        {daysInMonth.map((day) => {
          const isCurrentMonth = day.month() === currentMonth.month();
          const isSelected = value && day.isSame(moment(value), 'day');
          const isToday = day.isSame(moment(), 'day');

          return (
            <Day
              key={day.valueOf()}
              day={day}
              isCurrentMonth={isCurrentMonth}
              isSelected={isSelected}
              isToday={isToday}
              onClick={handleDateClick}
            />
          );
        })}
      </DaysGrid>

      <Footer>
        <ActionButton type="button" onClick={handleTodayClick}>
          Hôm nay
        </ActionButton>
        <ActionButton type="button" $variant="clear" onClick={handleClear}>
          Xóa
        </ActionButton>
      </Footer>
    </DatePickerContainer>
  );
};

export default CustomDatePicker;
