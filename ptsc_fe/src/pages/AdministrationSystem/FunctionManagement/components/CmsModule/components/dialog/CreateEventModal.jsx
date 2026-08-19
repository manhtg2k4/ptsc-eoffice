"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
    X,
    Calendar,
    MapPin,
    // Plus,
    List,
    ChevronDown,
} from "lucide-react";
import { toast } from "react-toastify";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { createEventCalendar, fetchUsers, fetchEventCalendarDetail, updateEventCalendar } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import * as S from "./CreateEventModal.styles";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';


const EVENT_TYPES = [
    { id: "1", label: "Ngày truyền thống" },
    { id: "2", label: "Hội nghị & Đại hội" },
    { id: "3", label: "Sản xuất kinh doanh" },
    { id: "4", label: "Văn hóa - Đoàn thể" }
];

export default function CreateEventModal({ isOpen, onClose, eventId = null, mode = "create" }) {
    const dispatch = useDispatch();
    const { userList, loading: userLoading, currentEvent } = useSelector((state) => state.news);
    const [title, setTitle] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [isImportant, setIsImportant] = useState(false);
    const [isTypeOpen, setIsTypeOpen] = useState(false);
    const [errors, setErrors] = useState({});
    const typeDropdownRef = React.useRef(null);

    // Time Range State
    const [startTime, setStartTime] = useState(moment().format("YYYY-MM-DDTHH:mm"));
    const [endTime, setEndTime] = useState(moment().add(1, 'hour').format("YYYY-MM-DDTHH:mm"));
    const [isTimeOpen, setIsTimeOpen] = useState(false);
    const timeDropdownRef = React.useRef(null);

    // Guest Tagging State
    const [selectedGuests, setSelectedGuests] = useState([]);
    const [guestSearch, setGuestSearch] = useState("");
    const [showGuestDropdown, setShowGuestDropdown] = useState(false);
    const guestDropdownRef = React.useRef(null);
    const guestInputRef = React.useRef(null);

    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");

    const isTimeInverted = useMemo(() => {
        if (!startTime || !endTime) return false;
        return moment(startTime).isSameOrAfter(moment(endTime));
    }, [startTime, endTime]);

    // const MOCK_USERS = [
    //     { id: 1, name: "Nguyễn Văn A", avatar: "https://i.pravatar.cc/150?u=12", role: "Trưởng phòng" },
    //     { id: 2, name: "Trần Thị B", avatar: "https://i.pravatar.cc/150?u=22", role: "Kế toán" },
    //     { id: 3, name: "Lê Văn C", avatar: "https://i.pravatar.cc/150?u=32", role: "Kỹ thuật" },
    //     { id: 4, name: "Phạm Minh D", avatar: "https://i.pravatar.cc/150?u=42", role: "Nhân sự" },
    //     { id: 5, name: "Hoàng Anh E", avatar: "https://i.pravatar.cc/150?u=52", role: "Giám đốc" },
    // ];

    // const filteredUsers = MOCK_USERS.filter(user =>
    //     user.name.toLowerCase().includes(guestSearch.toLowerCase()) &&
    //     !selectedGuests.some(g => g.id === user.id)
    // );

    // Fetch event details if eventId is provided
    React.useEffect(() => {
        if (isOpen && eventId && (mode === "view" || mode === "edit")) {
            dispatch(fetchEventCalendarDetail(eventId));
        }
    }, [dispatch, isOpen, eventId, mode]);

    // Populate form when event details are loaded (for view and edit modes)
    React.useEffect(() => {
        if (currentEvent && (mode === "view" || mode === "edit")) {
            setTitle(currentEvent.title || "");
            setLocation(currentEvent.location || "");
            setDescription(currentEvent.description || "");
            setStartTime(moment(currentEvent.startTime).format("YYYY-MM-DDTHH:mm"));
            setEndTime(moment(currentEvent.endTime).format("YYYY-MM-DDTHH:mm"));
            setIsImportant(!!currentEvent.isImportant);

            // Set selected type based on event type
            const EVENT_TYPES_MAP = {
                "Ngày truyền thống": "1",
                "Hội nghị & Đại hội": "2",
                "Sản xuất kinh doanh": "3",
                "Văn hóa - Đoàn thể": "4"
            };
            setSelectedType(EVENT_TYPES_MAP[currentEvent.type] || "");

            if (currentEvent.participants) {
                const parts = currentEvent.participants.split('@').map(p => p.trim()).filter(p => p);
                const mockGuests = parts.map((p, idx) => ({
                    id: `guest-${idx}`,
                    name: p,
                    initials: p.substring(0, 2).toUpperCase()
                }));
                setSelectedGuests(mockGuests);
                setGuestSearch("");
            } else {
                setSelectedGuests([]);
                setGuestSearch("");
            }
        }
    }, [currentEvent, mode]);

    // Clear form when opening in create mode
    React.useEffect(() => {
        if (isOpen && mode === "create") {
            setTitle("");
            setSelectedType("");
            setStartTime(moment().format("YYYY-MM-DDTHH:mm"));
            setEndTime(moment().add(1, 'hour').format("YYYY-MM-DDTHH:mm"));
            setLocation("");
            setSelectedGuests([]);
            setDescription("");
            setIsImportant(false);
            setErrors({});
        }
    }, [isOpen, mode]);

    React.useEffect(() => {
        if (isOpen) {
            dispatch(fetchUsers({ limit: 100 }));
        }
    }, [dispatch, isOpen]);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setIsTypeOpen(false);
            }
            if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target)) {
                setShowGuestDropdown(false);
            }
            if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
                setIsTimeOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleGuestInputChange = useCallback((e) => {
        const value = e.target.value;
        setGuestSearch(value);
        if (value.includes("@")) {
            setShowGuestDropdown(true);
            const query = value.split("@").pop();
            dispatch(fetchUsers({ limit: 20, name: query }));
        } else if (value === "") {
            setShowGuestDropdown(false);
        }
    }, [dispatch]);

    const handleSearchInDropdown = useCallback((e) => {
        const val = e.target.value;
        setGuestSearch(val);
        dispatch(fetchUsers({ limit: 20, name: val }));
    }, [dispatch]);

    const addGuest = useCallback((user) => {
        const avatarUrl = Array.isArray(user.avatar) && user.avatar.length > 0
            ? user.avatar[0]
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;

        setSelectedGuests([...selectedGuests, {
            id: user.id || user.username,
            name: user.name,
            avatar: avatarUrl,
            role: user.position || "Nhân viên"
        }]);
        setGuestSearch("");
        setShowGuestDropdown(false);
    }, [selectedGuests]);

    const removeGuest = useCallback((id) => {
        setSelectedGuests(selectedGuests.filter(g => g.id !== id));
    }, [selectedGuests]);

    const handleCancel = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!title) newErrors.title = "Tên sự kiện là bắt buộc";
        if (!selectedType) newErrors.type = "Loại sự kiện là bắt buộc";
        if (!location) newErrors.location = "Địa điểm là bắt buộc";
        if (selectedGuests.length === 0) newErrors.guests = "Vui lòng thêm ít nhất 1 khách mời";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.warning("Vui lòng điền đầy đủ các thông tin bắt buộc!");
            return;
        }

        if (isTimeInverted) {
            toast.error("Thời gian bắt đầu phải trước thời gian kết thúc!");
            return;
        }

        setErrors({});

        const typeLabel = EVENT_TYPES.find(t => t.id === selectedType)?.label || "";
        const participantsStr = selectedGuests.map(g => `@${g.name}`).join(" ");

        const payload = {
            title,
            type: typeLabel,
            startTime: moment(startTime).toISOString(),
            endTime: moment(endTime).toISOString(),
            location,
            participants: participantsStr,
            description,
            isImportant,
            status: 1
        };

        try {
            if (mode === "edit") {
                await dispatch(updateEventCalendar({ id: eventId || currentEvent?.id || currentEvent?._id, payload })).unwrap();
                toast.success("Cập nhật sự kiện thành công!");
            } else {
                await dispatch(createEventCalendar(payload)).unwrap();
                toast.success("Tạo sự kiện thành công!");
            }
            window.dispatchEvent(new CustomEvent('RELOAD_NOTIFICATIONS'));
            onClose();
            if (mode !== "edit") {
                setTitle("");
                setSelectedType("");
                setStartTime(moment().format("YYYY-MM-DDTHH:mm"));
                setEndTime(moment().add(1, 'hour').format("YYYY-MM-DDTHH:mm"));
                setLocation("");
                setSelectedGuests([]);
                setDescription("");
                setIsImportant(false);
            }
        } catch (error) {
            toast.error(error || `Không thể ${mode === "edit" ? "cập nhật" : "tạo"} sự kiện!`);
        }
    }, [title, selectedType, startTime, endTime, selectedGuests, location, description, isImportant, dispatch, onClose, isTimeInverted, mode, eventId, currentEvent]);

    const handleTitleChange = useCallback((e) => setTitle(e.target.value), []);
    const handleLocationChange = useCallback((e) => setLocation(e.target.value), []);
    const handleDescriptionChange = useCallback((e) => setDescription(e.target.value), []);
    const handleStartTimeChange = useCallback((e) => setStartTime(e.target.value), []);
    const handleEndTimeChange = useCallback((e) => setEndTime(e.target.value), []);
    const handleIsImportantChange = useCallback((val) => () => mode !== "view" && setIsImportant(val), [mode]);
    const handleToggleType = useCallback(() => mode !== "view" && setIsTypeOpen(!isTypeOpen), [mode, isTypeOpen]);
    const handleToggleTime = useCallback(() => mode !== "view" && setIsTimeOpen(!isTimeOpen), [mode, isTimeOpen]);
    const handleCloseTime = useCallback(() => setIsTimeOpen(false), []);
    const handleFocusGuestInput = useCallback(() => guestInputRef.current?.focus(), []);

    const handleSelectTypeClick = useCallback((e) => {
        const { id } = e.currentTarget.dataset;
        setSelectedType(id);
        setIsTypeOpen(false);
    }, []);

    const handleRemoveGuestClick = useCallback((e) => {
        e.stopPropagation();
        const { id } = e.currentTarget.dataset;
        removeGuest(id);
    }, [removeGuest]);

    const handleAddGuestClick = useCallback((e) => {
        const { id } = e.currentTarget.dataset;
        // Search in userList for the matching user by id or username
        const user = userList.find(u => (u.id || u.username)?.toString() === id);
        if (user) {
            addGuest(user);
        }
    }, [addGuest, userList]);

    const EVENT_ICONS = useMemo(() => ({
        "1": (
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.41667 6.25C3.44421 6.25 2.51158 6.63631 1.82394 7.32394C1.13631 8.01158 0.75 8.94421 0.75 9.91667V15.4167C0.75 15.9029 0.943154 16.3692 1.28697 16.713C1.63079 17.0568 2.0971 17.25 2.58333 17.25H15.4167C15.9029 17.25 16.3692 17.0568 16.713 16.713C17.0568 16.3692 17.25 15.9029 17.25 15.4167V9.91667C17.25 8.94421 16.8637 8.01158 16.1761 7.32394C15.4884 6.63631 14.5558 6.25 13.5833 6.25M4.41667 6.25H13.5833M4.41667 6.25V3.5M13.5833 6.25V3.5M9 3.5V6.25M9 0.75H9.00917M4.41667 0.75H4.42583M13.5833 0.75H13.5925" stroke="url(#paint0_l1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0.75 9.91602C0.75 10.8327 1.3 12.666 3.5 12.666C5.7 12.666 6.25 10.8327 6.25 9.91602C6.25 10.8327 6.8 12.666 9 12.666C11.2 12.666 11.75 10.8327 11.75 9.91602C11.75 10.8327 12.3 12.666 14.5 12.666C16.7 12.666 17.25 10.8327 17.25 9.91602" stroke="url(#paint1_l1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="paint0_l1" x1="9" y1="0.75" x2="9" y2="17.25" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
                    <linearGradient id="paint1_l1" x1="9" y1="9.91602" x2="9" y2="12.666" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
                </defs>
            </svg>
        ),
        "2": (
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.32 7.27626C18.0109 8.44949 18.3618 9.79187 18.3332 11.1532C18.3046 12.5144 17.8977 13.8409 17.1581 14.9841C16.4185 16.1273 15.3753 17.0421 14.1454 17.6261C12.9154 18.2101 11.5472 18.4403 10.1938 18.2909M4.68279 14.7269C3.99182 13.5537 3.641 12.2113 3.66959 10.85C3.69817 9.48876 4.10504 8.16229 4.84465 7.0191C5.58426 5.87591 6.62742 4.96111 7.85739 4.37709C9.08736 3.79307 10.4556 3.56287 11.809 3.71226" stroke="url(#paint0_l2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.8872 7.11174C15.6032 7.8277 16.764 7.8277 17.48 7.11174C18.1959 6.39578 18.1959 5.23498 17.48 4.51902C16.764 3.80306 15.6032 3.80306 14.8872 4.51902C14.1713 5.23498 14.1713 6.39578 14.8872 7.11174Z" stroke="url(#paint1_l2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.51614 17.4828C5.2321 18.1988 6.3929 18.1988 7.10886 17.4828C7.82482 16.7669 7.82482 15.6061 7.10886 14.8901C6.3929 14.1742 5.2321 14.1742 4.51614 14.8901C3.80018 15.6061 3.80018 16.7669 4.51614 17.4828Z" stroke="url(#paint2_l2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.70364 12.2973C10.4196 13.0133 11.5804 13.0133 12.2964 12.2973C13.0123 11.5813 13.0123 10.4205 12.2964 9.70457C11.5804 8.9886 10.4196 8.9886 9.70364 9.70457C8.98768 10.4205 8.98768 11.5813 9.70364 12.2973Z" stroke="url(#paint3_l2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="paint0_l2" x1="11.0014" y1="3.66797" x2="11.0014" y2="18.3352" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
                    <linearGradient id="paint1_l2" x1="17.48" y1="4.51902" x2="14.8872" y2="7.11174" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
                    <linearGradient id="paint2_l2" x1="7.10886" y1="14.8901" x2="4.51614" y2="17.4828" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
                    <linearGradient id="paint3_l2" x1="12.2964" y1="9.70457" x2="9.70364" y2="12.2973" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
                </defs>
            </svg>
        ),
        "3": (
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.4167 14.6667L19.25 11L15.5833 10.1851M15.5833 10.1851L11 9.16667M15.5833 10.1851L16.5 5.5H12.8333M11 9.16667V13.75M11 9.16667L6.41667 10.1851M6.41667 10.1851L2.75 11L4.58333 14.6667M6.41667 10.1851L5.5 5.5H9.16667M9.16667 5.5V2.75H12.8333V5.5M9.16667 5.5H12.8333M2.75 18.3333L3.89125 17.8768C4.24607 17.7349 4.63008 17.6815 5.01016 17.7211C5.39023 17.7607 5.75497 17.8922 6.07292 18.1042C6.54852 18.4213 7.1232 18.5547 7.68987 18.4795C8.25653 18.4042 8.77652 18.1256 9.15292 17.6953L9.185 17.6587C9.41128 17.3998 9.6903 17.1924 10.0033 17.0503C10.3164 16.9081 10.6562 16.8346 11 16.8346C11.3438 16.8346 11.6836 16.9081 11.9967 17.0503C12.3097 17.1924 12.5887 17.3998 12.815 17.6587L12.848 17.6953C13.2244 18.1256 13.7444 18.4042 14.3111 18.4795C14.8777 18.5547 15.4524 18.4213 15.928 18.1042C16.2459 17.8922 16.6107 17.7607 16.9908 17.7211C17.3708 17.6815 17.7548 17.7349 18.1097 17.8768L19.25 18.3333" stroke="url(#paint0_l3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="paint0_l3" x1="11" y1="2.75" x2="11" y2="18.5" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
                </defs>
            </svg>
        ),
        "4": (
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.9987 14.6673C14.5425 14.6673 17.4154 11.7945 17.4154 8.25065C17.4154 4.70682 14.5425 1.83398 10.9987 1.83398C7.45487 1.83398 4.58203 4.70682 4.58203 8.25065C4.58203 11.7945 7.45487 14.6673 10.9987 14.6673Z" stroke="url(#paint0_linear_modal_vhdt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.41406 12.834V18.5485C6.41419 18.7106 6.45731 18.8698 6.53901 19.0098C6.62072 19.1498 6.7381 19.2656 6.87917 19.3455C7.02025 19.4253 7.17998 19.4664 7.34208 19.4644C7.50417 19.4623 7.66284 19.4174 7.8019 19.3341L10.5262 17.7006C10.6686 17.6153 10.8314 17.5702 10.9974 17.5702C11.1634 17.5702 11.3262 17.6153 11.4686 17.7006L14.1929 19.3341C14.332 19.4174 14.4906 19.4623 14.6527 19.4644C14.8148 19.4664 14.9745 19.4253 15.1156 19.3455C15.2567 19.2656 15.3741 19.1498 15.4558 19.0098C15.5375 18.8698 15.5806 18.7106 15.5807 18.5485V12.834" stroke="url(#paint1_linear_modal_vhdt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                    <linearGradient id="paint0_linear_modal_vhdt" x1="10.9987" y1="1.83398" x2="10.9987" y2="14.6673" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FF9C39"/>
                        <stop offset="1" stopColor="#FFBB44"/>
                    </linearGradient>
                    <linearGradient id="paint1_linear_modal_vhdt" x1="10.9974" y1="12.834" x2="10.9974" y2="19.4644" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FF9C39"/>
                        <stop offset="1" stopColor="#FFBB44"/>
                    </linearGradient>
                </defs>
            </svg>
        )
    }), []);

    if (!isOpen) return null;

    return (
        <S.ModalWrapper>
            <div className="cem-overlay">
            <div className="cem-modal-card">
                <button className="cem-close-btn" onClick={handleCancel}>
                    <X size={20} />
                </button>

                <div className="cem-header">
                    <div className="cem-icon-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="12" cy="12" r="5" />
                        </svg>
                    </div>
                    <h2 className="cem-title">
                        {mode === "view" ? "Chi tiết sự kiện" : (mode === "edit" ? "Chỉnh sửa sự kiện" : "Tạo lịch mới")}
                    </h2>
                </div>

                <form className="cem-form" onSubmit={handleSubmit}>
                    <div className="cem-form-group">
                        <label>Tên sự kiện</label>
                        <input
                            className="cem-input highlight"
                            type="text"
                            placeholder="Nhập tên sự kiện, công việc..."
                            value={title}
                            onChange={handleTitleChange}
                            disabled={mode === "view"}
                        />
                    </div>

                    <div className="cem-form-group">
                        <label>Loại</label>
                        <div className="cem-custom-select-container" ref={typeDropdownRef}>
                            <div
                                className="cem-custom-select-trigger"
                                data-open={isTypeOpen}
                                data-disabled={mode === "view"}
                                onClick={handleToggleType}
                            >
                                <div className="cem-trigger-content">
                                    <div className="cem-field-icon-inline">
                                        {EVENT_ICONS[selectedType] || (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                <circle cx="12" cy="12" r="4" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="cem-selected-text" data-placeholder={!selectedType}>
                                        {EVENT_TYPES.find(t => t.id === selectedType)?.label || "Chọn loại sự kiện..."}
                                    </span>
                                </div>
                                <span className="cem-chevron" data-rotate={isTypeOpen}>
                                    <ChevronDown size={18} />
                                </span>
                            </div>

                            {isTypeOpen && (
                                <div className="cem-custom-dropdown">
                                    {EVENT_TYPES.map((type) => (
                                        <div
                                            key={type.id}
                                            className="cem-custom-option"
                                            data-selected={selectedType === type.id}
                                            data-id={type.id}
                                            onClick={handleSelectTypeClick}
                                        >
                                            <div className="cem-option-icon">
                                                {EVENT_ICONS[type.id]}
                                            </div>
                                            <span className="cem-option-label">{type.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="cem-form-group">
                        <label>Quan trọng</label>
                        <div className="cem-radio-group">
                            <label className="cem-radio-item" data-disabled={mode === "view"} onClick={handleIsImportantChange(true)}>
                                <input 
                                    type="radio" 
                                    name="isImportant" 
                                    checked={isImportant === true} 
                                    readOnly 
                                    disabled={mode === "view"}
                                />
                                <span>Có</span>
                            </label>
                            <label className="cem-radio-item" data-disabled={mode === "view"} onClick={handleIsImportantChange(false)}>
                                <input 
                                    type="radio" 
                                    name="isImportant" 
                                    checked={isImportant === false} 
                                    readOnly 
                                    disabled={mode === "view"}
                                />
                                <span>Không</span>
                            </label>
                        </div>
                    </div>

                    <div className="cem-form-group">
                        <label>Thời gian</label>
                        <div className="cem-time-range-container" ref={timeDropdownRef}>
                            <div
                                className={"cem-custom-select-trigger" + (isTimeInverted ? " cem-trigger-error" : "")}
                                data-open={isTimeOpen}
                                data-disabled={mode === "view"}
                                onClick={handleToggleTime}
                            >
                                <div className="cem-trigger-content">
                                    <span className="cem-field-icon-inline">
                                        <Calendar size={18} />
                                    </span>
                                    <span className="cem-selected-text">
                                        {moment(startTime).format("DD/MM/YYYY HH:mm")} - {moment(endTime).format("DD/MM/YYYY HH:mm")}
                                    </span>
                                </div>
                                <span className="cem-chevron" data-rotate={isTimeOpen}>
                                    <ChevronDown size={18} />
                                </span>
                            </div>

                            {isTimeOpen && (
                                <div className="cem-time-dropdown">
                                    <div className="cem-time-picker-row">
                                        <div className="cem-time-field">
                                            <label>Bắt đầu</label>
                                            <input
                                                type="datetime-local"
                                                value={startTime}
                                                onChange={handleStartTimeChange}
                                            />
                                        </div>
                                        <div className="cem-time-field">
                                            <label>Kết thúc</label>
                                            <input
                                                type="datetime-local"
                                                value={endTime}
                                                onChange={handleEndTimeChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="cem-time-dropdown-footer">
                                        <button type="button" onClick={handleCloseTime}>Xác nhận</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="cem-form-group">
                        <label>Địa điểm</label>
                        <div className="cem-input-wrapper">
                            <div className="cem-input-with-icon">
                                <span className="cem-field-icon">
                                    <MapPin size={18} />
                                </span>
                                <input
                                    className="cem-input"
                                    type="text"
                                    placeholder="Nhập địa điểm diễn ra..."
                                    value={location}
                                    onChange={handleLocationChange}
                                    disabled={mode === "view"}
                                />
                            </div>
                            {errors.location && <div className="cem-error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.location}</div>}
                        </div>
                    </div>

                    <div className="cem-form-group align-top">
                        <label>Khách mời</label>
                        <div className="cem-input-wrapper">
                            <div className="cem-tag-input-container" ref={guestDropdownRef}>
                                <div className="cem-tag-input-wrapper" onClick={handleFocusGuestInput}>
                                    {selectedGuests.map(guest => (
                                        <div key={guest.id} className="cem-guest-chip">
                                            <div className="cem-guest-chip-content">
                                                <div className="cem-guest-avatar">{guest.initials || "U"}</div>
                                                <span>{guest.name}</span>
                                            </div>
                                            {mode !== "view" && (
                                                <button 
                                                    type="button" 
                                                    data-id={guest.id}
                                                    onClick={handleRemoveGuestClick}
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {mode !== "view" && (
                                        <input
                                            ref={guestInputRef}
                                            className="cem-guest-input"
                                            type="text"
                                            placeholder={selectedGuests.length === 0 ? "Nhập @ để tag khách mời..." : ""}
                                            value={guestSearch}
                                            onChange={handleGuestInputChange}
                                        />
                                    )}
                                </div>
                                {showGuestDropdown && (
                                    <div className="cem-guest-suggestions">
                                        <div className="cem-suggestion-search">
                                            <List size={14} />
                                            <input
                                                type="text"
                                                placeholder="Tìm kiếm khách mời..."
                                                value={guestSearch}
                                                onChange={handleSearchInDropdown}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="cem-suggestion-list">
                                            {userList.filter(user => !selectedGuests.some(g => g.id === user.id || g.id === user.username)).length > 0 ? (
                                                userList
                                                    .filter(user => !selectedGuests.some(g => g.id === user.id || g.id === user.username))
                                                    .slice(0, 20).map(user => {
                                                        const avatarUrl = Array.isArray(user.avatar) && user.avatar.length > 0
                                                            ? user.avatar[0]
                                                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
                                                        return (
                                                            <div 
                                                                key={user.id} 
                                                                className="cem-suggestion-item" 
                                                                data-id={user.id || user.username}
                                                                onClick={handleAddGuestClick}
                                                            >
                                                                <AuthImage src={avatarUrl} alt="" />
                                                                <div className="suggestion-info">
                                                                    <span className="name">{user.name}</span>
                                                                    <span className="role">{user.position || "Nhân viên"}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            ) : (
                                                <div className="no-users">
                                                    {userLoading ? "Đang tìm kiếm..." : (userList.length > 0 ? "Tất cả khách mời phù hợp đã được thêm" : "Không tìm thấy người dùng")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {errors.guests && <div className="cem-error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.guests}</div>}
                        </div>
                    </div>

                    <div className="cem-form-group align-top">
                        <label>Ghi chú</label>
                        <textarea
                            className="cem-input cem-textarea"
                            placeholder=""
                            value={description}
                            onChange={handleDescriptionChange}
                            disabled={mode === "view"}
                        ></textarea>
                    </div>

                    <div className="cem-footer">
                        <div className="cem-footer-right">
                            <button type="button" className="cem-btn cem-btn-secondary" onClick={handleCancel}>{mode === "view" ? "Đóng" : "Hủy"}</button>
                            {mode === "create" && <button type="submit" className="cem-btn cem-btn-primary">Thêm</button>}
                            {mode === "edit" && <button type="submit" className="cem-btn cem-btn-primary">Cập nhật</button>}
                        </div>
                    </div>
                </form>
            </div>

            </div>
        </S.ModalWrapper>
    );
}
