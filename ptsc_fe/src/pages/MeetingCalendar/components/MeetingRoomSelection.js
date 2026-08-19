import React, { useState, useCallback, useEffect, useMemo } from "react";
import GroupIcon from "@mui/icons-material/Group";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CheckIcon from "@mui/icons-material/Check";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
// import Box from "@mui/material/Box";
import dayjs from "dayjs";
import axiosInstance from "@utils/axiosInstance";
import { API_GET_ROOM_MEETING, API_MEETING_ROOM, API_VIEW_FILE, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import CustomInput from "@components/CustomInput/CustomInputBase";
import Search from "@mui/icons-material/Search";
import TuneIcon from "@builder-table/components/TuneIcon";
import {
  SearchToolbarBox,
  UnifiedSearchContainer,
  PillFilterTrigger,
  SearchInputWrapper,
  StyledPillInput,
  PillClearButton,
  PillTuneButton,
  BlueSearchButton,
  SelectedSection,
  SelectedLabel,
  RoomChip,
  RoomCard,
  RoomImageWrapper,
  StatusBadge,
  SelectionIcon,
  RoomInfo,
  RoomName,
  NoImageTypography,
  InfoItem,
  LoadingWrapper,
  FilterPopoverContent,
  SearchFilterGrid,
  PopoverFilterIcon,
  PopoverHeaderTitle,
  PopoverFooterActions,
  PopoverFooterRightGroup,
  PopoverOutlinedButton,
  PopoverContainedButton,
  TimelineHeaderWrapper,
  TimelineTitle,
  DateNavigator,
  TimelineLegend,
  LegendItem,
  LegendDot,
  TimelineLoadingWrapper,
  StyledChevronLeftIcon,
  StyledChevronRightIcon,
  StyledDateBox,
  IntervalSelectWrapper,
  TimelineSlotsScrollWrapper,
  TimelineInnerWidthContainer,
  ContinuousTrackBar,
  TrackBlock,
  SlotOverlayGrid,
  SlotOverlayCell,
  TimelineScaleRow,
  ScaleLabelItem,
  SelectionSummaryText,
  TimelineContainerV2,
  TimelineContainerHeader,
} from "@pages/MeetingCalendar/componentStyle/MeetingRoomSelection.style";
import {
  FilterBox,
  StyleBoxActionDropDown,
  StyleActionCheckBox,
  StyleActionCellCheckBox,
  StyleActionButton,
  StyleActionButtonCancel,
  StyleActionButtonApply,
} from "@styles/CustomTable.styles";
import { ClickAwayListener, Popover, Checkbox, FormControlLabel, FormControl, Tooltip, MenuItem } from "@mui/material";
import { useToast } from "@components/common/ToastProvider";


import AuthImage from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage";
import DOMPurify from "dompurify";

const RoomItem = React.memo(({ room, isSelected, onToggle }) => {
  const handleToggle = useCallback(() => onToggle(room.id), [room.id, onToggle]);
  return (
    <Grid item xs={12} sm={6} md={4}>
      <RoomCard
        selected={isSelected}
        onClick={handleToggle}
      >
        <RoomImageWrapper>
          {room.image ? (
            <AuthImage src={room.image} alt={room.name} />
          ) : (
            <NoImageTypography variant="caption">
              Không có hình ảnh
            </NoImageTypography>
          )}
          <StatusBadge dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(room.stage) }} />
          <SelectionIcon selected={isSelected}>
            {isSelected && <CheckIcon />}
          </SelectionIcon>
        </RoomImageWrapper>
        <RoomInfo>
          <RoomName selected={isSelected}>{room.name}</RoomName>
          <InfoItem>
            <GroupIcon />
            Sức chứa: {room.capacity} người
          </InfoItem>
          <InfoItem>
            <LocationOnIcon />
            {room.location}
          </InfoItem>
        </RoomInfo>
      </RoomCard>
    </Grid>
  );
});

RoomItem.displayName = "RoomItem";

