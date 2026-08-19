import React, { useState, useCallback, memo, useRef, useMemo } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Popover, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import customParseFormat from "dayjs/plugin/customParseFormat";
import PropTypes from "prop-types";

import {
  ITEM_H,
  inputLabelPropsStyle,
  StyledActionRow,
  StyledButtonRow,
  StyledCalendarPopoverPaper,
  StyledCalendarRow,
  StyledCalendarSection,
  StyledDateTimePickerContainer,
  StyledDivider,
  StyledMonthYearSelect,
  StyledPickersDay,
  StyledPickerRoot,
  StyledPopoverContent,
  StyledRangeDayTypography,
  StyledSelectMenuItem,
  textFieldSx,
  calendarSx,
  StyledDateCalendar,
  StyledTriggerInput,
  StyledDateRangeIcon,
  StyledInputAdornmentDateRange,
  StyledButtonDeleteTime,
  StyledButtonCancelTime,
  StyledButtonConfirmTime,
  StyledTimePanelWrapper,
  StyledTimePanelInner,
  StyledTimePanelTitle,
  StyledTimePickerPaperCustom,
  StyledTimePickerColon,
  StyledCalendarTimePanelRowGrid,
  StyledMonthNavStackGrid,
  StyledMonthSelectorRowFlex,
  StyledDateTimeRangeGrid,
  StyledDateTimeRangeLabel,
  StyledDateTimeRangeRow,
  StyledDateDisplayBoxDate,
  StyledDateDisplayBoxTime,
  StyledMonthYearSelectorRowGrid,
  StyledScrollColumnWrapper,
  StyledScrollColumnLabelSpacer,
  StyledScrollColumnListContainer,
  StyledScrollListCustom,
  StyledScrollItemCustom,
} from "@styles/DatePicker/DatePicker.style";

dayjs.extend(customParseFormat);

const PARSE_FORMATS = [
  "DD/MM/YYYY HH:mm",
  "DD/MM/YYYY HH:mm:ss",
  "DD/MM/YYYY",
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DD HH:mm",
  "YYYY-MM-DD",
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i).filter(
  (m) => m % 5 === 0
);

const VI_MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const YEAR_RANGE = 20;

const parseDate = (val) => {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val.isValid() ? val : null;
  let d = dayjs(val, PARSE_FORMATS, true);
  if (d.isValid()) return d;
  d = dayjs(val);
  return d.isValid() ? d : null;
};

const clampDateToRange = (date, minDate, maxDate) => {
  if (!date) return null;
  let next = date;
  if (minDate && next.isBefore(minDate, "minute")) {
    next = minDate;
  }
  if (maxDate && next.isAfter(maxDate, "minute")) {
    next = maxDate;
  }
  return next;
};

const getRoundedTime = (baseDate, minutesToAdd = 0) => {
  const date = baseDate.add(minutesToAdd, "minute");
  const m = date.minute();
  const roundedM = Math.ceil(m / 5) * 5;
  if (roundedM === 60) {
    return date.add(1, "hour").minute(0).second(0).millisecond(0);
  }
  return date.minute(roundedM).second(0).millisecond(0);
};

/* =========================
  Day cell for range select
========================= */
function RangeDay(props) {
  const {
    day,
    outsideCurrentMonth,
    rangeStart,
    rangeEnd,
    hoveredDay,
    onDayHover,
    ...other
  } = props;

  const handleMouseEnter = useCallback(() => {
    onDayHover?.(day);
  }, [day, onDayHover]);

  if (outsideCurrentMonth) {
    return (
      <StyledPickersDay
        {...other}
        outsideCurrentMonth
        day={day}
        styledOpacity={0}
        styledPointerEvents="none"
      />
    );
  }

  const d = day.startOf("day");
  const start = rangeStart?.startOf("day");
  const end = rangeEnd?.startOf("day");
  const hovered = hoveredDay?.startOf("day");

  const isStart = start && d.isSame(start, "day");
  const isEnd = end && d.isSame(end, "day");
  const isSelected = isStart || isEnd;

  const previewEnd =
    !end && start && hovered && hovered.isAfter(start, "day") ? hovered : null;
  const effectiveEnd = end || previewEnd;

  const isBetweenRange =
    start &&
    effectiveEnd &&
    d.isAfter(start, "day") &&
    d.isBefore(effectiveEnd, "day");

  const isStartWithRange =
    isStart && effectiveEnd && !d.isSame(effectiveEnd, "day");

  const isEndOfRange =
    effectiveEnd &&
    d.isSame(effectiveEnd, "day") &&
    start &&
    !d.isSame(start, "day");

  const showRangeBg = isBetweenRange || isStartWithRange || isEndOfRange;
  const bgOpacity = previewEnd ? 0.08 : 0.15;

  const isDisabled = other.disabled;

  return (
    <StyledDateTimePickerContainer
      showRangeBg={showRangeBg}
      isStartWithRange={isStartWithRange}
      isEndOfRange={isEndOfRange}
      bgOpacity={bgOpacity}
      onMouseEnter={handleMouseEnter}
      styledOpacity={isDisabled ? 0.4 : undefined}
      styledPointerEvents={isDisabled ? "none" : undefined}
    >
      <StyledPickersDay
        {...other}
        outsideCurrentMonth={outsideCurrentMonth}
        day={day}
        selected={isSelected}
        disableMargin
        d={d}
        previewEnd={previewEnd}
      />
    </StyledDateTimePickerContainer>
  );
}

