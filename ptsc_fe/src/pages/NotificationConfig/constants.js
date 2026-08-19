export const MODULE_MAP = {
  VIEW_TASK: { name: "Công việc", color: "#f59e0b", bgColor: "#fffbeb" },
  VIEW_MEETING_ROOM: { name: "Lịch họp", color: "#ec4899", bgColor: "#fdf2f8" },
  VIEW_UTILITY: { name: "Tiện ích", color: "#6366f1", bgColor: "#eef2ff" },
  VIEW_NEWS: { name: "Tin tức", color: "#6b7280", bgColor: "#f3f4f6" },
  VIEW_OUTCOMING_DOC: { name: "Văn bản đi", color: "#3b82f6", bgColor: "#eff6ff" },
  VIEW_INCOMING_DOC: { name: "Văn bản đến", color: "#10b981", bgColor: "#ecfdf5" },
  VIEW_RECORD_EXPLOITATION: { name: "Hồ sơ lưu trữ", color: "#8b5cf6", bgColor: "#f5f3ff" },
};

export const getModuleInfo = (moduleKey) => {
  return MODULE_MAP[moduleKey] || { name: moduleKey || "Khác", color: "#6b7280", bgColor: "#f3f4f6" };
};


export const NotificationGroup = Object.freeze({
  PROCESS: 'PROCESS', // Xử lý
  RECEIVE: 'RECEIVE', // Nhận
  UNGROUPED: 'UNGROUPED', // Chưa phân nhóm
});