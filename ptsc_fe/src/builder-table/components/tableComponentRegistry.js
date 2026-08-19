import { lazy } from 'react';

const LeadershipDutyScheduleCalendar = lazy(() => import("@pages/LeadershipDutyScheduleCalendar"));
const LeadershipSchedule = lazy(() => import("@pages/LeadershipSchedule"));
const MeetingCalendar = lazy(() => import("@pages/MeetingCalendar"));
const MeetingCalendarHasSubmenu = lazy(() => import("@pages/MeetingCalendar/MeetingCalendar"));

// Store global state đơn giản
let globalTableState = {};
const listeners = new Set();

// Hàm cập nhật state (merge với state cũ)
export const setGlobalTableState = (newState) => {
    globalTableState = { ...globalTableState, ...newState };
    // Notify all listeners
    listeners.forEach(listener => listener(globalTableState));
};

// Hàm lấy state hiện tại
export const getGlobalTableState = () => globalTableState;

// Hàm đăng ký nhận thông báo thay đổi (dùng cho useEffect)
export const subscribeGlobalTableState = (listener) => {
    listeners.add(listener);
    // Trả về hàm cleanup
    return () => listeners.delete(listener);
};

/**
 * tableComponents:
 * Danh sách các component hiển thị thay thế cho bảng (table).
 */
export const tableComponents = {
	MEETING_CALENDAR: {
		component: MeetingCalendar,
		title: "Lịch họp",
		dialogKey: "meetingCalendar",
		defaultProps: {},
	},
	LEADERSHIP_DUTY_SCHEDULE: {
		component: LeadershipDutyScheduleCalendar,
		title: "Lịch trực ban lãnh đạo",
		dialogKey: "leadershipDutySchedule",
		defaultProps: {},
	},
	LEADERSHIP_DUTY_SCHEDULE_HAS_SUBMENU: {
		component: MeetingCalendarHasSubmenu,
		title: "Lịch họp (có subTab)",
		dialogKey: "leadershipDutyScheduleHasSubmenu",
		defaultProps: {
			hasSubmenu: true,
		},
	},
	LEADERSHIP_SCHEDULE: {
		component: LeadershipSchedule,
		title: "Lịch ban lãnh đạo",
		dialogKey: "leadershipSchedule",
		defaultProps: { 
			hideSearch: true,
		},
	},

};

export const getTableComponentByKey = (key) => {
	return tableComponents[key];
};
