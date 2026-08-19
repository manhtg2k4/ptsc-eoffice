"use client";

import React, { useState, useEffect, useCallback, useContext } from "react";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Search,
    Plus,
    List,
    X,
    ArrowLeft
} from "lucide-react";
import { toast } from "react-toastify";
import CreateEventModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/CreateEventModal";
import EventDetailPopover from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/EventDetailPopover";
import ConfirmDeleteModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/ConfirmDeleteModal";
import imgParty from "@assets/imgBackground/img_party.png";
import { useDispatch, useSelector } from "react-redux";
import { fetchEventCalendar, fetchUsers, fetchUserRoles, deleteEventCalendar } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import moment from "moment";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import { AuthContext } from "@AuthContext/AuthProvider";


export default function EventCalendarPage() {
    const { setActivePage } = useCMS();
    // Current date being viewed in the calendar
    const [viewDate, setViewDate] = useState(new Date());
    // The specific day selected by the user
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [modalMode, setModalMode] = useState("create"); // "create" or "view"
    const [detailPopover, setDetailPopover] = useState({ isOpen: false, event: null, rect: null });
    const [viewMode, setViewMode] = useState("month"); // "day", "week", "month", "year"
    const [isListView, setIsListView] = useState(false);
    const [isMyEventsActive, setIsMyEventsActive] = useState(false);
    const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
    const [daySummaryPopover, setDaySummaryPopover] = useState({ isOpen: false, date: null, events: [], rect: null });
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const viewDropdownRef = React.useRef(null);
    const daySummaryRef = React.useRef(null);
    const { user } = useContext(AuthContext);
    const currentUserName = user?.user?.name;
    const currentUserUsername = user?.user?.username;

    // Day Details Modal State
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [dayModalData, setDayModalData] = useState({ date: null, events: [] });
    const [selectedTypes, setSelectedTypes] = useState(["Ngày truyền thống", "Hội nghị & Đại hội", "Sản xuất kinh doanh", "Văn hóa đoàn thể"]);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const monthPickerRef = React.useRef(null);

    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = React.useRef(null);

    // Sidebar Collapsible States
    const [isTodayCollapsed, setIsTodayCollapsed] = useState(true);
    const [isUpcomingCollapsed, setIsUpcomingCollapsed] = useState(true);

    const dispatch = useDispatch();
    const { eventCalendarList, userRoleList } = useSelector((state) => state.news);

    // Check permission logic replaced by fetchUserRoles logic
    const isAdmin = userRoleList?.roles?.some(
        (role) => role === "ADMIN_NEWS" || role === "NGUOI_PHE_DUYET"
    );
    const isAdmins = userRoleList?.roles?.some(
        (role) => role === "ADMIN_NEWS"
    );

    // Initial setup and URL param handling
    useEffect(() => {
        dispatch(fetchUserRoles());
        dispatch(fetchUsers({ limit: 100 }));

        const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const dateParam = searchParams ? searchParams.get('date') : null;

        if (dateParam && moment(dateParam, "YYYY-MM-DD", true).isValid()) {
            const targetDate = new Date(dateParam);
            setViewDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
            setSelectedDate(targetDate);
        } else {
            const today = new Date();
            setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
            setSelectedDate(today);
        }
    }, [dispatch]);

    useEffect(() => {
        // Fetch events for the current month
        const startDate = moment(viewDate).startOf('month').toISOString();
        const endDate = moment(viewDate).endOf('month').toISOString();
        const params = {
            "filter[startTime][startDate]": startDate,
            "filter[startTime][endDate]": endDate,
            limit: 100
        };

        if (selectedTypes.length > 0) {
            params["filter[type]"] = selectedTypes.map(t => t === "Văn hóa đoàn thể" ? "Văn hóa - Đoàn thể" : t).join(",");
        }

        dispatch(fetchEventCalendar(params));
    }, [dispatch, viewDate, selectedTypes]);

    // Helper to get events for a specific day
    const getEventsForDay = useCallback((day, monthOffset = 0) => {
        if (!Array.isArray(eventCalendarList)) return [];
        const targetDate = moment(viewDate).add(monthOffset, 'months').date(day).startOf('day');
        return eventCalendarList.filter(event => {
            const start = moment(event.startTime).startOf('day');
            return start.isSame(targetDate, 'day');
        });
    }, [eventCalendarList, viewDate]);

    const getEventStatusColor = (event) => {
        const isImportant = event.status === 2 || event.isImportant;
        if (isImportant) return "yellow";
        
        const now = moment();
        const start = moment(event.startTime);
        const end = event.endTime ? moment(event.endTime) : moment(start).endOf('day');
        
        if (now.isAfter(end)) return "gray";
        if (now.isBetween(start, end, null, '[]')) return "green";
        return "blue";
    };


    const weekDays = ["H", "B", "T", "N", "S", "B", "C"];
    const fullWeekDays = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];

    const getCalendarDays = useCallback((date) => {
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const startDayRaw = startOfMonth.getDay();
        // Convert JS day (Sun=0, Mon=1...) to (Mon=0, ..., Sun=6)
        const startDay = startDayRaw === 0 ? 6 : startDayRaw - 1;
        const prevMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0).getDate();

        let days = [];
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ val: prevMonthEnd - i, current: false, monthOffset: -1 });
        }
        for (let i = 1; i <= endOfMonth.getDate(); i++) {
            days.push({ val: i, current: true, monthOffset: 0 });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ val: i, current: false, monthOffset: 1 });
        }
        return days;
    }, []);

    const getWeekDates = useCallback((date) => {
        const start = moment(date).startOf('isoWeek');
        return Array.from({ length: 7 }, (_, i) => moment(start).add(i, 'days').toDate());
    }, []);

    const HOURS = Array.from({ length: 24 }, (_, i) => i);
    const formatHour = (h) => {
        if (h === 0) return "12 AM";
        if (h < 12) return `${h} AM`;
        if (h === 12) return "12 PM";
        return `${h - 12} PM`;
    };

    const calendarDays = getCalendarDays(viewDate);

    const handlePrevMonth = useCallback(() => setViewDate(prev => {
        const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        setSelectedDate(next);
        return next;
    }), []);
    const handleNextMonth = useCallback(() => setViewDate(prev => {
        const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
        setSelectedDate(next);
        return next;
    }), []);
    const handleToday = useCallback(() => {
        const today = new Date();
        setViewDate(today);
        setSelectedDate(today);
    }, []);

    const handlePrevYear = useCallback(() => setViewDate(prev => {
        const next = new Date(prev.getFullYear() - 1, prev.getMonth(), 1);
        setSelectedDate(next);
        return next;
    }), []);
    const handleNextYear = useCallback(() => setViewDate(prev => {
        const next = new Date(prev.getFullYear() + 1, prev.getMonth(), 1);
        setSelectedDate(next);
        return next;
    }), []);

    const handleMonthSelect = useCallback((monthIndex) => {
        const next = new Date(viewDate.getFullYear(), monthIndex, 1);
        setViewDate(next);
        setSelectedDate(next);
        setIsMonthPickerOpen(false);
    }, [viewDate]);

    const handleEventClick = useCallback((eventId, rect = null) => {
        if (rect) {
            // Find existing event in state
            const event = eventCalendarList.find(e => (e.id || e._id) === eventId);
            if (event) {
                setDetailPopover({ isOpen: true, event, rect });
                return;
            }
        }
        setSelectedEventId(eventId);
        setModalMode("view");
        setIsCreateModalOpen(true);
    }, [eventCalendarList]);

    const handleAddEventClick = useCallback(() => {
        setModalMode("create");
        setSelectedEventId(null);
        setIsCreateModalOpen(true);
    }, []);

    const handleSearchSubmit = useCallback(() => {
        if (!searchQuery.trim() && isSearchOpen) {
            const startDate = moment(viewDate).startOf('month').toISOString();
            const endDate = moment(viewDate).endOf('month').toISOString();
            const params = {
                "filter[startTime][startDate]": startDate,
                "filter[startTime][endDate]": endDate,
                limit: 100
            };
            dispatch(fetchEventCalendar(params));
            return;
        }
        const params = {
            "filter[title]": searchQuery,
            limit: 100
        };
        dispatch(fetchEventCalendar(params));
    }, [searchQuery, isSearchOpen, viewDate, dispatch]);

    const handleMonthItemClick = useCallback((idx) => () => handleMonthSelect(idx), [handleMonthSelect]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleCalendarDayClick = useCallback((d) => () => {
        if (d.current) {
            const next = new Date(viewDate.getFullYear(), viewDate.getMonth(), d.val);
            setSelectedDate(next);
            setViewDate(next);
        }
    }, [viewDate]);

    const handleFilterChange = useCallback((type) => () => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    }, []);

    const handleSidebarEventClick = useCallback((id) => (e) => {
        handleEventClick(id, e.currentTarget.getBoundingClientRect());
    }, [handleEventClick]);

    const handleDayMoreClick = useCallback((d) => (e) => {
        e.stopPropagation();
        const targetDate = moment(viewDate).add(d.monthOffset, 'months').date(d.val).toDate();
        setDayModalData({ date: targetDate, events: getEventsForDay(d.val, d.monthOffset) });
        setIsDayModalOpen(true);
    }, [viewDate, getEventsForDay]);

    const handlePillClick = useCallback((eventId) => (e) => {
        e.stopPropagation();
        handleEventClick(eventId, e.currentTarget.getBoundingClientRect());
    }, [handleEventClick]);

    const handleGridDayClick = useCallback((d) => () => {
        if (d.current) {
            const next = new Date(viewDate.getFullYear(), viewDate.getMonth(), d.val);
            setSelectedDate(next);
            setViewDate(next);
        }
    }, [viewDate]);

    const handleCloseModal = useCallback(() => {
        setIsCreateModalOpen(false);
        setSelectedEventId(null);
        setModalMode("create");
    }, []);

    const handleClosePopover = useCallback(() => {
        setDetailPopover({ isOpen: false, event: null, rect: null });
    }, []);

    const handlePopoverEdit = useCallback((event) => {
        setDetailPopover({ isOpen: false, event: null, rect: null });
        setSelectedEventId(event.id || event._id);
        setModalMode("edit");
        setIsCreateModalOpen(true);
    }, []);

    const handlePopoverDelete = useCallback((event) => {
        setDetailPopover({ isOpen: false, event: null, rect: null });
        setEventToDelete(event);
        setIsDeleteConfirmOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!eventToDelete) return;
        
        try {
            await dispatch(deleteEventCalendar(eventToDelete.id || eventToDelete._id)).unwrap();
            toast.success("Xóa sự kiện thành công!");
            setIsDeleteConfirmOpen(false);
            setEventToDelete(null);
        } catch (error) {
            toast.error(error || "Không thể xóa sự kiện!");
        }
    }, [dispatch, eventToDelete]);

    const handleCloseDeleteConfirm = useCallback(() => {
        setIsDeleteConfirmOpen(false);
        setEventToDelete(null);
    }, []);

    const handleCloseDayOverlay = useCallback(() => setIsDayModalOpen(false), []);
    const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);
    const handleCloseDayModal = useCallback(() => setIsDayModalOpen(false), []);

    const handleDayModalEventClick = useCallback((id) => (e) => {
        setIsDayModalOpen(false);
        handleEventClick(id, e.currentTarget.getBoundingClientRect());
    }, [handleEventClick]);

    const handleSearchChange = useCallback((e) => setSearchQuery(e.target.value), []);
    const handleSearchKeyDown = useCallback((e) => { if (e.key === 'Enter') handleSearchSubmit(); }, [handleSearchSubmit]);
    const handleSearchBtnClick = useCallback(() => {
        if (isSearchOpen) { handleSearchSubmit(); } else { setIsSearchOpen(true); }
    }, [isSearchOpen, handleSearchSubmit]);

    const handleHomeClick = useCallback(() => {
        setActivePage("/");
        window.history.pushState(null, "", "/");
        window.scrollTo(0, 0);
    }, [setActivePage]);
    const onBackClick = useCallback(() => {
        const state = window.history.state;
        if (state && state.fromUrl) {
            setActivePage(state.fromUrl);
            window.history.pushState(null, "", state.fromUrl);
            window.scrollTo(0, 0);
            return;
        }
        handleHomeClick(); // Quay về trang chủ nếu không có lịch sử trước đó
    }, [setActivePage, handleHomeClick]);

    const toggleViewDropdown = useCallback(() => setIsViewDropdownOpen(p => !p), []);
    const toggleMonthPicker = useCallback(() => setIsMonthPickerOpen(p => !p), []);
    const handleViewChange = useCallback((id) => (e) => {
        e.stopPropagation();
        if (["day", "week", "month", "year"].includes(id)) {
            setViewMode(id);
            // If switching to a time view, we don't necessarily close list view unless user wants to
        } else if (id === "list") {
            setIsListView(!isListView);
        } else if (id === "my-events") {
            setIsMyEventsActive(!isMyEventsActive);
        }
    }, [isListView, isMyEventsActive]);

    const handleYearDayClick = useCallback((val, mIdxOffset, rect) => {
        const targetDate = moment(viewDate).add(mIdxOffset, 'months').date(val).toDate();
        const events = getEventsForDay(val, mIdxOffset);
        setDaySummaryPopover({ isOpen: true, date: targetDate, events, rect });
    }, [viewDate, getEventsForDay]);

    const handleSummaryEventClick = useCallback((id, rect) => () => {
        // Keep summary open when opening detail, per user request
        handleEventClick(id, rect);
    }, [handleEventClick]);

    const handleYearDayItemClick = useCallback((d, monthOffset) => (e) => {
        if (d.current) {
            handleYearDayClick(d.val, monthOffset, e.currentTarget.getBoundingClientRect());
        }
    }, [handleYearDayClick]);

    const toggleTodayCollapse = useCallback(() => setIsTodayCollapsed(p => !p), []);
    const toggleUpcomingCollapse = useCallback(() => setIsUpcomingCollapsed(p => !p), []);
    const handleCloseDaySummary = useCallback(() => setDaySummaryPopover(p => ({ ...p, isOpen: false })), []);

    const formatDateHeader = (date) => {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        return date.toLocaleDateString('vi-VN', options);
    };

    const formatMonthYear = (date) => {
        const months = ["Tháng Giêng", "Tháng Hai", "Tháng Ba", "Tháng Tư", "Tháng Năm", "Tháng Sáu", "Tháng Bảy", "Tháng Tám", "Tháng Chín", "Tháng Mười", "Tháng Mười Một", "Tháng Mười Hai"];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const months = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

    // Higher-order callbacks moved above usage

    // Close search input when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isSearchOpen && searchInputRef.current && !searchInputRef.current.closest('.ec-search-wrapper').contains(event.target)) {
                if (!searchQuery) setIsSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isSearchOpen, searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (monthPickerRef.current && !monthPickerRef.current.contains(event.target)) {
                setIsMonthPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target)) {
                setIsViewDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isClickInsideDetail = event.target.closest(".popover-wrapper");
            if (daySummaryRef.current && !daySummaryRef.current.contains(event.target) && !isClickInsideDetail) {
                setDaySummaryPopover(p => ({ ...p, isOpen: false }));
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const VIEW_OPTIONS = [
        { id: "day", label: "Ngày", type: "radio" },
        { id: "week", label: "Tuần", type: "radio" },
        { id: "month", label: "Tháng", type: "radio" },
        { id: "year", label: "Năm", type: "radio" },
        { id: "list", label: "Danh sách sự kiện", type: "checkbox" },
        { id: "my-events", label: "Danh sách sự kiện tham gia", type: "checkbox" },
    ];

    const getFilteredEventsForList = useCallback(() => {
        let events = [];
        if (viewMode === "day") {
            events = getEventsForDay(selectedDate.getDate());
        } else if (viewMode === "week") {
            const weekDates = getWeekDates(selectedDate);
            events = eventCalendarList.filter(e => {
                const s = moment(e.startTime);
                return weekDates.some(d => s.isSame(moment(d), 'day'));
            });
        } else if (viewMode === "month") {
            events = eventCalendarList || [];
        } else if (viewMode === "year") {
            // All events in current year
            events = eventCalendarList || [];
        }

        if (isMyEventsActive) {
            if (currentUserName || currentUserUsername) {
                // Hàm chuẩn hóa để so sánh chính xác hơn (bỏ dấu, bỏ cách, chữ thường)
                const normalize = (str) => {
                    if (!str) return "";
                    return str.toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/\s+/g, "");
                };

                const nUserName = normalize(currentUserName);
                const nUserUsername = normalize(currentUserUsername);

                events = events.filter(e => {
                    if (!e.participants) return false;
                    const participantsList = e.participants.split(/ (?=@)/)
                        .map(p => p.trim())
                        .map(p => p.startsWith('@') ? p.substring(1) : p)
                        .filter(p => p.length > 0);
                    
                    return participantsList.some(p => {
                        const nP = normalize(p);
                        return (nUserName && nP === nUserName) || (nUserUsername && nP === nUserUsername);
                    });
                });
            } else {
                events = [];
            }
        }

        return [...events].sort((a, b) => moment(a.startTime).valueOf() - moment(b.startTime).valueOf());
    }, [viewMode, selectedDate, eventCalendarList, isMyEventsActive, getEventsForDay, getWeekDates, currentUserName, currentUserUsername]);

    const getCurrentViewLabel = () => {
        if (isListView || isMyEventsActive) {
            if (isListView && isMyEventsActive) return "Danh sách kết hợp";
            if (isListView) return "Danh sách sự kiện";
            return "Sự kiện tham gia";
        }
        return VIEW_OPTIONS.find(o => o.id === viewMode)?.label;
    };

    const sidebarTodayEvents = getEventsForDay(new Date().getDate());
    const sidebarUpcomingEvents = (Array.isArray(eventCalendarList) ? eventCalendarList : [])
        .filter(e => moment(e.startTime).isAfter(moment()));

    return (
        <div className="ec-page-wrapper">
            {/* 1. Hero Banner */}
            <div className="ec-hero">
                <div className="ec-hero-pattern"></div>
                <button
                  className="nd-back-button-fixed"
                  onClick={onBackClick}
                  type="button"
                  aria-label="Quay lại"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="ec-hero-content">
                    <div className="ec-breadcrumb">
                        <span className="clickable" onClick={handleHomeClick}>Trang chủ</span>
                        <span className="ec-chevron-icon"><ChevronRight size={14} /></span>
                        <span className="active" style={{ color: "#0066cc", fontWeight: 600 }}>Lịch sự kiện</span>
                    </div>
                    <h1 className="ec-title">
                        <CalendarIcon size={24} />
                        Lịch sự kiện
                    </h1>
                </div>
            </div>

            {/* Google Calendar Style Detail Popover */}
            <EventDetailPopover
                isOpen={detailPopover.isOpen}
                event={detailPopover.event}
                anchorRect={detailPopover.rect}
                onClose={handleClosePopover}
                onEdit={handlePopoverEdit}
                onDelete={handlePopoverDelete}
                isAdmin={isAdmin}
                isAdmins={isAdmins}
            />

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={isDeleteConfirmOpen}
                onClose={handleCloseDeleteConfirm}
                onConfirm={handleConfirmDelete}
                title="Xóa sự kiện"
                message={`Bạn có chắc chắn muốn xóa sự kiện "${eventToDelete?.title || ''}"? Hành động này không thể hoàn tác.`}
            />

            {/* Day Summary Popover for Year View */}
            {daySummaryPopover.isOpen && (
                <div 
                    ref={daySummaryRef}
                    className="year-day-summary-popover"
                    style={{
                        position: 'fixed',
                        left: daySummaryPopover.rect ? Math.max(10, Math.min(window.innerWidth - 260, daySummaryPopover.rect.left + daySummaryPopover.rect.width / 2 - 125)) : '50%',
                        top: daySummaryPopover.rect ? (daySummaryPopover.rect.top - 20) : '50%',
                        transform: 'translateY(-100%)',
                        zIndex: 2050
                    }}
                >
                    <div className="summary-header">
                        <button className="close-btn" onClick={handleCloseDaySummary}><X size={16} /></button>
                        <div className="day-name">{moment(daySummaryPopover.date).format("ddd").toUpperCase()}</div>
                        <div className="day-number-large">{moment(daySummaryPopover.date).format("D")}</div>
                    </div>
                    <div className="summary-body">
                        {daySummaryPopover.events.length > 0 ? (
                            <div className="summary-list">
                                {daySummaryPopover.events.map(event => {
                                    const colorCls = getEventStatusColor(event);
                                    return (
                                        <div 
                                            key={event.id || event._id} 
                                            className={"summary-pill clickable " + colorCls}
                                            onClick={handleSummaryEventClick(event.id || event._id, daySummaryPopover.rect)}
                                        >
                                            {event.title}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="no-events">Không có sự kiện nào cho ngày này</div>
                        )}
                    </div>
                </div>
            )}

            <div className="ec-container">
                <div className="ec-layout-grid">

                    {/* 2. Left Sidebar */}
                    <aside className="ec-sidebar">
                        <div className="ec-sidebar-card combined-sidebar-card">
                            <div className="sidebar-section mini-cal-section">
                                <div className="mini-cal-header">
                                    <div className="mini-cal-today">{formatDateHeader(selectedDate)}</div>
                                    <div className="mini-cal-month-nav">
                                        <span className="current-month">{formatMonthYear(viewDate)}</span>
                                        <div className="nav-btns">
                                            <span className="clickable" onClick={handlePrevMonth}><ChevronLeft size={16} /></span>
                                            <span className="clickable" onClick={handleNextMonth}><ChevronRight size={16} /></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mini-cal-grid">
                                    {weekDays.map((d) => <div key={d} className="mini-cal-weekday">{d}</div>)}
                                    {calendarDays.map((d, i) => {
                                        const isSelected = d.current && d.val === selectedDate.getDate() && viewDate.getMonth() === selectedDate.getMonth() && viewDate.getFullYear() === selectedDate.getFullYear();
                                        const miniDayCls = "mini-cal-day" + (!d.current ? ' empty' : '') + (isSelected ? ' selected' : '');
                                        return (
                                            <div
                                                key={`mini-day-${i}`}
                                                className={miniDayCls}
                                                onClick={handleCalendarDayClick(d)}
                                            >
                                                {d.val < 10 ? `0${d.val}` : d.val}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="sidebar-divider"></div>

                            <div className="sidebar-section filter-section">
                                <h3 className="section-title" style={{ marginBottom: '10px' }}>Bộ lọc</h3>
                                <div className="filter-list">
                                    {[
                                        "Ngày truyền thống",
                                        "Hội nghị & Đại hội",
                                        "Sản xuất kinh doanh",
                                        "Văn hóa đoàn thể"
                                    ].map(type => (
                                        <label key={type} className={"filter-item " + (selectedTypes.includes(type) ? "active" : "")}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTypes.includes(type)}
                                                onChange={handleFilterChange(type)}
                                            />
                                            <span className="custom-check"></span>
                                            <span>{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="sidebar-divider"></div>

                            {sidebarTodayEvents.length === 0 && sidebarUpcomingEvents.length === 0 ? (
                                <div className="sidebar-section">
                                    <div className="sidebar-event-list upcoming-scroll-container">
                                        <div className="ec-empty-state">
                                            <div className="ec-empty-icon">
                                                <img src={imgParty} alt="No events" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
                                            </div>
                                            <div className="ec-empty-text">Chưa có sự kiện nào trong 15 ngày tới!</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="sidebar-section events-today-section">
                                        <div className="section-header clickable" onClick={toggleTodayCollapse}>
                                            <h3 className="section-title">Hôm nay ({sidebarTodayEvents.length})</h3>
                                            {isTodayCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                        </div>
                                        {!isTodayCollapsed && (
                                            <div className="sidebar-event-list upcoming-scroll-container">
                                                {sidebarTodayEvents.map((event) => (
                                                    <div key={event.id || event._id} className="sb-event-item" onClick={handleSidebarEventClick(event.id || event._id)}>
                                                        <div className={"sb-event-dot dot-" + getEventStatusColor(event)}></div>
                                                        <div className="sb-event-info">
                                                            <div className={"sb-event-name " + getEventStatusColor(event)}>{event.title}</div>
                                                            <div className="sb-event-time">{moment(event.startTime).format("HH:mm")}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {sidebarTodayEvents.length === 0 && (
                                                    <div className="no-events-text">Không có sự kiện hôm nay</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="sidebar-divider"></div>

                                    <div className="sidebar-section upcoming-section">
                                        <div className="section-header clickable" onClick={toggleUpcomingCollapse}>
                                            <h3 className="section-title">Sự kiện sắp tới</h3>
                                            {isUpcomingCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                        </div>
                                        {!isUpcomingCollapsed && (
                                            <div className="sidebar-event-list upcoming-scroll-container">
                                                {sidebarUpcomingEvents.map((event) => (
                                                    <div key={event.id || event._id} className="sb-event-item upcoming" onClick={handleSidebarEventClick(event.id || event._id)}>
                                                        <div className={"sb-event-dot dot-" + getEventStatusColor(event)}></div>
                                                        <div className="sb-event-info">
                                                            <div className={"sb-event-name " + getEventStatusColor(event)}>{event.title}</div>
                                                            <div className="sb-event-time">{moment(event.startTime).format("DD/MM/YYYY")}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {sidebarUpcomingEvents.length === 0 && (
                                                    <div className="ec-empty-state">
                                                        <div className="ec-empty-icon">
                                                            <img src={imgParty} alt="No events" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
                                                        </div>
                                                        <div className="ec-empty-text">Chưa có sự kiện nào trong 15 ngày tới!</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </aside>

                    {/* 3. Main Content */}
                    <main className="ec-main-content">
                        <div className="ec-main-card">
                            <div className="ec-main-header">
                                <div className="ec-header-left">
                                    <span className="header-icon clickable" onClick={handleToday}><List size={20} /></span>
                                    <h2 className="main-month-title">
                                        {viewMode === 'day' ? formatDateHeader(selectedDate) : formatMonthYear(viewDate)}
                                    </h2>
                                    <div className="view-selector-container" ref={monthPickerRef}>
                                        <div className={"view-selector clickable" + (isMonthPickerOpen ? " open" : "")} onClick={toggleMonthPicker}>
                                            <ChevronDown size={18} />
                                        </div>
                                        {isMonthPickerOpen && (
                                            <div className="month-picker-dropdown">
                                                <div className="month-picker-header">
                                                    <span className="clickable" onClick={handlePrevYear}><ChevronLeft size={18} /></span>
                                                    <span className="picker-year">{viewDate.getFullYear()}</span>
                                                    <span className="clickable" onClick={handleNextYear}><ChevronRight size={18} /></span>
                                                </div>
                                                <div className="month-grid">
                                                    {months.map((m, idx) => (
                                                        <div
                                                            key={m}
                                                            className={"month-item" + (viewDate.getMonth() === idx ? ' selected' : '')}
                                                            onClick={handleMonthItemClick(idx)}
                                                        >
                                                            {m}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="ec-header-right">
                                    <div className="view-mode-switcher" ref={viewDropdownRef}>
                                        <button className="view-mode-btn" onClick={toggleViewDropdown}>
                                            <span>{getCurrentViewLabel()}</span>
                                            <ChevronDown size={16} />
                                        </button>
                                        {isViewDropdownOpen && (
                                            <div className="view-mode-dropdown">
                                                {VIEW_OPTIONS.map((option, idx) => {
                                                    const isActive = option.type === "radio" 
                                                        ? viewMode === option.id 
                                                        : (option.id === "list" ? isListView : isMyEventsActive);

                                                    return (
                                                        <React.Fragment key={option.id}>
                                                            <div 
                                                                className={"view-mode-item" + (isActive ? " active" : "")}
                                                                onClick={handleViewChange(option.id)}
                                                            >
                                                                {option.type === "radio" ? (
                                                                    <div className="radio-circle">
                                                                        {isActive && <div className="radio-inner" />}
                                                                    </div>
                                                                ) : (
                                                                    <div className={"checkbox-square" + (isActive ? " checked" : "")}>
                                                                        {isActive && <div className="check-mark">✓</div>}
                                                                    </div>
                                                                )}
                                                                <span>{option.label}</span>
                                                            </div>
                                                            {idx === 3 && <div className="dropdown-divider" />}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <>
                                            <div className={"ec-search-wrapper" + (isSearchOpen ? ' open' : '')}>
                                                {isSearchOpen && (
                                                    <input
                                                        ref={searchInputRef}
                                                        type="text"
                                                        className="ec-search-input"
                                                        placeholder="Tìm kiếm..."
                                                        value={searchQuery}
                                                        onChange={handleSearchChange}
                                                        onKeyDown={handleSearchKeyDown}
                                                        autoFocus
                                                    />
                                                )}
                                                <button className="ec-search-btn" onClick={handleSearchBtnClick}>
                                                    <Search size={18} />
                                                </button>
                                            </div>
                                            <button className="ec-add-event-btn" onClick={handleAddEventClick}>
                                                <span>Thêm sự kiện</span>
                                                <div className="add-icon-circle"><Plus size={16} /></div>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {!isListView && !isMyEventsActive && viewMode === "month" && (
                                <div className="ec-calendar-grid">
                                    <div className="ec-grid-header">
                                        {fullWeekDays.map(d => (
                                            <div key={d} className="grid-weekday-label">
                                                <span className="full-name">{d}</span>
                                                <span className="short-name">{d.replace("Thứ ", "T").replace("Chủ nhật", "CN")}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid-body">
                                        {calendarDays.map((d, idx) => {
                                            const isSelected = d.current && d.val === selectedDate.getDate() && viewDate.getMonth() === selectedDate.getMonth();

                                            const gridCellCls = "grid-day-cell" + (!d.current ? ' muted' : '') + (isSelected ? ' active-cell' : '');
                                            const dayNumCls = "day-number" + (isSelected ? ' selected' : '');

                                            return (
                                                <div
                                                    key={`grid-day-${idx}`}
                                                    className={gridCellCls}
                                                    onClick={handleGridDayClick(d)}
                                                >
                                                    <div className="day-number-row">
                                                        <span className={dayNumCls}>
                                                            {d.val < 10 ? `0${d.val}` : d.val}
                                                        </span>
                                                    </div>
                                                    <div className="day-events-container">
                                                        {getEventsForDay(d.val, d.monthOffset).slice(0, 2).map((event) => {
                                                            const color = getEventStatusColor(event);
                                                            const pillCls = "ec-event-pill " + color + " clickable";
                                                            const dotCls = "pill-dot " + color;
                                                            return (
                                                                <div
                                                                    key={event.id || event._id}
                                                                    className={pillCls}
                                                                    title={event.title}
                                                                    onClick={handlePillClick(event.id || event._id)}
                                                                >
                                                                    <div className={dotCls}></div>
                                                                    <span>{event.title}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        {getEventsForDay(d.val, d.monthOffset).length > 2 && (
                                                            <div
                                                                className="more-events-link"
                                                                onClick={handleDayMoreClick(d)}
                                                            >
                                                                + Sự kiện khác ({getEventsForDay(d.val, d.monthOffset).length - 2})
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {!isListView && !isMyEventsActive && (viewMode === "day" || viewMode === "week") && (
                                <div className="ec-time-grid">
                                    <div className="tg-header-row">
                                        <div className="tg-time-gutter" />
                                        <div className="tg-header-content">
                                            {(viewMode === "week" ? getWeekDates(selectedDate) : [selectedDate]).map((date, idx) => (
                                                <div key={`tg-h-${idx}`} className="tg-header-day">
                                                    <div className="tg-day-name">{moment(date).format("ddd").toUpperCase()}</div>
                                                    <div className={"tg-day-num" + (moment(date).isSame(moment(), 'day') ? " today" : "")}>
                                                        {moment(date).format("D")}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="tg-body-scrollable">
                                        <div className="tg-grid-wrapper">
                                            <div className="tg-time-column">
                                                {HOURS.map(h => (
                                                    <div key={`th-${h}`} className="tg-time-label">
                                                        {h !== 0 && <span>{formatHour(h)}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="tg-days-container">
                                                {(viewMode === "week" ? getWeekDates(selectedDate) : [selectedDate]).map((date, dayIdx) => {
                                                    const currentDayStart = moment(date).startOf('day');
                                                    const currentDayEnd = moment(date).endOf('day');

                                                    const dayEvents = eventCalendarList.filter(e => {
                                                        const s = moment(e.startTime);
                                                        const eventEndM = moment(e.endTime || moment(e.startTime).add(1, 'hour'));
                                                        return s.isBefore(currentDayEnd) && eventEndM.isAfter(currentDayStart);
                                                    }).sort((a, b) => moment(a.startTime).valueOf() - moment(b.startTime).valueOf());

                                                    // Calculate precise overlaps using clusters
                                                    const eventLanes = {};
                                                    if (dayEvents.length > 0) {
                                                        // 1. Group into connected components (clusters)
                                                        const clusters = [];
                                                        dayEvents.forEach(event => {
                                                            const start = moment(event.startTime).valueOf();
                                                            const end = moment(event.endTime || moment(event.startTime).add(1, 'hour')).valueOf();
                                                            
                                                            let cluster = clusters.find(c => c.end > start);
                                                            if (!cluster) {
                                                                cluster = { events: [], end: end };
                                                                clusters.push(cluster);
                                                            }
                                                            cluster.events.push(event);
                                                            cluster.end = Math.max(cluster.end, end);
                                                        });

                                                        // 2. For each cluster, assign lanes
                                                        clusters.forEach(cluster => {
                                                            const lanes = [];
                                                            cluster.events.forEach(event => {
                                                                const startM = moment(event.startTime).valueOf();
                                                                const endM = moment(event.endTime || moment(event.startTime).add(1, 'hour')).valueOf();
                                                                
                                                                let laneIdx = lanes.findIndex(laneEndM => laneEndM <= startM);
                                                                if (laneIdx === -1) {
                                                                    laneIdx = lanes.length;
                                                                    lanes.push(endM);
                                                                } else {
                                                                    lanes[laneIdx] = endM;
                                                                }
                                                                eventLanes[event.id || event._id] = { laneIdx, total: 0 };
                                                            });

                                                            // Update total lanes for this cluster
                                                            cluster.events.forEach(event => {
                                                                eventLanes[event.id || event._id].total = lanes.length;
                                                            });
                                                        });
                                                    }
                                                    
                                                    return (
                                                        <div key={`tg-col-${dayIdx}`} className="tg-day-column">
                                                            {HOURS.map(h => (
                                                                <div key={`tc-${dayIdx}-${h}`} className="tg-hour-cell" />
                                                            ))}
                                                            <div className="tg-events-overlay">
                                                                {dayEvents.map(event => {
                                                                    const actualStart = moment(event.startTime);
                                                                    const actualEnd = moment(event.endTime || moment(event.startTime).add(1, 'hour'));
                                                                    
                                                                    const displayStart = actualStart.isBefore(currentDayStart) ? currentDayStart : actualStart;
                                                                    const displayEnd = actualEnd.isAfter(currentDayEnd) ? currentDayEnd : actualEnd;
                                                                    
                                                                    const startMins = displayStart.hours() * 60 + displayStart.minutes();
                                                                    let endMins = actualEnd.isAfter(currentDayEnd) ? (24 * 60) : (displayEnd.hours() * 60 + displayEnd.minutes());
                                                                    
                                                                    const duration = Math.max(30, endMins - startMins);
                                                                    const colorCls = getEventStatusColor(event);
                                                                    
                                                                    const { laneIdx, total } = eventLanes[event.id || event._id];
                                                                    const width = 100 / (total || 1);
                                                                    const left = laneIdx * width;
                                                                    
                                                                    return (
                                                                        <div 
                                                                            key={`tge-${dayIdx}-${event.id || event._id}`}
                                                                            className={"tg-event-pill clickable " + colorCls}
                                                                            style={{
                                                                                top: `${startMins}px`,
                                                                                height: `${duration}px`,
                                                                                left: `${left}%`,
                                                                                width: `${width - 2}%`,
                                                                                zIndex: 10 + laneIdx
                                                                            }}
                                                                            onClick={handleSidebarEventClick(event.id || event._id)}
                                                                        >
                                                                            <div className="tg-event-title">{event.title}</div>
                                                                            <div className="tg-event-time">
                                                                                {actualStart.format("HH:mm")} - {actualEnd.format("HH:mm")}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isListView && !isMyEventsActive && viewMode === "year" && (
                                <div className="ec-year-grid">
                                    {months.map((m, mIdx) => {
                                        const yearOfDate = viewDate.getFullYear();
                                        const date = new Date(yearOfDate, mIdx, 1);
                                        const yearDays = getCalendarDays(date);
                                        return (
                                            <div key={`year-month-${mIdx}`} className="year-month-card">
                                                <h4 className="year-month-title">{m}</h4>
                                                <div className="year-mini-grid">
                                                    {weekDays.map((wd, wdIdx) => <div key={`wd-${wdIdx}`} className="mini-weekday">{wd}</div>)}
                                                    {yearDays.map((d, dIdx) => (
                                                        <div 
                                                            key={`yd-${mIdx}-${dIdx}`} 
                                                            className={"mini-day clickable" + (!d.current ? " muted" : "") + (d.current && getEventsForDay(d.val, mIdx - viewDate.getMonth()).length > 0 ? " has-event" : "")}
                                                            onClick={handleYearDayItemClick(d, mIdx - viewDate.getMonth())}
                                                        >
                                                            {d.val}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {(isListView || isMyEventsActive) && (
                                <div className="ec-list-view">
                                    {getFilteredEventsForList().length > 0 ? (
                                        <div className="list-container">
                                            {getFilteredEventsForList().map(event => (
                                                <div 
                                                    key={event.id || event._id} 
                                                    className="event-list-card clickable"
                                                    onClick={handleSidebarEventClick(event.id || event._id)}
                                                >
                                                        <div className="card-top-row">
                                                            <span className={"event-type-badge " + getEventStatusColor(event)}>
                                                                {event.type || "Sự kiện chung"}
                                                            </span>
                                                            <div className="chevron-icon-wrapper">
                                                                <ChevronRight size={20} />
                                                            </div>
                                                        </div>
                                                    <h3 className="event-list-title">{event.title}</h3>
                                                    <div className="event-list-meta">
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <g clipPath="url(#clip0_4502_33482)">
                                                                <path d="M8 4V8L10.6667 9.33333" stroke="#99A1AF" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                                                                <path d="M7.9987 14.6673C11.6806 14.6673 14.6654 11.6825 14.6654 8.00065C14.6654 4.31875 11.6806 1.33398 7.9987 1.33398C4.3168 1.33398 1.33203 4.31875 1.33203 8.00065C1.33203 11.6825 4.3168 14.6673 7.9987 14.6673Z" stroke="#99A1AF" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </g>
                                                            <defs>
                                                                <clipPath id="clip0_4502_33482">
                                                                    <rect width="16" height="16" fill="white"/>
                                                                </clipPath>
                                                            </defs>
                                                        </svg>
                                                        <span>
                                                            {(() => {
                                                                moment.locale("vi");
                                                                const start = moment(event.startTime);
                                                                const end = moment(event.endTime || moment(event.startTime).add(1, 'hour'));
                                                                const isSameDay = start.isSame(end, 'day');
                                                                
                                                                if (isSameDay) {
                                                                    const day = start.format("dddd");
                                                                    const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
                                                                    return `${capitalizedDay}, ${start.format("DD/MM/YYYY")} - ${start.format("HH:mm")} - ${end.format("HH:mm")}`;
                                                                } else {
                                                                    const startStr = start.format("D [Thg] MM, HH:mm");
                                                                    const endStr = end.format("D [Thg] MM, HH:mm");
                                                                    return `${startStr} - ${endStr}`;
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="ec-empty-view">
                                            <div className="icon">📅</div>
                                            <div className="text">Không có sự kiện nào để hiển thị trong mục này.</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>

                </div>
            </div>

            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                eventId={selectedEventId}
                mode={modalMode}
            />

            {/* Day Details Popup/Modal */}
            {isDayModalOpen && (
                <div className="ec-day-modal-overlay" onClick={handleCloseDayOverlay}>
                    <div className="ec-day-modal-card" onClick={handleStopPropagation}>
                        <div className="ec-day-modal-header">
                            <div className="ec-day-modal-title">
                                Ngày {dayModalData.date?.getDate()} tháng {dayModalData.date?.getMonth() + 1}
                            </div>
                            <button className="ec-day-modal-close" onClick={handleCloseDayModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="ec-day-modal-body">
                            <div className="ec-day-modal-info">
                                Tổng số: {dayModalData.events.length} sự kiện
                            </div>
                            <div className="ec-day-modal-list">
                                {dayModalData.events.map((event) => {
                                    const modalCardCls = "ec-day-event-card clickable " + getEventStatusColor(event);
                                    return (
                                        <div
                                            key={event.id || event._id}
                                            className={modalCardCls}
                                            onClick={handleDayModalEventClick(event.id || event._id)}
                                        >
                                            <div className="ec-day-event-content">
                                                <div className="ec-day-event-title">{event.title}</div>
                                                <div className="ec-day-event-time">
                                                    {moment(event.startTime).format("HH:mm")} - {moment(event.endTime).format("HH:mm")}
                                                </div>
                                                {event.location && (
                                                    <div className="ec-day-event-loc">@{event.location}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <style>{`
                .ec-chevron-icon { display: inline-flex; align-items: center; }
                .ec-page-wrapper {
                    background: transparent;
                    font-family: 'Inter', -apple-system, sans-serif;
                    min-height: calc(100vh - 150px);
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    box-sizing: border-box;
                }
                .ec-hero {
                    background: url('/anhtrongdong.png') no-repeat center center;
                    background-size: cover;
                    padding: 30px 20px;
                    position: relative;
                    overflow: hidden;
                    text-align: center;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-shrink: 0;
                }
                .ec-hero-pattern {
                    position: absolute;
                    top: 0; right: 0; bottom: 0;
                    width: 40%;
                    background: url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Vietnam_Dong_Son_drum.svg/500px-Vietnam_Dong_Son_drum.svg.png') no-repeat right center;
                    background-size: contain;
                    opacity: 0.05;
                }
                .ec-hero-content { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; }
                .ec-breadcrumb { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: #64748b; margin-bottom: 12px; font-weight: 500; }
                .ec-title { 
                    font-size: 26px; font-weight: 400; color: #3b82f6; margin: 0; 
                    display: flex; align-items: center; justify-content: center; gap: 12px;
                }

                .ec-container { 
                    max-width: 1600px; margin: 0 auto; padding: 8px 24px 8px; 
                    position: relative; z-index: 10; width: 100%; box-sizing: border-box;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .ec-layout-grid { 
                    display: grid; 
                    grid-template-columns: 320px 1fr; 
                    gap: 20px; 
                    align-items: stretch;
                    flex: 1;
                    min-height: 0;
                }

                .clickable { cursor: pointer; transition: all 0.2s; }
                .clickable:hover { opacity: 0.7; transform: translateY(-1px); }

                /* Unified Sidebar Card */
                .ec-sidebar { height: 100%; min-height: 0; }
                .combined-sidebar-card {
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 10px 50px rgba(0,0,0,0.04);
                    border: none;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .sidebar-section { padding: 12px 16px; }
                .nd-back-button-fixed {
                    position: absolute;
                    left: 40px; /* Khoảng cách cố định từ lề trái banner vào */
                    top: 10px;  /* Khoảng cách từ trên xuống */
                    width: 44px;
                    height: 44px;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 50%;
                    background: white;
                    color: #1e293b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    transition: all 0.3s ease;
                    z-index: 20;
                }
                .nd-back-button-fixed:hover {
                    background: #3b82f6;
                    color: white;
                    transform: translateX(-5px); /* Hiệu ứng nhích nhẹ sang trái khi hover */
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
                }
                @media (max-width: 1200px) {
                    .nd-back-button-fixed {
                        left: 20px; /* Thu hẹp khoảng cách khi màn hình nhỏ đi */
                    }
                }
                .section-header { display: flex; justify-content: space-between; align-items: center; color: #1e293b; }
                .sidebar-divider { height: 1px; background-color: #f1f5f9; margin: 0 16px; }
                .section-title { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; }

                .mini-cal-section { padding-top: 20px; padding-bottom: 20px; }
                .upcoming-section { padding-bottom: 20px; }
                
                .mini-cal-header { margin-bottom: 8px; }
                .mini-cal-today { color: #3b82f6; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
                .mini-cal-month-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .current-month { font-size: 16px; font-weight: 700; color: #1e293b; }
                .nav-btns { display: flex; gap: 6px; color: #64748b; }
                
                .mini-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
                .mini-cal-weekday { font-size: 11px; font-weight: 400; color: #94a3b8; padding-bottom: 8px; }
                .mini-cal-day { 
                    font-size: 12px; height: 37px; display: flex; align-items: center; justify-content: center; 
                    border-radius: 50%; color: #475569; font-weight: 600; cursor: pointer; transition: all 0.2s;
                }
                .mini-cal-day:hover:not(.empty) { background: #eff6ff; color: #3b82f6; }
                .mini-cal-day.selected { background: #3b82f6; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
                .mini-cal-day.empty { color: #cbd5e1; }

                .filter-list { display: flex; flex-direction: column; gap: 4px; }
                .filter-item { 
                    display: flex; 
                    align-items: center; 
                    gap: 10px; 
                    font-size: 13px; 
                    color: #475569; 
                    font-weight: 400; 
                    cursor: pointer; 
                    padding: 6px 10px;
                    border-radius: 8px;
                    transition: all 0.2s;
                    margin: 0 -4px;
                }
                .filter-item:hover {
                    background: #eef2ff;
                    color: #312e81;
                }
                .filter-item.active {
                    color: #1e293b;
                    font-weight: 500;
                }
                .filter-item input { display: none; }
                .custom-check { 
                    width: 20px; height: 20px; border-radius: 6px; background: #fff; position: relative; 
                    border: 2px solid #cbd5e1; transition: all 0.2s; 
                }
                .filter-item input:checked + .custom-check {
                    background: #3b82f6;
                    border-color: #3b82f6;
                }
                .filter-item input:checked + .custom-check::after {
                    content: '✓'; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
                    color: white; font-size: 11px; font-weight: 900;
                }

                .sidebar-event-list { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 10px; 
                    margin-top: 12px;
                    animation: slideDown 0.3s ease-out;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .upcoming-scroll-container {
                    max-height: 140px;
                    overflow-y: auto;
                    padding-right: 5px;
                }
                .upcoming-scroll-container::-webkit-scrollbar {
                    width: 4px;
                }
                .upcoming-scroll-container::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .upcoming-scroll-container::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .upcoming-scroll-container::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .sb-event-item { display: flex; gap: 10px; align-items: center; width: 100%; cursor: pointer; }
                .sb-event-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                .dot-yellow { background: #f59e0b; }
                .dot-gray { background: #94a3b8; }
                .dot-green { background: #10b981; }
                .dot-blue { background: #3b82f6; }
                .dot-dark { background: #1e293b; }
                .dot-cyan { background: #06b6d4; }
                .dot-orange { background: #f97316; }
                .sb-event-info { display: flex; justify-content: space-between; align-items: center; flex: 1; }
                .sb-event-name { font-size: 14px; font-weight: 500; color: #334155; }
                .sb-event-name.yellow { color: #f59e0b; background: transparent !important; border: none !important; }
                .sb-event-name.gray { color: #94a3b8; background: transparent !important; border: none !important; }
                .sb-event-name.green { color: #10b981; background: transparent !important; border: none !important; }
                .sb-event-name.blue { color: #3b82f6; background: transparent !important; border: none !important; }
                .sb-event-time { font-size: 12px; color: #64748b; font-weight: 500; }

                /* Main Content Card */
                .ec-main-content { min-width: 0; height: 100%; }
                .ec-main-card { 
                    background: white; border-radius: 24px; 
                    box-shadow: 0 10px 50px rgba(0,0,0,0.04); 
                    display: flex; flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }
                .ec-main-header { padding: 8px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
                .ec-header-left { display: flex; align-items: center; gap: 20px; position: relative; }
                .header-icon { color: #64748b; }
                .main-month-title { font-size: 22px; font-weight: 700; color: #3b82f6; margin: 0; min-width: 200px; }
                
                .view-selector-container { position: relative; }
                .view-selector { 
                    background: transparent; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; 
                    font-size: 14px; font-weight: 500; color: #64748b; display: flex; align-items: center; gap: 8px; cursor: pointer;
                    transition: all 0.2s;
                }
                .view-selector:hover, .view-selector.active {
                    background: #eff6ff;
                    border-color: #3b82f6;
                    color: #3b82f6;
                }
                .view-selector.open svg { transform: rotate(180deg); }
                .view-selector svg { transition: transform 0.2s; }

                .month-picker-dropdown {
                    position: absolute;
                    top: calc(100% + 12px);
                    left: 0;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.12);
                    border: 1px solid #f1f5f9;
                    padding: 20px;
                    z-index: 1000;
                    width: 280px;
                    animation: dropdownPop 0.2s ease-out;
                }
                @keyframes dropdownPop {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .month-picker-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .picker-year { font-weight: 700; color: #1e293b; font-size: 16px; }

                .month-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }
                .month-item {
                    padding: 10px 4px;
                    text-align: center;
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .month-item:hover { background: #f8fafc; color: #3b82f6; }
                .month-item.selected { background: #3b82f6; color: white; }
                
                .ec-header-right { display: flex; gap: 12px; align-items: center; }
                .ec-search-wrapper {
                    display: flex;
                    align-items: center;
                    background: transparent;
                    border-radius: 10px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .ec-search-wrapper.open {
                    background: #fff;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    border: 1px solid #e2e8f0;
                    padding-left: 12px;
                }
                .ec-search-input {
                    border: none;
                    outline: none;
                    background: transparent;
                    font-size: 14px;
                    color: #334155;
                    width: 200px;
                    padding: 8px 0;
                }
                .ec-search-btn { 
                    width: 44px; height: 44px; border-radius: 10px; border: none; background: transparent; 
                    color: #3b82f6; display: flex; align-items: center; justify-content: center; cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .ec-search-wrapper:not(.open) .ec-search-btn:hover { background: #eff6ff; }
                
                .ec-add-event-btn { 
                    background: #3b82f6; color: white; border: none; padding: 10px 12px 10px 20px; border-radius: 10px; 
                    font-weight: 500; font-size: 15px; display: flex; align-items: center; gap: 12px; cursor: pointer;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
                    transition: all 0.2s;
                }
                .ec-add-event-btn:hover { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); transform: translateY(-1px); }
                .add-icon-circle { width: 28px; height: 28px; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; }

                .ec-calendar-grid { flex: 1; display: flex; flex-direction: column; }
                .ec-grid-header { 
                    display: grid; grid-template-columns: repeat(7, 1fr); background: #f0f9ff; 
                    border-bottom: 1px solid #e0f2fe; 
                }
                .grid-weekday-label { padding: 4px 8px; text-align: center; font-size: 13px; font-weight: 600; color: #64748b; text-transform: capitalize; }
                .grid-weekday-label .short-name { display: none; }
                
                .grid-body { 
                    display: grid; 
                    grid-template-columns: repeat(7, 1fr); 
                    grid-template-rows: repeat(auto-fill, 1fr); 
                    flex: 1; 
                    min-height: 0;
                }

                .grid-day-cell { 
                    border-right: 1px solid #e2e8f0; 
                    border-bottom: 1px solid #e2e8f0; 
                    display: flex; 
                    flex-direction: column; 
                    gap: 2px; 
                    transition: background 0.2s; 
                    cursor: pointer;
                    padding: 2px 4px;
                    min-height: 0; 
                    height: 100%; 
                    background: #ffffff;
                    overflow: hidden;
                }

                .grid-day-cell:hover:not(.muted) { background: #f8fafc; }
                .grid-day-cell:nth-child(7n) { border-right: none; }
                .grid-day-cell:nth-last-child(-n+7) { border-bottom: none; }
                .grid-day-cell.active-cell { background: #f0f9ff !important; }
                .grid-day-cell.muted { background: #fafafa; opacity: 0.5; }

                .day-number-row { display: flex; justify-content: flex-start; margin-bottom: 6px; }
                .day-number { font-size: 13px; font-weight: 600; color: #334155; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; }
                .day-number.selected { background: #3b82f6; color: white; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4); font-weight: 700; }

                .day-events-container { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 6px; 
                    flex: 1;
                }

                .more-events-link { 
                    font-size: 13px; 
                    font-weight: 400; 
                    color: #3b82f6; 
                    cursor: pointer; 
                    padding: 4px 8px;
                    border-radius: 8px;
                    transition: all 0.2s;
                    text-align: left;
                    width: fit-content;
                }
                .more-events-link:hover {
                    background: #eff6ff;
                    text-decoration: underline;
                }

                .ec-event-pill { 
                    border-radius: 4px; font-size: 11px; font-weight: 500;
                    display: flex; align-items: center; gap: 4px; 
                    padding: 4px 8px;
                    border: 1px solid transparent;
                    min-width: 0;
                }
                .ec-event-pill span {
                    flex: 1;
                }
                .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

                /* View mode switcher */
                .view-mode-switcher { position: relative; }
                .view-mode-btn {
                    display: flex; align-items: center; gap: 8px;
                    background: white; border: 1px solid #e2e8f0; border-radius: 8px;
                    padding: 8px 16px; font-size: 14px; font-weight: 500; color: #64748b;
                    cursor: pointer; transition: all 0.2s;
                }
                .view-mode-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; }
                
                .view-mode-dropdown {
                    position: absolute; top: calc(100% + 8px); right: 0;
                    background: white; border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    border: 1px solid #f1f5f9; padding: 8px; z-index: 1000; width: 220px;
                }
                .view-mode-item {
                    display: flex; align-items: center; gap: 12px; padding: 10px 12px;
                    border-radius: 8px; cursor: pointer; transition: all 0.2s;
                    color: #475569; font-size: 14px;
                    min-width: 0;
                }
                .view-mode-item:hover { background: #f1f5f9; color: #1e293b; }
                .view-mode-item.active { background: #eff6ff; color: #3b82f6; font-weight: 600; }
                .view-mode-item span {
                    flex: 1;
                }
                
                .radio-circle {
                    width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1;
                    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
                }
                .view-mode-item.active .radio-circle { border-color: #3b82f6; }
                .radio-inner { width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; }

                .checkbox-square {
                    width: 18px; height: 18px; border-radius: 4px; border: 2px solid #cbd5e1;
                    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
                    font-size: 10px; color: white;
                }
                .checkbox-square.checked { background: #3b82f6; border-color: #3b82f6; }
                .check-mark { font-weight: bold; }

                .dropdown-divider { height: 1.5px; background: #f1f5f9; margin: 6px 8px; opacity: 0.8; }

                /* Year view */
                .ec-year-grid {
                    display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
                    padding: 24px; overflow-y: auto; flex: 1; min-height: 0;
                    background: #f8fafc;
                }
                .year-month-card {
                    background: white; border-radius: 16px; padding: 16px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;
                }
                .year-month-title {
                    font-size: 16px; font-weight: 700; color: #1e293b;
                    margin-bottom: 12px; text-align: center; color: #3b82f6;
                }
                .year-mini-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
                .mini-weekday { font-size: 10px; color: #94a3b8; font-weight: 600; text-align: center; padding-bottom: 6px; }
                .mini-day {
                    aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
                    font-size: 11px; font-weight: 500; color: #475569; border-radius: 50%;
                }
                .mini-day.muted { color: transparent; pointer-events: none; }
                .mini-day.has-event { background: #eff6ff; color: #3b82f6; font-weight: 700; }
                .mini-day.clickable:hover { background: #f1f5f9; transform: scale(1.1); }
                
                /* Time Grid (Day/Week) */
                .ec-time-grid { 
                    display: flex; flex-direction: column; flex: 1; height: 100%; min-height: 0;
                    background: white; border-top: 1px solid #e2e8f0;
                }
                .ec-time-grid * { box-sizing: border-box; }
                .tg-header-row { display: flex; border-bottom: 1px solid #e2e8f0; background: #fff; }
                .tg-time-gutter { width: 60px; flex-shrink: 0; border-right: 1px solid #e2e8f0; }
                .tg-header-content { display: flex; flex: 1; }
                .tg-header-day { 
                    flex: 1; padding: 12px 0; text-align: center; border-right: 1px solid #e2e8f0;
                    display: flex; flex-direction: column; align-items: center; gap: 4px;
                }
                .tg-header-day:last-child { border-right: none; }
                .tg-day-name { font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
                .tg-day-num { 
                    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
                    font-size: 18px; color: #334155; border-radius: 50%;
                }
                .tg-day-num.today { background: #3b82f6; color: white; font-weight: 700; }
                
                .tg-body-scrollable { flex: 1; overflow-y: auto; background: #fff; }
                .tg-grid-wrapper { display: flex; position: relative; }
                .tg-time-column { width: 60px; flex-shrink: 0; border-right: 1px solid #e2e8f0; }
                .tg-time-label { 
                    height: 60px; font-size: 10px; color: #64748b; text-align: right; 
                    padding-right: 8px; position: relative; top: -6px; 
                }
                .tg-days-container { display: flex; flex: 1; }
                .tg-day-column { flex: 1; border-right: 1px solid #e2e8f0; position: relative; }
                .tg-day-column:last-child { border-right: none; }
                .tg-hour-cell { height: 60px; border-bottom: 1px solid #f1f5f9; }
                
                .tg-events-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 0 4px; pointer-events: none; }
                .tg-event-pill { 
                    position: absolute; left: 4px; right: 4px; border-radius: 6px;
                    padding: 4px 8px; font-size: 12px; pointer-events: auto;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08); border-left: 4px solid;
                    z-index: 10; overflow: hidden;
                }
                .tg-event-pill.yellow { background: #FFF3CA; color: #854d0e; border-left-color: #f59e0b; }
                .tg-event-pill.gray { background: #EEEEEE; color: #64748b; border-left-color: #94a3b8; }
                .tg-event-pill.green { background: #CFF4E8; color: #065f46; border-left-color: #10b981; }
                .tg-event-pill.blue { background: #CFDBF4; color: #1e40af; border-left-color: #3b82f6; }
                
                .tg-event-title { font-weight: 600; }
                .tg-event-time { font-size: 10px; opacity: 0.8; }

                /* Year Day Summary Popover */
                .year-day-summary-popover {
                    width: 250px; background: white; border-radius: 24px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 1px solid #f1f5f9;
                    overflow: hidden; animation: popIn 0.2s ease-out;
                }
                .year-day-summary-popover .summary-header {
                    padding: 24px 16px 16px; text-align: center; border-bottom: 1px solid #f1f5f9;
                    background: #f8fafc; position: relative;
                    display: flex; flex-direction: column; align-items: center;
                }
                .day-name { font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 1.5px; margin-bottom: 4px; display: block; width: 100%; text-align: center; }
                .day-number-large { font-size: 36px; font-weight: 400; color: #1e293b; line-height: 1; margin: 0 auto; display: block; width: 100%; text-align: center; }
                .close-btn { position: absolute; top: 16px; right: 16px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 50%; display: flex; z-index: 10; }
                
                .summary-body { padding: 12px; max-height: 220px; overflow-y: auto; }
                .summary-list { display: flex; flex-direction: column; gap: 6px; }
                .summary-pill {
                    padding: 8px 12px; border-radius: 8px;
                    font-size: 13px; font-weight: 500;
                    transition: all 0.2s;
                    border: 1.5px solid transparent;
                }
                .summary-pill:hover { transform: translateX(2px); filter: brightness(1.05); }
                
                /* Pill states for summary */
                .summary-pill.yellow { background: #FFF3CA; color: #854d0e; border-color: #FFDF8C; }
                .summary-pill.gray { background: #EEEEEE; color: #64748b; border-color: #D1D1D1; }
                .summary-pill.green { background: #CFF4E8; color: #065f46; border-color: #A0E4CD; }
                .summary-pill.blue { background: #CFDBF4; color: #1e40af; border-color: #A0BCE4; }

                .no-events { font-size: 12px; color: #94a3b8; text-align: center; padding: 10px 0; }
                
                /* Empty view message */
                .ec-empty-view {
                    flex: 1; display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding: 40px; text-align: center;
                    color: #94a3b8; font-size: 15px; background: #fafafa;
                }
                .ec-empty-icon { margin-bottom: 24px; }
                
                /* Status Colors (Same for Pill and Modal Cards) */
                .yellow { background: #FFF3CA; color: #854d0e; border-color: #FFDF8C; }
                .pill-dot.yellow { background: #f59e0b; }
                .gray { background: #EEEEEE; color: #64748b; border-color: #D1D1D1; }
                .pill-dot.gray { background: #94a3b8; }
                .green { background: #CFF4E8; color: #065f46; border-color: #A0E4CD; }
                .pill-dot.green { background: #10b981; }
                .blue { background: #CFDBF4; color: #1e40af; border-color: #A0BCE4; }
                .pill-dot.blue { background: #3b82f6; }

                /* List View Styles */
                .ec-list-view {
                    flex: 1; padding: 24px; overflow-y: auto; background: #f8fafc;
                }
                .list-container {
                    display: flex; flex-direction: column; gap: 16px; max-width: 100%; margin: 0 auto;
                }
                .event-list-card {
                    background: white; border-radius: 16px; padding: 24px;
                    border: 1px solid #f1f5f9; box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative; overflow: hidden;
                }
                .event-list-card:hover { 
                    transform: translateY(-4px); 
                    box-shadow: 0 12px 30px rgba(59, 130, 246, 0.08); 
                    border-color: #3b82f6; 
                }
                .card-top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
                .event-type-badge {
                    padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 600;
                    background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;
                }
                .chevron-icon-wrapper { color: #94a3b8; transition: transform 0.2s; }
                .event-list-card:hover .chevron-icon-wrapper { transform: translateX(4px); color: #3b82f6; }
                .event-list-title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 12px; line-height: 1.4; }
                .event-list-meta { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 14px; }
                
                /* Redefining status colors for large badges in list cards */
                .event-type-badge.yellow { background: #fffbeb; color: #d97706; border-color: #fde68a; }
                .event-type-badge.gray { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }
                .event-type-badge.green { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
                .event-type-badge.blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }

                /* Day Details Modal */
                .ec-day-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center; z-index: 2000;
                    animation: fadeIn 0.3s ease;
                }
                .ec-day-modal-card {
                    background: white; border-radius: 24px; width: 500px; max-height: 85vh;
                    box-shadow: 0 30px 60px -12px rgba(0,0,0,0.25);
                    display: flex; flex-direction: column; overflow: hidden;
                    animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes modalPop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .ec-day-modal-header {
                    padding: 24px 32px; display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 1.5px solid #f1f5f9;
                }
                .ec-day-modal-title { font-size: 20px; font-weight: 700; color: #1e293b; }
                .ec-day-modal-close {
                    background: #f8fafc; border: none; width: 40px; height: 40px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center; color: #617d98;
                    cursor: pointer; transition: all 0.2s;
                }
                .ec-day-modal-close:hover { background: #f1f5f9; color: #ef4444; }

                .ec-day-modal-body { padding: 32px; overflow-y: auto; }
                .ec-day-modal-info { font-size: 15px; color: #64748b; margin-bottom: 20px; font-weight: 500; }
                .ec-day-modal-list { display: flex; flex-direction: column; gap: 16px; }

                .ec-day-event-card {
                    padding: 18px; border-radius: 16px; display: flex; gap: 16px;
                    transition: transform 0.2s;
                }
                .ec-day-event-card:hover { transform: translateX(4px); }
                .ec-day-event-title { font-size: 16px; font-weight: 400; margin-bottom: 6px; }
                .ec-day-event-time { font-size: 13px; opacity: 0.8; font-weight: 600; }
                .ec-day-event-loc { font-size: 12px; margin-top: 4px; opacity: 0.7; font-style: italic; }

                /* Empty State Styles */
                .ec-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                    animation: fadeIn 0.5s ease-out;
                }
                .ec-empty-icon {
                    margin-bottom: 20px;
                    filter: drop-shadow(0 10px 15px rgba(0,0,0,0.05));
                    transition: transform 0.3s ease;
                }
                .ec-empty-state:hover .ec-empty-icon {
                    transform: scale(1.1) rotate(5deg);
                }
                .ec-empty-text {
                    font-size: 16px;
                    font-weight: 500;
                    color: #94a3b8;
                    line-height: 1.6;
                    max-width: 220px;
                    margin: 0 auto;
                }

                /* Responsiveness */
                
                /* Large Desktop */
                @media (max-width: 1440px) {
                    .ec-layout-grid { grid-template-columns: 280px 1fr; gap: 16px; }
                    .grid-day-cell { min-height: 0; }
                }
                
                /* Desktop / Small Laptop */
                @media (max-width: 1200px) {
                    .ec-container { padding: 40px 20px 0; }
                    .ec-layout-grid { grid-template-columns: 300px 1fr; gap: 20px; }
                    .main-month-title { font-size: 20px; min-width: 180px; }
                    .ec-add-event-btn { padding: 10px 12px 10px 18px; font-size: 14px; gap: 10px; }
                    .add-icon-circle { width: 26px; height: 26px; }
                    .grid-day-cell { min-height: 0; padding: 4px 6px; }
                }
                
                /* iPad Pro / Tablet Landscape */
                @media (max-width: 1024px) {
                    .ec-container { padding: 30px 20px 0; }
                    /* Change to vertical layout */
                    .ec-layout-grid { 
                        grid-template-columns: 1fr; 
                        gap: 24px; 
                    }
                    .ec-sidebar { order: 1; }
                    .ec-main-content { order: 2; }
                    
                    .ec-hero { padding: 24px 20px; }
                    .ec-title { font-size: 26px; }
                    .combined-sidebar-card { 
                        border-radius: 20px; 
                        height: auto;
                    }
                    .ec-main-card { border-radius: 20px; }
                    
                    /* Main Header - Larger fonts */
                    .ec-main-header { padding: 20px 28px; }
                    .main-month-title { font-size: 24px; }
                    .view-selector { font-size: 15px; padding: 8px 16px; }
                    .ec-add-event-btn { padding: 12px 14px 12px 20px; font-size: 15px; }
                    .add-icon-circle { width: 28px; height: 28px; }
                    
                    /* Calendar Grid - Larger fonts */
                    .grid-weekday-label { font-size: 14px; padding: 14px 12px; }
                    .grid-day-cell { 
                        min-height: 0; 
                        padding: 6px 8px;
                        gap: 4px;
                    }
                    .day-number { width: 30px; height: 30px; font-size: 14px; }
                    .day-number-row { margin-bottom: 6px; }
                    .ec-event-pill { 
                        font-size: 12px; 
                        padding: 6px 10px; 
                        gap: 6px;
                        border-radius: 6px;
                    }
                    .pill-dot { width: 6px; height: 6px; }
                    .more-events-link { font-size: 11px; padding: 4px 8px; }
                    
                    /* Sidebar - Larger fonts and better spacing */
                    .sidebar-section { padding: 16px 20px; }
                    .section-title { font-size: 17px; margin-bottom: 14px; }
                    .mini-cal-grid { gap: 6px; }
                    .mini-cal-day { height: 38px; font-size: 14px; }
                    .mini-cal-weekday { font-size: 13px; }
                    .mini-cal-today { font-size: 15px; }
                    .current-month { font-size: 19px; }
                    .filter-item { font-size: 15px; gap: 12px; }
                    .filter-list { gap: 16px; }
                    .custom-check { width: 20px; height: 20px; }
                    .sb-event-name { font-size: 15px; }
                    .sb-event-time { font-size: 13px; }
                    .sb-event-dot { width: 8px; height: 8px; }
                    .sidebar-event-list { gap: 14px; }
                    
                    /* Make sidebar sections display in a grid for better use of space */
                    .combined-sidebar-card {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        grid-template-rows: auto;
                        gap: 0;
                    }
                    .mini-cal-section {
                        grid-column: 1 / -1;
                        border-bottom: 1px solid #f1f5f9;
                        padding-bottom: 20px;
                    }
                    .filter-section {
                        grid-column: 1;
                        border-right: 1px solid #f1f5f9;
                        padding-top: 20px;
                    }
                    .events-today-section {
                        grid-column: 2;
                        padding-top: 20px;
                    }
                    .upcoming-section {
                        grid-column: 1 / -1;
                        border-top: 1px solid #f1f5f9;
                        padding-top: 20px;
                    }
                    .sidebar-divider { display: none; }
                }
                
                /* iPad / Tablet Portrait */
                @media (max-width: 768px) {
                    .nd-back-button-fixed {
                        top: 15px;
                        left: 15px;
                        width: 36px;
                        height: 36px;
                    }
                    .ec-container { padding: 20px 16px 0; }
                    .ec-layout-grid { grid-template-columns: 1fr; gap: 20px; }
                    .ec-sidebar { order: 2; }
                    .ec-main-content { order: 1; margin-bottom: 20px; }
                    .combined-sidebar-card { height: auto; border-radius: 20px; }
                    
                    /* Hero */
                    .ec-hero { padding: 20px 16px; }
                    .ec-title { font-size: 22px; }
                    .ec-breadcrumb { font-size: 12px; }
                    
                    /* Main Header */
                    .ec-main-header { padding: 16px 20px; flex-direction: row; flex-wrap: wrap; gap: 12px; }
                    .ec-header-left { gap: 12px; flex: 1; min-width: 200px; }
                    .header-icon { width: 20px; height: 20px; }
                    .main-month-title { font-size: 18px; min-width: auto; }
                    .view-selector { padding: 6px 12px; font-size: 13px; }
                    .ec-header-right { gap: 10px; }
                    .ec-search-btn { width: 40px; height: 40px; }
                    .ec-add-event-btn { padding: 9px 10px 9px 16px; font-size: 13px; }
                    .add-icon-circle { width: 24px; height: 24px; }
                    
                    /* Calendar Grid */
                    .grid-weekday-label { font-size: 12px; padding: 12px 8px; }
                    .grid-day-cell { min-height: 0; padding: 4px; gap: 3px; }
                    .day-number { width: 26px; height: 26px; font-size: 12px; }
                    .day-number-row { margin-bottom: 4px; }
                    .ec-event-pill { font-size: 11px; padding: 5px 8px; gap: 5px; }
                    .pill-dot { width: 5px; height: 5px; }
                    .more-events-link { font-size: 10px; padding: 3px 6px; }
                    
                    /* Sidebar */
                    .sidebar-section { padding: 14px 18px; }
                    .section-title { font-size: 15px; }
                    .mini-cal-grid { gap: 7px; }
                    .mini-cal-day { height: 34px; font-size: 12px; }
                    .filter-item { font-size: 13px; gap: 10px; }
                    .custom-check { width: 18px; height: 18px; }
                    .sb-event-name { font-size: 13px; }
                    .sb-event-time { font-size: 11px; }
                }
                
                /* Mobile Landscape / Large Phone */
                @media (max-width: 640px) {
                    .ec-container { padding: 16px 12px 0; }
                    
                    /* Hero */
                    .ec-hero { padding: 16px 12px; }
                    .ec-title { font-size: 20px; gap: 8px; }
                    .ec-breadcrumb { font-size: 11px; }
                    
                    /* Main Header */
                    .ec-main-header { padding: 14px 16px; }
                    .ec-header-left { flex-wrap: wrap; gap: 10px; width: 100%; }
                    .main-month-title { font-size: 16px; order: 1; flex: 1 1 100%; }
                    .header-icon { order: 2; }
                    .view-selector-container { order: 3; }
                    .ec-header-right { width: 100%; justify-content: space-between; margin-top: 8px; }
                    .ec-add-event-btn span { display: none; }
                    .ec-add-event-btn { padding: 9px; }
                    
                    /* Calendar Grid */
                    .grid-weekday-label .full-name { display: none; }
                    .grid-weekday-label .short-name { display: block; }
                    .grid-weekday-label { font-size: 11px; padding: 10px 4px; }
                    .grid-day-cell { min-height: 0; padding: 3px; }
                    .day-number { width: 24px; height: 24px; font-size: 11px; }
                    .ec-event-pill { padding: 4px 6px; }
                    .ec-event-pill span { display: none; } /* Show only dots */
                    .pill-dot { width: 7px; height: 7px; margin: 0 auto; }
                    .more-events-link { font-size: 9px; padding: 2px 4px; }
                    
                    /* Sidebar */
                    .combined-sidebar-card { border-radius: 16px; }
                    .ec-main-card { border-radius: 16px; }
                    .sidebar-section { padding: 12px 16px; }
                    .mini-cal-section { padding-top: 16px; padding-bottom: 16px; }
                    .upcoming-section { padding-bottom: 16px; }
                    .section-title { font-size: 14px; margin-bottom: 10px; }
                    .mini-cal-today { font-size: 12px; }
                    .current-month { font-size: 16px; }
                    .mini-cal-day { height: 32px; font-size: 11px; }
                    .mini-cal-weekday { font-size: 11px; }
                    .filter-item { font-size: 13px; gap: 10px; }
                    .filter-list { gap: 12px; }
                    .sb-event-item { gap: 8px; }
                    .sb-event-dot { width: 7px; height: 7px; }
                }
                
                /* Mobile Portrait / Small Phone */
                @media (max-width: 480px) {
                    .ec-container { padding: 12px 10px 0; }
                    
                    /* Hero */
                    .ec-hero { padding: 14px 10px; }
                    .ec-title { font-size: 18px; }
                    
                    /* Main Header */
                    .ec-main-header { padding: 12px 14px; gap: 10px; }
                    .main-month-title { font-size: 15px; }
                    .view-selector { padding: 5px 10px; font-size: 12px; }
                    .ec-search-btn { width: 36px; height: 36px; }
                    .ec-add-event-btn { padding: 8px; }
                    .add-icon-circle { width: 20px; height: 20px; }
                    
                    /* Calendar Grid */
                    .grid-weekday-label { font-size: 10px; padding: 8px 2px; }
                    .grid-day-cell { min-height: 0; padding: 2px; gap: 2px; }
                    .day-number { width: 22px; height: 22px; font-size: 10px; font-weight: 600; }
                    .day-number.selected { font-weight: 700; }
                    .ec-event-pill { padding: 3px 4px; }
                    .pill-dot { width: 6px; height: 6px; }
                    .more-events-link { font-size: 8px; padding: 2px 3px; }
                    
                    /* Sidebar */
                    .sidebar-section { padding: 10px 14px; }
                    .section-title { font-size: 13px; }
                    .mini-cal-grid { gap: 3px; }
                    .mini-cal-day { height: 30px; font-size: 10px; }
                    .mini-cal-weekday { font-size: 10px; padding-bottom: 8px; }
                    .mini-cal-today { font-size: 11px; }
                    .current-month { font-size: 15px; }
                    .nav-btns { gap: 6px; }
                    .filter-item { font-size: 12px; gap: 8px; }
                    .custom-check { width: 16px; height: 16px; border-radius: 4px; }
                    .filter-list { gap: 10px; }
                    .sb-event-name { font-size: 12px; }
                    .sb-event-time { font-size: 10px; }
                    .sb-event-dot { width: 6px; height: 6px; }
                    .sidebar-event-list { gap: 10px; }
                    
                    /* Modal */
                    .ec-day-modal-card { width: 90%; max-width: 400px; }
                    .ec-day-modal-header { padding: 18px 20px; }
                    .ec-day-modal-title { font-size: 16px; }
                    .ec-day-modal-body { padding: 20px; }
                    .ec-day-event-card { padding: 14px; }
                    .ec-day-event-title { font-size: 14px; }
                }
            `}</style>
        </div>
    );
}