/* =========================
  Scroll time column
========================= */
function ScrollColumn({ values, selected, onChange, label, disabledValues = [] }) {
  const listRef = useRef(null);

  const scrollTo = useCallback(
    (val, behavior = "smooth") => {
      if (!listRef.current) return;
      const idx = values.indexOf(val);
      if (idx < 0) return;
      listRef.current.scrollTo({ top: idx * ITEM_H, behavior });
    },
    [values]
  );

  React.useEffect(() => {
    scrollTo(selected, "instant");
  }, [selected, scrollTo]);

  const handleItemClick = useCallback(
    (e) => {
      const val = Number(e.currentTarget.dataset.value);
      if (disabledValues.includes(val)) return;
      onChange(val);
    },
    [onChange, disabledValues]
  );

  return (
    <StyledScrollColumnWrapper>
      {label ? (
        <StyledRangeDayTypography variant="caption">
          {label}
        </StyledRangeDayTypography>
      ) : (
        <StyledScrollColumnLabelSpacer />
      )}
      <StyledScrollColumnListContainer>
        <StyledScrollListCustom ref={listRef}>
          {values.map((v) => {
            const isDisabled = disabledValues.includes(v);
            return (
              <StyledScrollItemCustom
                key={v}
                data-value={v}
                isSelected={v === selected}
                isDisabled={isDisabled}
                onClick={handleItemClick}
              >
                {String(v).padStart(2, "0")}
              </StyledScrollItemCustom>
            );
          })}
        </StyledScrollListCustom>
      </StyledScrollColumnListContainer>
    </StyledScrollColumnWrapper>
  );
}

/* =========================
  Month / year selector
========================= */
function MonthYearSelector({ month, onChange, minDate, maxDate }) {
  const currentYear = dayjs().year();
  const minYear = minDate ? minDate.year() : currentYear - YEAR_RANGE;
  const maxYear = maxDate ? maxDate.year() : currentYear + YEAR_RANGE;

  const years = useMemo(() => {
    const list = [];
    const startY = Math.min(minYear, currentYear - YEAR_RANGE);
    const endY = Math.max(maxYear, currentYear + YEAR_RANGE);
    for (let y = startY; y <= endY; y++) {
      if (minDate && y < minDate.year()) continue;
      if (maxDate && y > maxDate.year()) continue;
      list.push(y);
    }
    return list;
  }, [minYear, maxYear, currentYear, minDate, maxDate]);

  const handleMonthChange = useCallback(
    (e) => {
      let targetM = month.month(Number(e.target.value));
      if (minDate && targetM.isBefore(minDate.startOf("month"))) {
        targetM = minDate.startOf("month");
      }
      if (maxDate && targetM.isAfter(maxDate.startOf("month"))) {
        targetM = maxDate.startOf("month");
      }
      onChange(targetM);
    },
    [month, onChange, minDate, maxDate]
  );

  const handleYearChange = useCallback(
    (e) => {
      let targetY = month.year(Number(e.target.value));
      if (minDate && targetY.isBefore(minDate.startOf("month"))) {
        targetY = minDate.startOf("month");
      }
      if (maxDate && targetY.isAfter(maxDate.startOf("month"))) {
        targetY = maxDate.startOf("month");
      }
      onChange(targetY);
    },
    [month, onChange, minDate, maxDate]
  );

  return (
    <StyledMonthYearSelectorRowGrid>
      <StyledMonthYearSelect
        value={month.month()}
        onChange={handleMonthChange}
        size="small"
        variant="standard"
        disableUnderline
        MenuProps={{ PaperProps: { sx: { maxHeight: 260 } } }}
        styleMinWidth={92}
      >
        {VI_MONTHS.map((name, idx) => {
          let isDisabled = false;
          if (minDate && month.year() === minDate.year() && idx < minDate.month()) {
            isDisabled = true;
          }
          if (maxDate && month.year() === maxDate.year() && idx > maxDate.month()) {
            isDisabled = true;
          }
          if (isDisabled) return null;
          return (
            <StyledSelectMenuItem key={name} value={idx}>
              {name}
            </StyledSelectMenuItem>
          );
        })}
      </StyledMonthYearSelect>

      <StyledMonthYearSelect
        value={month.year()}
        onChange={handleYearChange}
        size="small"
        variant="standard"
        disableUnderline
        MenuProps={{ PaperProps: { sx: { maxHeight: 260 } } }}
        styleMinWidth={64}
      >
        {years.map((y) => (
          <StyledSelectMenuItem key={y} value={y}>
            {y}
          </StyledSelectMenuItem>
        ))}
      </StyledMonthYearSelect>
    </StyledMonthYearSelectorRowGrid>
  );
}