const SelectedRoomChipItem = React.memo(({ room, onDelete }) => {
  const handleDelete = useCallback(() => onDelete(room.id), [room.id, onDelete]);
  return (
    <RoomChip
      label={room.name}
      onDelete={handleDelete}
    />
  );
});

SelectedRoomChipItem.displayName = "SelectedRoomChipItem";

const SlotOverlayCellItem = React.memo(({ slot, isSelected, onClick }) => {
  const handleClick = useCallback(() => onClick(slot), [slot, onClick]);
  return (
    <SlotOverlayCell
      isBusy={slot.isBusy}
      isSelected={isSelected}
      onClick={handleClick}
    />
  );
});

SlotOverlayCellItem.displayName = "SlotOverlayCellItem";

const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
};

const formatMinutes = (min) => {
  if (min >= 1440) return "23:55";
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatScaleLabel = (min, interval) => {
  if (min >= 1440) return "23h55";
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  if (interval === 60) {
    return `${h}h`;
  }
  return `${h}h${String(m).padStart(2, '0')}`;
};

const getStatusColor = (statusHtml) => {
  if (!statusHtml) return "#1890ff";
  const s = String(statusHtml).toLowerCase();
  if (s.includes("chuẩn bị") || s.includes("chuan_bi")) return "#2e7d32"; // Green
  if (s.includes("dự kiến") || s.includes("du_kien")) return "#1890ff"; // Sky Blue
  if (s.includes("đang họp") || s.includes("dang_hop")) return "#0062AD"; // Deep Blue
  if (s.includes("kết thúc")) return "#ef4444";
  return "#2e7d32";
};

const MeetingRoomSelection = ({ open, onClose, onConfirm, initialSelected = [], sharedComponents, meetingDate, startTime, endTime }) => {
  const { Dialog, DatePicker } = sharedComponents;
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(initialSelected.map(r => r.id));
  const [searchText, setSearchText] = useState("");
  // Lưu map phòng ban đầu để fallback chip khi rooms API không có phòng đó
  const [initialSelectedMap, setInitialSelectedMap] = useState(
    () => Object.fromEntries(initialSelected.map(r => [r.id, r]))
  );
  const toast = useToast();

  // Timeline states
  const [scheduleDate, setScheduleDate] = useState(meetingDate ? dayjs(meetingDate) : dayjs());
  const [roomSchedules, setRoomSchedules] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Interval state: 15, 30 (default), 60
  const [interval, setInterval] = useState(30);
  // Selected time range state on timeline: { startMin: number | null, endMin: number | null }
  const [selectedTimeRange, setSelectedTimeRange] = useState({ startMin: null, endMin: null });

  const handleScheduleDateChange = useCallback((newDate) => {
    if (newDate) {
      setScheduleDate(newDate);
      setSelectedTimeRange({ startMin: null, endMin: null });
    }
  }, []);

  const handleIntervalChange = useCallback((e) => {
    setInterval(Number(e.target.value));
  }, []);

  // Filter dropdown state (inline FilterBox cho TuneIcon)
  const [openFilter, setOpenFilter] = useState(false);

  // Advanced filter popover state (cho PillFilterTrigger "Bộ lọc")
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const openFilterPopover = Boolean(filterAnchorEl);

  const [advancedFilters, setAdvancedFilters] = useState({
    stage: null,
    amenities: null
  });

  // Filter & Search states
  const [searchCriteria, setSearchCriteria] = useState({
    all: true,
    name: true,
    capacity: true,
    totalSeating: true
  });

  const handleAdvancedFilterClick = useCallback((event) => {
    setFilterAnchorEl(event.currentTarget);
  }, []);

  const handleFilterPopoverClose = useCallback(() => {
    setFilterAnchorEl(null);
  }, []);

  const handleToggleFilter = useCallback(() => {
    setOpenFilter(prev => !prev);
  }, []);

  const handleClickAway = useCallback(() => {
    setOpenFilter(false);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchText(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchText("");
  }, []);

  // Handle Search Criteria Checkbox Change
  const handleSearchCriteriaChange = (field) => (event) => {
    if (field === 'all') {
      const isChecked = event.target.checked;
      setSearchCriteria({
        all: isChecked,
        name: isChecked,
        capacity: isChecked,
        totalSeating: isChecked
      });
      return;
    }

    setSearchCriteria(prev => {
      const newState = {
        ...prev,
        [field]: event.target.checked
      };

      const allChecked = ['name', 'capacity', 'totalSeating'].every(k => newState[k]);
      newState.all = allChecked;

      return newState;
    });
  };

  const fetchRooms = useCallback(async (customParams = {}) => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 25,
        processFn: "dsPhongHop",
        ...customParams
      };

      if (searchText) {
        if (searchCriteria.location) {
          params['filter[location]'] = searchText;
        }
        if (searchCriteria.name) {
          params['filter[name]'] = searchText;
        }
        if (searchCriteria.status) {
          params['filter[stage]'] = searchText;
        }
        if (searchCriteria.capacity) {
          params['filter[capacity]'] = searchText;
        }
        if (searchCriteria.totalSeating) {
          params['filter[totalSeating]'] = searchText;
        }
      }

      if (advancedFilters.stage !== null && advancedFilters.stage !== undefined && advancedFilters.stage !== '') {
        params['filter[stage]'] = advancedFilters.stage;
      }
      if (advancedFilters.amenities) {
        let amenityId = advancedFilters.amenities;
        if (typeof advancedFilters.amenities === 'object' && advancedFilters.amenities !== null) {
          amenityId = advancedFilters.amenities.id || advancedFilters.amenities._id || advancedFilters.amenities.value;
        }
        params['filter[amenities]'] = amenityId;
      }

      const response = await axiosInstance.get(API_GET_ROOM_MEETING, {
        params: params
      });

      if (response && response.success) {
        const formattedRooms = (response.items || []).map(room => {
          const imgSource = room.image || room.imageUrl;
          let finalImage = null;

          if (imgSource) {
            if (String(imgSource).startsWith('http') || String(imgSource).startsWith('data:') || String(imgSource).startsWith('blob:')) {
              finalImage = imgSource;
            } else {
              const cleanPath = String(imgSource).startsWith('/') ? String(imgSource).substring(1) : imgSource;
              finalImage = `${API_VIEW_FILE}/${cleanPath}`;
            }
          }

          return {
            ...room,
            image: finalImage
          };
        });
        setRooms(formattedRooms);
      }
    } catch (error) {
      logger.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  }, [searchText, searchCriteria, advancedFilters]);

  const handleSearchSubmit = useCallback(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  }, [handleSearchSubmit]);

  const handleApplyFilter = useCallback(() => {
    setOpenFilter(false);
    fetchRooms();
  }, [fetchRooms]);

  const handleAdvancedFilterChange = (field) => (eventOrValue) => {
    let newValue = eventOrValue;
    if (eventOrValue && eventOrValue.target !== undefined) {
      newValue = eventOrValue.target.value;
    }

    setAdvancedFilters(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  const handleApplyAdvancedFilters = useCallback(() => {
    setFilterAnchorEl(null);
    fetchRooms();
  }, [fetchRooms]);

  const handleResetAdvancedFilters = useCallback(() => {
    setAdvancedFilters({ stage: null, amenities: null });
  }, []);

  useEffect(() => {
    if (open) {
      fetchRooms();
      setSelectedIds(initialSelected.map(r => r.id));
      setInitialSelectedMap(Object.fromEntries(initialSelected.map(r => [r.id, r])));
      setScheduleDate(meetingDate ? dayjs(meetingDate) : dayjs());
      if (startTime && endTime) {
        const sMin = dayjs(startTime).hour() * 60 + dayjs(startTime).minute();
        let eMin = dayjs(endTime).hour() * 60 + dayjs(endTime).minute();
        if (eMin === 1435 || (dayjs(endTime).hour() === 23 && dayjs(endTime).minute() === 55)) {
          eMin = 1440;
        }
        setSelectedTimeRange({ startMin: sMin, endMin: eMin });
      } else {
        setSelectedTimeRange({ startMin: null, endMin: null });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSelected]);

  const handleToggleRoom = useCallback((roomId) => {
    setSelectedIds(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
    setSelectedTimeRange({ startMin: null, endMin: null });
  }, []);

  // Fetch room schedules for ALL selected rooms (Rule 3)
  const fetchRoomSchedules = useCallback(async () => {
    if (!selectedIds || selectedIds.length === 0) {
      setRoomSchedules([]);
      return;
    }
    try {
      setLoadingSchedule(true);
      const dateStr = scheduleDate.format("YYYY-MM-DD");

      const promises = selectedIds.map(id =>
        axiosInstance.get(`${API_MEETING_ROOM}/${id}/schedules?date=${dateStr}`).catch(() => [])
      );
      const results = await Promise.all(promises);
      const combinedSchedules = results.flat().filter(Boolean);
      setRoomSchedules(combinedSchedules);
    } catch (error) {
      setRoomSchedules([]);
    } finally {
      setLoadingSchedule(false);
    }
  }, [selectedIds, scheduleDate]);

  useEffect(() => {
    if (open && selectedIds.length > 0) {
      fetchRoomSchedules();
    } else {
      setRoomSchedules([]);
    }
  }, [open, selectedIds, scheduleDate, fetchRoomSchedules]);

  const isToday = scheduleDate.isSame(dayjs(), 'day');

  // Compute start minute for the timeline (Rule 2: Current day no past times)
  const startOfDayMin = useMemo(() => {
    if (isToday) {
      const now = dayjs();
      const currentMin = now.hour() * 60 + now.minute();
      return Math.floor(currentMin / interval) * interval;
    }
    return 0;
  }, [isToday, interval]);

  const totalRangeMinutes = useMemo(() => 1440 - startOfDayMin, [startOfDayMin]);

  // Generate slots grid based on interval (15, 30, 60 minutes)
  const slots = useMemo(() => {
    const result = [];
    const step = Number(interval);

    // Convert roomSchedules into busy time ranges
    const busyRanges = roomSchedules.map(item => {
      let sStr = item.startTime;
      let eStr = item.endTime;
      if (!sStr && item.meetingTime) {
        const parts = item.meetingTime.split('-');
        sStr = parts[0];
        eStr = parts[1];
      }
      return {
        start: toMinutes(sStr),
        end: toMinutes(eStr),
        title: item.title,
        status: item.status || item.meetingState
      };
    }).filter(r => r.end > r.start);

    for (let current = startOfDayMin; current < 1440; current += step) {
      const slotStart = current;
      const slotEnd = current + step;

      const isBusy = busyRanges.some(m => m.start < slotEnd && m.end > slotStart);

      result.push({
        startMin: slotStart,
        endMin: slotEnd,
        startTimeStr: formatMinutes(slotStart),
        endTimeStr: formatMinutes(slotEnd),
        scaleLabel: formatScaleLabel(slotStart, interval),
        isBusy,
      });
    }
    return result;
  }, [startOfDayMin, interval, roomSchedules]);

  // Meeting blocks to display continuously inside track
  const meetingBlocks = useMemo(() => {
    if (!roomSchedules || roomSchedules.length === 0) return [];
    return roomSchedules.map(item => {
      let sStr = item.startTime;
      let eStr = item.endTime;
      if (!sStr && item.meetingTime) {
        const parts = item.meetingTime.split('-');
        sStr = parts[0];
        eStr = parts[1];
      }
      const startMin = toMinutes(sStr);
      const endMin = toMinutes(eStr);

      if (endMin <= startOfDayMin || startMin >= 1440 || endMin <= startMin) return null;

      const clampedStart = Math.max(startOfDayMin, startMin);
      const clampedEnd = Math.min(1440, endMin);

      const left = ((clampedStart - startOfDayMin) / totalRangeMinutes) * 100;
      const width = ((clampedEnd - clampedStart) / totalRangeMinutes) * 100;

      return {
        id: item.id || `${startMin}-${endMin}`,
        left,
        width,
        color: getStatusColor(item.status || item.meetingState),
        label: `${formatMinutes(startMin)}-${formatMinutes(endMin)}`
      };
    }).filter(Boolean);
  }, [roomSchedules, startOfDayMin, totalRangeMinutes]);

  // Selected range block overlay
  const selectionBlock = useMemo(() => {
    if (selectedTimeRange.startMin === null || selectedTimeRange.endMin === null) return null;
    const clampedStart = Math.max(startOfDayMin, selectedTimeRange.startMin);
    const clampedEnd = Math.min(1440, selectedTimeRange.endMin);

    if (clampedEnd <= clampedStart) return null;

    const left = ((clampedStart - startOfDayMin) / totalRangeMinutes) * 100;
    const width = ((clampedEnd - clampedStart) / totalRangeMinutes) * 100;

    return {
      left,
      width,
      color: 'rgba(35, 100, 176, 0.3)',
      label: `${formatScaleLabel(clampedStart, interval)} - ${formatScaleLabel(clampedEnd, interval)}`
    };
  }, [selectedTimeRange, startOfDayMin, totalRangeMinutes, interval]);

  // Slot click handler following deselect and range rules
  const handleSlotClick = useCallback((slot) => {
    if (slot.isBusy) return;

    setSelectedTimeRange(prev => {
      if (prev.startMin === null || prev.endMin === null) {
        return { startMin: slot.startMin, endMin: slot.endMin };
      }

      const isSelected = slot.startMin >= prev.startMin && slot.endMin <= prev.endMin;

      if (isSelected) {
        const isStartSlot = slot.startMin === prev.startMin;
        const isEndSlot = slot.endMin === prev.endMin;

        if (isStartSlot && isEndSlot) {
          return { startMin: null, endMin: null };
        } else if (isStartSlot) {
          const newStart = slot.endMin;
          if (newStart >= prev.endMin) {
            return { startMin: null, endMin: null };
          }
          return { startMin: newStart, endMin: prev.endMin };
        } else if (isEndSlot) {
          const newEnd = slot.startMin;
          if (prev.startMin >= newEnd) {
            return { startMin: null, endMin: null };
          }
          return { startMin: prev.startMin, endMin: newEnd };
        } else {
          return { startMin: null, endMin: null };
        }
      }

      const candidateStart = Math.min(prev.startMin, slot.startMin);
      const candidateEnd = Math.max(prev.endMin, slot.endMin);

      const hasBusyInBetween = slots.some(s =>
        s.startMin >= candidateStart && s.endMin <= candidateEnd && s.isBusy
      );

      if (hasBusyInBetween) {
        return { startMin: slot.startMin, endMin: slot.endMin };
      } else {
        return { startMin: candidateStart, endMin: candidateEnd };
      }
    });
  }, [slots]);

  const handleConfirm = useCallback(async () => {
    if (selectedIds.length === 0) {
      toast("Vui lòng chọn ít nhất một phòng họp", "warning");
      return;
    }

    try {
      const roomDetailsPromises = selectedIds.map(async (roomId) => {
        try {
          const detailResponse = await axiosInstance.get(`${API_MEETING_ROOM}/${roomId}`);
          if (detailResponse && detailResponse.id) {
            return detailResponse;
          }
          return rooms.find(r => r.id === roomId);
        } catch (error) {
          logger.error(`Error fetching room detail for ${roomId}:`, error);
          return rooms.find(r => r.id === roomId);
        }
      });
      const detailedRooms = await Promise.all(roomDetailsPromises);

      const formattedDetailedRooms = detailedRooms.map(room => {
        const imgSource = room.image || room.imageUrl;
        return {
          ...room,
          image: imgSource && !String(imgSource).startsWith('http')
            ? `${API_VIEW_FILE}/${imgSource}`
            : imgSource
        };
      });

      let timeData = null;
      if (selectedTimeRange.startMin !== null && selectedTimeRange.endMin !== null) {
        const effectiveEndMin = selectedTimeRange.endMin >= 1440 ? 1435 : selectedTimeRange.endMin;

        const startDayjs = scheduleDate
          .hour(Math.floor(selectedTimeRange.startMin / 60))
          .minute(selectedTimeRange.startMin % 60)
          .second(0);

        const endDayjs = scheduleDate
          .hour(Math.floor(effectiveEndMin / 60))
          .minute(effectiveEndMin % 60)
          .second(0);

        timeData = {
          meetingDate: scheduleDate,
          startTime: startDayjs,
          endTime: endDayjs,
        };
      }

      onConfirm(formattedDetailedRooms, timeData);
      onClose();
    } catch (error) {
      logger.error("Error fetching room details:", error);
      const selectedRooms = rooms.filter((r) => selectedIds.includes(r.id));
      onConfirm(selectedRooms);
      onClose();
    }
  }, [selectedIds, onConfirm, onClose, rooms, toast, selectedTimeRange, scheduleDate]);

  const handleRemoveChip = useCallback((roomId) => {
    setSelectedIds(prev => prev.filter(id => id !== roomId));
    setSelectedTimeRange({ startMin: null, endMin: null });
  }, []);

  const handleDateBoxClick = useCallback((e) => {
    const iconBtn = e.currentTarget.querySelector('.MuiIconButton-root, button, svg');
    if (iconBtn) {
      iconBtn.click();
    }
  }, []);

  const handlePrevDate = useCallback(() => {
    if (isToday) return;
    setScheduleDate(prev => prev.subtract(1, 'day'));
    setSelectedTimeRange({ startMin: null, endMin: null });
  }, [isToday]);

  const handleNextDate = useCallback(() => {
    setScheduleDate(prev => prev.add(1, 'day'));
    setSelectedTimeRange({ startMin: null, endMin: null });
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Chọn phòng họp"
      onSave={handleConfirm}
      titleButton="Xác nhận"
      size="lg"
      unsetPaddingTop
    >
      {/* <StickyHeader> */}
      <TimelineContainerHeader styleMb={selectedIds.length > 0 ? 0 : 3.125}>
        {/* Search and Filters */}
        <SearchToolbarBox>
          <UnifiedSearchContainer>
            <ClickAwayListener onClickAway={handleClickAway}>
              <div style={{ position: 'relative', height: '100%' }}>
                <PillFilterTrigger onClick={handleAdvancedFilterClick}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.7398 2.01172L1.33984 2.01172L6.69984 8.34992L6.69984 12.7317L9.37984 14.0717L9.37984 8.34992L14.7398 2.01172Z" stroke="currentColor" strokeWidth="1.34" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Bộ lọc</span>
                </PillFilterTrigger>

                {openFilter && (
                  <FilterBox alignRight={false}>
                    <StyleBoxActionDropDown>
                      <span>Lọc tìm kiếm</span>
                      <Search />
                    </StyleBoxActionDropDown>

                    <StyleActionCheckBox>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={searchCriteria.all}
                            indeterminate={
                              !searchCriteria.all &&
                              ['name', 'capacity', 'totalSeating'].some(k => searchCriteria[k])
                            }
                            onChange={handleSearchCriteriaChange('all')}
                            size="small"
                          />
                        }
                        label="Tất cả"
                      />
                    </StyleActionCheckBox>

                    <StyleActionCellCheckBox>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={searchCriteria.name}
                            onChange={handleSearchCriteriaChange('name')}
                            size="small"
                          />
                        }
                        label="Tên phòng họp"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={searchCriteria.capacity}
                            onChange={handleSearchCriteriaChange('capacity')}
                            size="small"
                          />
                        }
                        label="Sức chứa"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={searchCriteria.totalSeating}
                            onChange={handleSearchCriteriaChange('totalSeating')}
                            size="small"
                          />
                        }
                        label="Số lượng chỗ ngồi"
                      />
                    </StyleActionCellCheckBox>

                    <StyleActionButton>
                      <StyleActionButtonCancel onClick={handleClickAway}>
                        Hủy
                      </StyleActionButtonCancel>
                      <StyleActionButtonApply variant="contained" onClick={handleApplyFilter}>
                        Áp dụng
                      </StyleActionButtonApply>
                    </StyleActionButton>
                  </FilterBox>
                )}
              </div>
            </ClickAwayListener>

            <SearchInputWrapper>
              <StyledPillInput
                placeholder="Tìm kiếm..."
                value={searchText}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
              />
              {searchText && (
                <PillClearButton onClick={handleClearSearch}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </PillClearButton>
              )}
            </SearchInputWrapper>

            <PillTuneButton onClick={handleToggleFilter}>
              <TuneIcon />
            </PillTuneButton>
          </UnifiedSearchContainer>

          <BlueSearchButton onClick={handleSearchSubmit}>
            <Tooltip title="Tìm kiếm">
              <Search />
            </Tooltip>
          </BlueSearchButton>

          {selectedIds.length > 0 && (
            <SelectedSection>
              <SelectedLabel>Đã chọn:</SelectedLabel>
              {selectedIds.map(id => {
                const room = rooms.find(r => r.id === id) || initialSelectedMap[id];
                if (!room) return null;
                return (
                  <SelectedRoomChipItem
                    key={room.id}
                    room={room}
                    onDelete={handleRemoveChip}
                  />
                );
              })}
            </SelectedSection>
          )}
        </SearchToolbarBox>
      </TimelineContainerHeader>

      {/* Advanced Filter Popover */}
      <Popover
        open={openFilterPopover}
        anchorEl={filterAnchorEl}
        onClose={handleFilterPopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          style: {
            zIndex: 1400,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }
        }}
        slotProps={{
          paper: {
            style: {
              zIndex: 1400,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }
          }
        }}
      >
        <FilterPopoverContent>
          <PopoverHeaderTitle>
            <span>Bộ lọc</span>
            <PopoverFilterIcon />
          </PopoverHeaderTitle>
          <SearchFilterGrid>
            <FormControl fullWidth size="small">
              <CustomAsyncAutoComplete
                fullWidth
                size="small"
                label="Thiết bị"
                url={`${APP_BASE}/api/amenities/list?processFn=dsThietBi`}
                queryParam="name"
                optionLabel="name"
                optionValue="id"
                limit={20}
                placeholder="Thiết bị"
                value={advancedFilters.amenities || null}
                onChange={handleAdvancedFilterChange('amenities')}
              />
            </FormControl>
            <FormControl fullWidth size="small">
              <CustomInput
                fullWidth
                select
                size="small"
                label="Trạng thái phòng"
                value={advancedFilters.stage}
                onChange={handleAdvancedFilterChange('stage')}
                options={[
                  { id: null, name: "Tất cả" },
                  { id: 1, name: "Sẵn sàng sử dụng" },
                  { id: 2, name: "Bảo trì" }
                ]}
                customLabel="name"
                customValue="id"
              />
            </FormControl>
          </SearchFilterGrid>
          <PopoverFooterActions>
            <PopoverOutlinedButton onClick={handleResetAdvancedFilters}>
              Đặt lại
            </PopoverOutlinedButton>
            <PopoverFooterRightGroup>
              <PopoverOutlinedButton onClick={handleFilterPopoverClose}>
                Hủy
              </PopoverOutlinedButton>
              <PopoverContainedButton onClick={handleApplyAdvancedFilters}>
                Áp dụng lọc
              </PopoverContainedButton>
            </PopoverFooterRightGroup>
          </PopoverFooterActions>
        </FilterPopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <TimelineContainerV2>
          <TimelineHeaderWrapper>
            <TimelineTitle>
              <span>LỊCH BIỂU CHI TIẾT</span>
            </TimelineTitle>

            <DateNavigator>
              <StyledChevronLeftIcon
                onClick={isToday ? undefined : handlePrevDate}
                disabled={isToday}
              />
              <StyledDateBox onClick={handleDateBoxClick}>
                <DatePicker
                  value={scheduleDate}
                  onChange={handleScheduleDateChange}
                  showTime={false}
                  minDate={dayjs().startOf('day')}
                />
              </StyledDateBox>
              <StyledChevronRightIcon
                onClick={handleNextDate}
              />
            </DateNavigator>

            <IntervalSelectWrapper
              value={interval}
              onChange={handleIntervalChange}
              size="small"
              renderValue={(selected) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="interval-label">Chia khoảng:</span>
                  <span className="interval-value">
                    {selected === 60 ? '1 giờ' : `${selected} phút`}
                  </span>
                </div>
              )}
            >
              <MenuItem value={15}>15 phút</MenuItem>
              <MenuItem value={30}>30 phút</MenuItem>
              <MenuItem value={60}>1 giờ</MenuItem>
            </IntervalSelectWrapper>

            <TimelineLegend>
              <LegendItem><LegendDot dotColor="#0062AD" /> Đang họp</LegendItem>
              <LegendItem><LegendDot dotColor="#2e7d32" /> Chuẩn bị</LegendItem>
              <LegendItem><LegendDot dotColor="#1890ff" /> Dự kiến</LegendItem>
              <LegendItem><LegendDot dotColor="#eef2f6" /> Thời gian trống</LegendItem>
            </TimelineLegend>
          </TimelineHeaderWrapper>

          {selectedTimeRange.startMin !== null && selectedTimeRange.endMin !== null && (
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
              <SelectionSummaryText>
                Thời gian họp chọn trên Timeline: {formatScaleLabel(selectedTimeRange.startMin, interval)} - {formatScaleLabel(selectedTimeRange.endMin, interval)}
              </SelectionSummaryText>
            </div>
          )}

          {loadingSchedule ? (
            <TimelineLoadingWrapper>
              <CircularProgress size={30} />
            </TimelineLoadingWrapper>
          ) : (
            <TimelineSlotsScrollWrapper interval={interval}>
              <TimelineInnerWidthContainer interval={interval} totalSlots={slots.length}>
                <ContinuousTrackBar>
                  {/* Existing Meeting Blocks */}
                  {meetingBlocks.map((block) => (
                    <TrackBlock
                      key={block.id}
                      blockColor={block.color}
                      blockLeft={block.left}
                      blockWidth={block.width}
                    >
                      {block.label}
                    </TrackBlock>
                  ))}

                  {/* User Selection Block */}
                  {selectionBlock && (
                    <TrackBlock
                      isSelection
                      blockColor={selectionBlock.color}
                      blockLeft={selectionBlock.left}
                      blockWidth={selectionBlock.width}
                    >
                      {selectionBlock.label}
                    </TrackBlock>
                  )}

                  {/* Slot Overlay Grid for Click Interactions */}
                  <SlotOverlayGrid totalSlots={slots.length}>
                    {slots.map((slot) => {
                      const isSelected = selectedTimeRange.startMin !== null &&
                        slot.startMin >= selectedTimeRange.startMin &&
                        slot.endMin <= selectedTimeRange.endMin;

                      return (
                        <SlotOverlayCellItem
                          key={slot.startMin}
                          slot={slot}
                          isSelected={isSelected}
                          onClick={handleSlotClick}
                        />
                      );
                    })}
                  </SlotOverlayGrid>
                </ContinuousTrackBar>

                {/* Scale Labels Row Directly Below Track */}
                <TimelineScaleRow totalSlots={slots.length}>
                  {slots.map((slot) => (
                    <ScaleLabelItem key={slot.startMin}>
                      {slot.scaleLabel}
                    </ScaleLabelItem>
                  ))}
                </TimelineScaleRow>
              </TimelineInnerWidthContainer>
            </TimelineSlotsScrollWrapper>
          )}
        </TimelineContainerV2>
      )}

      {/* Room Grid */}
      {loading ? (
        <LoadingWrapper>
          <CircularProgress />
        </LoadingWrapper>
      ) : (
        <Grid container spacing={3}>
          {rooms.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              isSelected={selectedIds.includes(room.id)}
              onToggle={handleToggleRoom}
            />
          ))}
        </Grid>
      )}
    </Dialog>
  );
};

export default MeetingRoomSelection;