/* =========================
  Main component
========================= */
function DateTimeRangePicker({
  value,
  onChange,
  onBlur,
  label,
  required = false,
  error = false,
  helperText,
  disabled = false,
  readOnly = false,
  showTime = false,
  minDate,
  maxDate,
  shouldDisableDate: shouldDisableDateProp,
  placeholder,
  ...restProps
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openTimePanel, setOpenTimePanel] = useState(null);

  const [tempStart, setTempStart] = useState(null);
  const [tempEnd, setTempEnd] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  const [leftMonth, setLeftMonth] = useState(dayjs().startOf("month"));
  const [rightMonth, setRightMonth] = useState(
    dayjs().add(1, "month").startOf("month")
  );

  const [selectionPhase, setSelectionPhase] = useState("start");

  const open = Boolean(anchorEl);
  const FORMAT = showTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY";

  const parsedMin = parseDate(minDate);
  const parsedMax = parseDate(maxDate);

  // Min date hiệu lực cho toàn bộ picker (tính cả tempStart nếu có, hoặc parsedMin)
  const effectiveMinDate = useMemo(() => {
    if (tempStart) {
      if (parsedMin && parsedMin.isAfter(tempStart, "day")) {
        return parsedMin;
      }
      return tempStart;
    }
    return parsedMin;
  }, [tempStart, parsedMin]);

  // Min date cho bảng lịch bên phải (phải luôn từ tháng tiếp theo của bảng lịch bên trái)
  const rightCalendarMinDate = useMemo(() => {
    const minM = effectiveMinDate ? effectiveMinDate.startOf("month") : null;
    const leftM = leftMonth ? leftMonth.startOf("month") : null;

    const baseMin = leftM ? leftM.add(1, "month") : (minM ? minM.add(1, "month") : null);

    if (minM && baseMin && baseMin.isBefore(minM, "month")) {
      return minM;
    }
    return baseMin;
  }, [leftMonth, effectiveMinDate]);

  // Combined function disable date cho DateCalendar
  const combinedShouldDisableDate = useCallback(
    (day) => {
      const d = day.startOf("day");

      if (parsedMin && d.isBefore(parsedMin.startOf("day"))) {
        return true;
      }

      if (parsedMax && d.isAfter(parsedMax.startOf("day"))) {
        return true;
      }

      if (tempStart && d.isBefore(tempStart.startOf("day"))) {
        return true;
      }

      if (shouldDisableDateProp && shouldDisableDateProp(d)) {
        return true;
      }

      return false;
    },
    [parsedMin, parsedMax, tempStart, shouldDisableDateProp]
  );

  // Tự động điều chỉnh tháng hiển thị nếu đang chọn tháng bé hơn minDate
  React.useEffect(() => {
    if (effectiveMinDate) {
      const minM = effectiveMinDate.startOf("month");
      if (leftMonth.isBefore(minM, "month")) {
        setLeftMonth(minM);
      }
    }
  }, [effectiveMinDate, leftMonth]);

  React.useEffect(() => {
    if (rightCalendarMinDate) {
      const minM = rightCalendarMinDate.startOf("month");
      if (rightMonth.isBefore(minM, "month")) {
        setRightMonth(minM);
      }
    }
  }, [rightCalendarMinDate, rightMonth]);

  const formatVal = (val) => {
    const d = parseDate(val);
    return d ? d.format(FORMAT) : "";
  };

  const displayText = () => {
    const s = formatVal(value?.startDate);
    const e = formatVal(value?.endDate);
    if (!s && !e) return "";
    return `${s || "..."} - ${e || "..."}`;
  };

  const handleOpen = useCallback(
    (event) => {
      if (disabled || readOnly) return;

      const now = dayjs();
      const s = parseDate(value?.startDate);
      let e = parseDate(value?.endDate);

      const initStart = s || null;
      if (initStart && e && e.isBefore(initStart, "day")) {
        e = null;
      }
      const initEnd = e || null;

      setTempStart(initStart);
      setTempEnd(initEnd);
      setSelectionPhase(initStart && !initEnd ? "end" : "start");

      const effectiveMinForOpen = initStart && parsedMin ? (initStart.isAfter(parsedMin) ? initStart : parsedMin) : (initStart || parsedMin);
      const fallbackMonth = (() => {
        if (parsedMax && now.isAfter(parsedMax, "minute")) return parsedMax.startOf("month");
        if (effectiveMinForOpen && now.isBefore(effectiveMinForOpen, "minute")) return effectiveMinForOpen.startOf("month");
        return now.startOf("month");
      })();
      const initLeft = initStart ? initStart.startOf("month") : fallbackMonth;
      const initRight = initEnd ? initEnd.startOf("month") : initLeft.add(1, "month");

      setLeftMonth(initLeft);
      setRightMonth(
        initRight.isAfter(initLeft, "month")
          ? initRight
          : initLeft.add(1, "month")
      );

      setHoveredDay(null);
      setOpenTimePanel(null);
      setAnchorEl(event.currentTarget);
    },
    [disabled, readOnly, value, parsedMin, parsedMax]
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setHoveredDay(null);
    setOpenTimePanel(null);
  }, []);

  const handleDayClick = useCallback(
    (day) => {
      const now = dayjs();
      const isToday = day.isSame(now, 'day');
      const bufferedTime = getRoundedTime(now, 20);
      const bufferedIsNextDay = bufferedTime.isAfter(now, 'day');

      let baseDefaultTime;
      let effectiveDay;

      if (isToday) {
        if (bufferedIsNextDay) {
          baseDefaultTime = bufferedTime;
          effectiveDay = bufferedTime.startOf('minute');
        } else {
          baseDefaultTime = bufferedTime;
          effectiveDay = bufferedTime;
        }
      } else {
        baseDefaultTime = day.startOf('day');
        effectiveDay = day;
      }

      const activeMin = selectionPhase === "end" && tempStart ? tempStart : parsedMin;

      if (activeMin && effectiveDay.isSame(activeMin, 'day') && baseDefaultTime.isBefore(activeMin, 'minute')) {
        baseDefaultTime = activeMin;
        effectiveDay = activeMin;
      }
      if (parsedMax && effectiveDay.isSame(parsedMax, 'day') && baseDefaultTime.isAfter(parsedMax, 'minute')) {
        baseDefaultTime = parsedMax;
        effectiveDay = parsedMax;
      }

      let startH = tempStart?.hour() ?? baseDefaultTime.hour();
      let startM = tempStart?.minute() ?? baseDefaultTime.minute(); 
      let endH = tempEnd?.hour() ?? 23;
      let endM = tempEnd?.minute() ?? 59;

      if (isToday && showTime && !bufferedIsNextDay) {
        if (startH < now.hour() || (startH === now.hour() && startM < now.minute())) {
          startH = bufferedTime.hour();
          startM = bufferedTime.minute();
        }
        if (endH < now.hour() || (endH === now.hour() && endM < now.minute())) {
          endH = bufferedTime.hour();
          endM = bufferedTime.minute();
        }
      }

      const defaultStartH = showTime ? startH : 0;
      const defaultStartM = showTime ? startM : 0;
      const defaultEndH = showTime ? endH : 23;
      const defaultEndM = showTime ? endM : 59;

      if (selectionPhase === "start" || !tempStart) {
        const newStart = clampDateToRange(
          effectiveDay.hour(defaultStartH).minute(defaultStartM).second(0),
          parsedMin,
          parsedMax
        );
        setTempStart(newStart);
        if (tempEnd && tempEnd.isBefore(newStart, "day")) {
          setTempEnd(null);
        }
        setSelectionPhase("end");
      } else {
        // selectionPhase === "end"
        if (effectiveDay.isBefore(tempStart, "day")) {
          // Ngày chọn nhỏ hơn tempStart → Đặt lại làm tempStart mới
          const newStart = clampDateToRange(
            effectiveDay.hour(defaultStartH).minute(defaultStartM).second(0),
            parsedMin,
            parsedMax
          );
          setTempStart(newStart);
          setTempEnd(null);
          setSelectionPhase("end");
        } else {
          const newEnd = clampDateToRange(
            effectiveDay.isSame(tempStart, 'day') && showTime
              ? tempStart.add(1, 'hour').second(0)
              : effectiveDay.hour(defaultEndH).minute(defaultEndM).second(0),
            activeMin,
            parsedMax
          );
          setTempEnd(newEnd);
          setSelectionPhase("start");
        }
      }

      setHoveredDay(null);
    },
    [selectionPhase, tempStart, tempEnd, showTime, parsedMin, parsedMax]
  );

  // Navigation guard
  const isLeftPrevDisabled = useMemo(() => {
    const minM = effectiveMinDate ? effectiveMinDate.startOf("month") : null;
    if (!minM) return false;
    return leftMonth.isSame(minM, "month") || leftMonth.isBefore(minM, "month");
  }, [leftMonth, effectiveMinDate]);

  const isLeftNextDisabled = useMemo(() => {
    return !leftMonth.add(1, "month").isBefore(rightMonth, "month");
  }, [leftMonth, rightMonth]);

  const isRightPrevDisabled = useMemo(() => {
    const minM = rightCalendarMinDate ? rightCalendarMinDate.startOf("month") : null;
    const isAtMin = minM ? rightMonth.isSame(minM, "month") || rightMonth.isBefore(minM, "month") : false;
    return isAtMin || !rightMonth.isAfter(leftMonth, "month");
  }, [rightMonth, leftMonth, rightCalendarMinDate]);

  const isRightNextDisabled = useMemo(() => {
    if (!parsedMax) return false;
    return rightMonth.isSame(parsedMax, "month") || rightMonth.isAfter(parsedMax, "month");
  }, [rightMonth, parsedMax]);

  const handleLeftPrev = useCallback(() => {
    setLeftMonth((m) => {
      const prev = m.subtract(1, "month");
      const minM = effectiveMinDate ? effectiveMinDate.startOf("month") : null;
      if (minM && prev.isBefore(minM, "month")) return m;
      return prev;
    });
  }, [effectiveMinDate]);

  const handleLeftNext = useCallback(() => {
    setLeftMonth((prev) => {
      const next = prev.add(1, "month");
      if (!next.isBefore(rightMonth, "month")) return prev;
      return next;
    });
  }, [rightMonth]);

  const handleRightPrev = useCallback(() => {
    setRightMonth((prev) => {
      const next = prev.subtract(1, "month");
      const minM = rightCalendarMinDate ? rightCalendarMinDate.startOf("month") : null;
      if (minM && next.isBefore(minM, "month")) return prev;
      if (!next.isAfter(leftMonth, "month")) return prev;
      return next;
    });
  }, [leftMonth, rightCalendarMinDate]);

  const handleRightNext = useCallback(() => {
    setRightMonth((m) => {
      const next = m.add(1, "month");
      if (parsedMax && next.isAfter(parsedMax, "month")) return m;
      return next;
    });
  }, [parsedMax]);

  const handleLeftMonthChange = useCallback((newM) => {
    let m = newM.startOf("month");
    const minM = effectiveMinDate ? effectiveMinDate.startOf("month") : null;
    if (minM && m.isBefore(minM, "month")) {
      m = minM;
    }
    setLeftMonth(m);
    setRightMonth((prev) =>
      prev.isAfter(m, "month") ? prev : m.add(1, "month")
    );
  }, [effectiveMinDate]);

  const handleRightMonthChange = useCallback(
    (newM) => {
      let m = newM.startOf("month");
      const minM = rightCalendarMinDate ? rightCalendarMinDate.startOf("month") : null;
      if (minM && m.isBefore(minM, "month")) {
        m = minM;
      }
      if (!m.isAfter(leftMonth, "month")) {
        m = leftMonth.add(1, "month");
      }
      setRightMonth(m);
    },
    [leftMonth, rightCalendarMinDate]
  );

  const handleDayHover = useCallback((day) => {
    setHoveredDay(day);
  }, []);

  const handleCalendarMouseLeave = useCallback(() => {
    setHoveredDay(null);
  }, []);

  const handleDayOfWeekFormatter = useCallback((day) => {
    const weekdays = ["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"];
    return weekdays[dayjs(day).day()];
  }, []);

  const currentTimeValue =
    openTimePanel === "start"
      ? tempStart
      : openTimePanel === "end"
        ? tempEnd
        : null;

  const currentHour = currentTimeValue?.hour() ?? 0;
  const currentMinute = currentTimeValue?.minute() ?? 0;

  const getDisabledHours = useCallback(() => {
    const now = dayjs();
    const currentDate = openTimePanel === 'start' ? tempStart : tempEnd;
    if (!currentDate) return [];

    const disabled = new Set();

    if (currentDate.isSame(now, 'day')) {
      HOURS.forEach(h => { if (h < now.hour()) disabled.add(h); });
    }

    const activeMin = openTimePanel === 'end' && tempStart ? tempStart : parsedMin;

    if (activeMin && currentDate.isSame(activeMin, 'day')) {
      HOURS.forEach(h => { if (h < activeMin.hour()) disabled.add(h); });
    }

    if (parsedMax && currentDate.isSame(parsedMax, 'day')) {
      HOURS.forEach(h => { if (h > parsedMax.hour()) disabled.add(h); });
    }

    return HOURS.filter(h => disabled.has(h));
  }, [openTimePanel, tempStart, tempEnd, parsedMax, parsedMin]);

  const getDisabledMinutes = useCallback(() => {
    const now = dayjs();
    const currentDate = openTimePanel === 'start' ? tempStart : tempEnd;
    if (!currentDate) return [];

    const disabled = new Set();

    if (currentDate.isSame(now, 'day')) {
      if (currentHour > now.hour()) {
        // ok
      } else if (currentHour === now.hour()) {
        MINUTES.forEach(m => { if (m < now.minute()) disabled.add(m); });
      }
    }

    const activeMin = openTimePanel === 'end' && tempStart ? tempStart : parsedMin;

    if (activeMin && currentDate.isSame(activeMin, 'day')) {
      if (currentHour < activeMin.hour()) {
        MINUTES.forEach(m => disabled.add(m));
      } else if (currentHour === activeMin.hour()) {
        MINUTES.forEach(m => { if (m < activeMin.minute()) disabled.add(m); });
      }
    }

    if (parsedMax && currentDate.isSame(parsedMax, 'day')) {
      if (currentHour > parsedMax.hour()) {
        MINUTES.forEach(m => disabled.add(m));
      } else if (currentHour === parsedMax.hour()) {
        MINUTES.forEach(m => { if (m > parsedMax.minute()) disabled.add(m); });
      }
    }

    return MINUTES.filter(m => disabled.has(m));
  }, [openTimePanel, tempStart, tempEnd, currentHour, parsedMax, parsedMin]);
  
  const handleHourChange = useCallback(
    (h) => {
      if (openTimePanel === "start") {
        setTempStart((prev) => {
          const updated = (prev || dayjs().startOf("day")).hour(h).second(0);
          return clampDateToRange(updated, parsedMin, parsedMax)?.second(0) || updated;
        });
      }
      if (openTimePanel === "end") {
        setTempEnd((prev) => {
          const activeMin = tempStart || parsedMin;
          const updated = (prev || tempStart || dayjs().startOf("day")).hour(h).second(0);
          return clampDateToRange(updated, activeMin, parsedMax)?.second(0) || updated;
        });
      }
    },
    [openTimePanel, tempStart, parsedMin, parsedMax]
  );

  const handleMinuteChange = useCallback(
    (m) => {
      if (openTimePanel === "start") {
        setTempStart((prev) => {
          const updated = (prev || dayjs().startOf("day")).minute(m).second(0);
          return clampDateToRange(updated, parsedMin, parsedMax)?.second(0) || updated;
        });
      }
      if (openTimePanel === "end") {
        setTempEnd((prev) => {
          const activeMin = tempStart || parsedMin;
          const updated = (prev || tempStart || dayjs().startOf("day")).minute(m).second(0);
          return clampDateToRange(updated, activeMin, parsedMax)?.second(0) || updated;
        });
      }
    },
    [openTimePanel, tempStart, parsedMin, parsedMax]
  );

  const handleClear = useCallback(
    (event) => {
      event?.stopPropagation();
      setTempStart(null);
      setTempEnd(null);
      setSelectionPhase("start");
      setHoveredDay(null);
      setOpenTimePanel(null);
      onChange?.({ startDate: null, endDate: null });
    },
    [onChange]
  );

  const handleReset = useCallback(() => {
    setTempStart(null);
    setTempEnd(null);
    setSelectionPhase("start");
    setHoveredDay(null);
    setOpenTimePanel(null);
  }, []);

  const handleAccept = useCallback(() => {
    onChange?.({ startDate: tempStart, endDate: tempEnd });
    setAnchorEl(null);
    setHoveredDay(null);
    setOpenTimePanel(null);
  }, [onChange, tempStart, tempEnd]);

  const triggerSx = (theme) => ({
    ...textFieldSx(theme),
    "& .MuiInputBase-root": { cursor: disabled ? "default" : "pointer" },
    "& .MuiOutlinedInput-input": { cursor: disabled ? "default" : "pointer" },
  });

  const daySlotProps = {
    rangeStart: tempStart,
    rangeEnd: tempEnd,
    hoveredDay,
    onDayHover: handleDayHover,
  };

  const handleOpenStartTimePanel = useCallback(() => {
    setOpenTimePanel("start");
  }, []);

  const handleOpenEndTimePanel = useCallback(() => {
    setOpenTimePanel("end");
  }, []);

  const handleSelectStartPhase = useCallback(() => {
    setSelectionPhase("start");
  }, []);

  const handleSelectEndPhase = useCallback(() => {
    if (tempStart) setSelectionPhase("end");
  }, [tempStart]);

  const hasValue = Boolean(value?.startDate || value?.endDate || tempStart || tempEnd);

  return (
    <StyledPickerRoot>
      <StyledTriggerInput
        label={label}
        value={displayText()}
        size="small"
        fullWidth
        required={required}
        error={error}
        helperText={helperText}
        disabled={disabled}
        onClick={handleOpen}
        onBlur={onBlur}
        placeholder={
          placeholder ||
          (showTime
            ? "DD/MM/YYYY HH:mm - DD/MM/YYYY HH:mm"
            : "DD/MM/YYYY - DD/MM/YYYY")
        }
        inputProps={{ readOnly: true }}
        InputProps={{
          endAdornment: (
            <StyledInputAdornmentDateRange>
              {hasValue && !disabled && !readOnly && (
                <IconButton
                  size="small"
                  onClick={handleClear}
                  tabIndex={-1}
                >
                  <ClearIcon />
                </IconButton>
              )}
              <IconButton
                size="small"
                disabled={disabled}
                onClick={handleOpen}
                tabIndex={-1}
              >
                <StyledDateRangeIcon />
              </IconButton>
            </StyledInputAdornmentDateRange>
          ),
        }}
        InputLabelProps={{ ...inputLabelPropsStyle, required }}
        triggerSx={triggerSx}
        {...restProps}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperComponent={StyledCalendarPopoverPaper}
        PaperProps={{ onMouseLeave: handleCalendarMouseLeave }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
          <StyledPopoverContent>
            <StyledCalendarTimePanelRowGrid
              showTimePanel={showTime && openTimePanel}
            >
              <StyledCalendarSection>
                <StyledCalendarRow>
                  {/* Left calendar */}
                  <div>
                    <StyledMonthNavStackGrid>
                      <IconButton size="small" onClick={handleLeftPrev} disabled={isLeftPrevDisabled}>
                        <ChevronLeftIcon />
                      </IconButton>
                      <StyledMonthSelectorRowFlex>
                        <MonthYearSelector
                          month={leftMonth}
                          onChange={handleLeftMonthChange}
                          minDate={effectiveMinDate}
                          maxDate={parsedMax}
                        />
                      </StyledMonthSelectorRowFlex>
                      <IconButton size="small" onClick={handleLeftNext} disabled={isLeftNextDisabled}>
                        <ChevronRightIcon />
                      </IconButton>
                    </StyledMonthNavStackGrid>
                    <StyledDateCalendar
                      key={`left-${leftMonth.format("YYYY-MM")}`}
                      referenceDate={leftMonth}
                      value={null}
                      onChange={handleDayClick}
                      minDate={effectiveMinDate || parsedMin}
                      maxDate={parsedMax}
                      shouldDisableDate={combinedShouldDisableDate}
                      slots={{ day: RangeDay }}
                      slotProps={{ day: daySlotProps }}
                      dayOfWeekFormatter={handleDayOfWeekFormatter}
                      calendarSx={calendarSx}
                    />
                  </div>

                  {/* Right calendar */}
                  <div>
                    <StyledMonthNavStackGrid>
                      <IconButton size="small" onClick={handleRightPrev} disabled={isRightPrevDisabled}>
                        <ChevronLeftIcon />
                      </IconButton>
                      <StyledMonthSelectorRowFlex>
                        <MonthYearSelector
                          month={rightMonth}
                          onChange={handleRightMonthChange}
                          minDate={rightCalendarMinDate}
                          maxDate={parsedMax}
                        />
                      </StyledMonthSelectorRowFlex>
                      <IconButton size="small" onClick={handleRightNext} disabled={isRightNextDisabled}>
                        <ChevronRightIcon />
                      </IconButton>
                    </StyledMonthNavStackGrid>
                    <StyledDateCalendar
                      key={`right-${rightMonth.format("YYYY-MM")}`}
                      referenceDate={rightMonth}
                      value={null}
                      onChange={handleDayClick}
                      minDate={rightCalendarMinDate || parsedMin}
                      maxDate={parsedMax}
                      shouldDisableDate={combinedShouldDisableDate}
                      slots={{ day: RangeDay }}
                      slotProps={{ day: daySlotProps }}
                      dayOfWeekFormatter={handleDayOfWeekFormatter}
                      calendarSx={calendarSx}
                    />
                  </div>
                </StyledCalendarRow>
              </StyledCalendarSection>

              {showTime && openTimePanel && (
                <StyledTimePanelWrapper>
                  <StyledTimePanelInner>
                    <StyledTimePanelTitle>Chọn giờ</StyledTimePanelTitle>
                    <StyledTimePickerPaperCustom elevation={0}>
                      <ScrollColumn
                        values={HOURS}
                        selected={currentHour}
                        onChange={handleHourChange}
                        label=""
                        disabledValues={getDisabledHours()}
                      />
                      <StyledTimePickerColon>:</StyledTimePickerColon>
                      <ScrollColumn
                        values={MINUTES}
                        selected={currentMinute}
                        onChange={handleMinuteChange}
                        label=""
                        disabledValues={getDisabledMinutes()}
                      />
                    </StyledTimePickerPaperCustom>
                  </StyledTimePanelInner>
                </StyledTimePanelWrapper>
              )}
            </StyledCalendarTimePanelRowGrid>

            <StyledDivider />

            <StyledDateTimeRangeGrid>
              <div>
                <StyledDateTimeRangeLabel>
                  Ngày bắt đầu
                </StyledDateTimeRangeLabel>
                <StyledDateTimeRangeRow>
                  <StyledDateDisplayBoxDate
                    open={selectionPhase === "start"}
                    onClick={handleSelectStartPhase}
                  >
                    {tempStart?.format("DD/MM/YYYY") ?? "--/--/----"}
                  </StyledDateDisplayBoxDate>
                  {showTime && (
                    <StyledDateDisplayBoxTime
                      open={openTimePanel === "start"}
                      onClick={handleOpenStartTimePanel}
                    >
                      {tempStart ? tempStart.format("HH : mm") : "-- : --"}
                    </StyledDateDisplayBoxTime>
                  )}
                </StyledDateTimeRangeRow>
              </div>
              <div>
                <StyledDateTimeRangeLabel>
                  Hạn kết thúc
                </StyledDateTimeRangeLabel>
                <StyledDateTimeRangeRow>
                  <StyledDateDisplayBoxDate
                    open={selectionPhase === "end"}
                    onClick={handleSelectEndPhase}
                  >
                    {tempEnd?.format("DD/MM/YYYY") ?? "--/--/----"}
                  </StyledDateDisplayBoxDate>
                  {showTime && (
                    <StyledDateDisplayBoxTime
                      open={openTimePanel === "end"}
                      onClick={handleOpenEndTimePanel}
                    >
                      {tempEnd ? tempEnd.format("HH : mm") : "-- : --"}
                    </StyledDateDisplayBoxTime>
                  )}
                </StyledDateTimeRangeRow>
              </div>
            </StyledDateTimeRangeGrid>

            <StyledDivider />

            <StyledActionRow>
              <StyledButtonRow>
                <StyledButtonCancelTime
                  size="small"
                  onClick={handleClose}
                  variant="outlined"
                >
                  Hủy
                </StyledButtonCancelTime>

                <StyledButtonDeleteTime
                  size="small"
                  onClick={handleReset}
                  variant="outlined"
                >
                  Chọn lại
                </StyledButtonDeleteTime>

                <StyledButtonConfirmTime
                  size="small"
                  onClick={handleAccept}
                  variant="contained"
                  disabled={!tempStart}
                >
                  Chọn
                </StyledButtonConfirmTime>
              </StyledButtonRow>
            </StyledActionRow>
          </StyledPopoverContent>
        </LocalizationProvider>
      </Popover>
    </StyledPickerRoot>
  );
}

DateTimeRangePicker.propTypes = {
  value: PropTypes.shape({
    startDate: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
    endDate: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
  }),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  label: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  showTime: PropTypes.bool,
  minDate: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  maxDate: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  shouldDisableDate: PropTypes.func,
  placeholder: PropTypes.string,
};

export default memo(DateTimeRangePicker);
