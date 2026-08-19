export enum NotificationKey {
  VIEW_RECORD_EXPLOITATION = 'VIEW_RECORD_EXPLOITATION',
  VIEW_INCOMING_DOC = 'VIEW_INCOMING_DOC',
  VIEW_OUTCOMING_DOC = 'VIEW_OUTCOMING_DOC',
  VIEW_TASK = 'VIEW_TASK',
  STAT_CARD_DETAIL_DIALOG = 'STAT_CARD_DETAIL_DIALOG',
  VIEW_MEETING_DOC = 'VIEW_MEETING_DOC',
  VIEW_MEETING_ROOM = 'VIEW_MEETING_ROOM',
  VIEW_NEWS = 'VIEW_NEWS',
  VIEW_NEWS_COMMENT = 'VIEW_NEWS_COMMENT',
  VIEW_PASSPORT_LIST = 'VIEW_PASSPORT_LIST',
  VIEW_PASSPORT_RETURN_SLIP = 'VIEW_PASSPORT_RETURN_SLIP',
  VIEW_NEW_REQUEST = 'VIEW_NEW_REQUEST',
  VIEW_TASK_APPROVAL = 'VIEW_TASK_APPROVAL',
  VIEW_TASK_ADJUSTMENT = 'VIEW_TASK_ADJUSTMENT',
  VIEW_PROJECT = 'VIEW_PROJECT',
  TASK_APPROVAL_REJECTED = 'TASK_APPROVAL_REJECTED',
  TASK_APPROVAL_APPROVED = 'TASK_APPROVAL_APPROVED',
  TASK_ADJUSTMENT_REJECTED = 'TASK_ADJUSTMENT_REJECTED',
  VIEW_PASSPORT_BORROW_REQUEST = 'VIEW_PASSPORT_BORROW_REQUEST',
  BOOK_ASSIGNED = 'BOOK_ASSIGNED',
  VIEW_APPROVE = 'VIEW_APPROVE',
  VIEW_NEWS_DXB = 'VIEW_NEWS_DXB',
  VIEW_NEWS_REJECT = 'VIEW_NEWS_REJECT',
  VIEW_NEWS_CANCELLED = 'VIEW_NEWS_CANCELLED',
  VIEW_RECALL = 'VIEW_RECALL',
  NEWS_CALENDAR_TAG = 'NEWS_CALENDAR_TAG',
  VIEW_PROCESSING_SCHEDULE = 'VIEW_PROCESSING_SCHEDULE',
  VIEW_APPROVAL_REQUEST = 'VIEW_APPROVAL_REQUEST',
  VIEW_JOB_TO_DOCUMENT = 'VIEW_JOB_TO_DOCUMENT',
  VIEW_JOB_TO_MEETING = 'VIEW_JOB_TO_MEETING',
  VIEW_JOB_PROJECT = 'VIEW_JOB_PROJECT',
  NEWS_DETAIL_VIEW = 'NEWS_DETAIL_VIEW',
}

export const MAIN_NOTIFICATION_KEYS: NotificationKey[] = [
  NotificationKey.VIEW_INCOMING_DOC,
  NotificationKey.VIEW_OUTCOMING_DOC,
  NotificationKey.VIEW_TASK,
  NotificationKey.STAT_CARD_DETAIL_DIALOG,
  NotificationKey.VIEW_MEETING_DOC,
  NotificationKey.VIEW_MEETING_ROOM,
  NotificationKey.VIEW_NEWS,
  NotificationKey.VIEW_NEWS_COMMENT,
  NotificationKey.NEWS_DETAIL_VIEW,
  NotificationKey.VIEW_NEWS_DXB,
  NotificationKey.VIEW_NEWS_REJECT,
  NotificationKey.VIEW_NEWS_CANCELLED,
  NotificationKey.VIEW_PASSPORT_LIST,
  NotificationKey.VIEW_PASSPORT_RETURN_SLIP,
  NotificationKey.VIEW_NEW_REQUEST,
  NotificationKey.VIEW_TASK_APPROVAL,
  NotificationKey.VIEW_TASK_ADJUSTMENT,
  NotificationKey.VIEW_PROJECT,
  NotificationKey.TASK_APPROVAL_REJECTED,
  NotificationKey.TASK_APPROVAL_APPROVED,
  NotificationKey.TASK_ADJUSTMENT_REJECTED,
  NotificationKey.VIEW_PASSPORT_BORROW_REQUEST,
  NotificationKey.VIEW_APPROVAL_REQUEST,
  NotificationKey.VIEW_JOB_TO_DOCUMENT,
  NotificationKey.VIEW_JOB_TO_MEETING,
  NotificationKey.VIEW_JOB_PROJECT,
];

export enum NotificationGroup {
  PROCESS = 'PROCESS', // Xử lý
  RECEIVE = 'RECEIVE', // Nhận
  UNGROUPED = 'UNGROUPED', // Chưa phân nhóm
}

export const NotificationGroupInfo = {
  [NotificationGroup.PROCESS]: {
    value: NotificationGroup.PROCESS,
    name: 'Xử lý',
    description: 'Nhóm xử lý',
  },
  [NotificationGroup.RECEIVE]: {
    value: NotificationGroup.RECEIVE,
    name: 'Nhận',
    description: 'Nhóm nhận',
  },
  [NotificationGroup.UNGROUPED]: {
    value: NotificationGroup.UNGROUPED,
    name: 'Chưa phân nhóm',
    description: 'Nhóm chưa phân nhóm',
  },
} as const;

// Alias để tương thích với cấu trúc của entity
export type EnumGroup = NotificationGroup;
export const EnumGroup = NotificationGroup;

export const NotificationType = {
  // CÔNG VIỆC
  TASK_STATUS_CHANGED: {
    value: 'TASK_STATUS_CHANGED',
    name: 'Chuyển trạng thái công việc',
    description: 'Thông báo khi chuyển trạng thái công việc',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_OVERDUE_REASON_REQUIRED: {
    value: 'TASK_OVERDUE_REASON_REQUIRED',
    name: 'Yêu cầu cập nhật lý do công việc trễ hạn',
    description: 'Thông báo khi người phụ trách cần cập nhật lý do cho công việc trễ hạn',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PROJECT_STATUS_CHANGED: {
    value: 'PROJECT_STATUS_CHANGED',
    name: 'Chuyển trạng thái Dự án',
    description: 'Thông báo khi chuyển trạng thái Dự án',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  // ADDED_TO_NEW_TASK: {
  //   value: 'ADDED_TO_NEW_TASK',
  //   name: 'Được thêm vào công việc mới',
  //   description: 'Thông báo khi được thêm vào công việc mới',
  //   defaultGroups: [NotificationGroup.PROCESS],
  // },
  ADDED_TO_NEW_TASK_MEMBER: {
    value: 'ADDED_TO_NEW_TASK_MEMBER',
    name: 'Được thêm vào công việc mới(Vai trò người xử lý)',
    description: 'Thông báo khi được thêm vào thành viên công việc mới',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  ADDED_TO_NEW_TASK_VIEWER: {
    value: 'ADDED_TO_NEW_TASK_VIEWER',
    name: 'Được thêm vào công việc mới(Vai trò người xem)',
    description: 'Thông báo khi được thêm vào người xem công việc mới',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  // ADDED_TO_NEW_PROJECT: {
  //   value: 'ADDED_TO_NEW_PROJECT',
  //   name: 'Được thêm vào dự án mới',
  //   description: 'Thông báo khi được thêm vào dự án mới',
  //   defaultGroups: [NotificationGroup.PROCESS],
  // },
  ADDED_TO_NEW_PROJECT_MEMBER: {
    value: 'ADDED_TO_NEW_PROJECT_MEMBER',
    name: 'Được thêm vào dự án mới(Vai trò người xử lý)',
    description: 'Thông báo khi được thêm vào thành viên dự án mới',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  ADDED_TO_NEW_PROJECT_VIEWER: {
    value: 'ADDED_TO_NEW_PROJECT_VIEWER',
    name: 'Được thêm vào dự án mới(Vai trò người xem)',
    description: 'Thông báo khi được thêm vào người xem dự án mới',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  REMOVED_FROM_TASK: {
    value: 'REMOVED_FROM_TASK',
    name: 'Bị gỡ khỏi công việc',
    description: 'Thông báo khi bị gỡ khỏi công việc',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  REMOVED_FROM_PROJECT: {
    value: 'REMOVED_FROM_PROJECT',
    name: 'Bị gỡ khỏi dự án',
    description: 'Thông báo khi bị gỡ khỏi dự án',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_NEW_COMMENT: {
    value: 'TASK_NEW_COMMENT',
    name: 'Bình luận mới trong công việc',
    description: 'Thông báo khi có bình luận mới trong công việc',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_RESULT_APPROVAL_REQUESTED_PROCESSOR: {
    value: 'TASK_RESULT_APPROVAL_REQUESTED_PROCESSOR',
    name: 'Gửi yêu cầu phê duyệt kết quả công việc(Vai trò xử lý)',
    description: 'Thông báo khi gửi yêu cầu phê duyệt kết quả công việc(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_RESULT_APPROVAL_REQUESTED_VIEWER: {
    value: 'TASK_RESULT_APPROVAL_REQUESTED_VIEWER',
    name: 'Gửi yêu cầu phê duyệt kết quả công việc(Vai trò Người xem)',
    description: 'Thông báo khi gửi yêu cầu phê duyệt kết quả công việc(Vai trò Người xem)',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_ADJUSTMENT_APPROVAL_REQUESTED_PROCESSOR: {
    value: 'TASK_ADJUSTMENT_APPROVAL_REQUESTED_PROCESSOR',
    name: 'Gửi yêu cầu phê duyệt điều chỉnh công việc(Vai trò xử lý)',
    description: 'Thông báo khi gửi yêu cầu phê duyệt điều chỉnh công việc(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_ADJUSTMENT_APPROVAL_REQUESTED_VIEWER: {
    value: 'TASK_ADJUSTMENT_APPROVAL_REQUESTED_VIEWER',
    name: 'Gửi yêu cầu phê duyệt điều chỉnh công việc(Vai trò Người xem)',
    description: 'Thông báo khi gửi yêu cầu phê duyệt điều chỉnh công việc(Vai trò Người xem)',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_RESULT_APPROVED_PROCESSOR: {
    value: 'TASK_RESULT_APPROVED_PROCESSOR',
    name: 'Kết quả công việc được phê duyệt(Vai trò xử lý)',
    description: 'Thông báo khi kết quả công việc được phê duyệt(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_RESULT_APPROVED_VIEWER: {
    value: 'TASK_RESULT_APPROVED_VIEWER',
    name: 'Kết quả công việc được phê duyệt(Vai trò Người xem)',
    description: 'Thông báo khi kết quả công việc được phê duyệt(Vai trò Người xem)',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_RESULT_REJECTED_PROCESSOR: {
    value: 'TASK_RESULT_REJECTED_PROCESSOR',
    name: 'Kết quả công việc bị từ chối(Vai trò xử lý)',
    description: 'Thông báo khi kết quả công việc bị từ chối(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_RESULT_REJECTED_VIEWER: {
    value: 'TASK_RESULT_REJECTED_VIEWER',
    name: 'Kết quả công việc bị từ chối(Vai trò Người xem)',
    description: 'Thông báo khi kết quả công việc bị từ chối(Vai trò Người xem)',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_ADJUSTMENT_APPROVED_PROCESSOR: {
    value: 'TASK_ADJUSTMENT_APPROVED_PROCESSOR',
    name: 'Điều chỉnh công việc được phê duyệt(Vai trò xử lý)',
    description: 'Thông báo khi điều chỉnh công việc được phê duyệt(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_ADJUSTMENT_APPROVED_VIEWER: {
    value: 'TASK_ADJUSTMENT_APPROVED_VIEWER',
    name: 'Điều chỉnh công việc được phê duyệt(Vai trò Người xem)',
    description: 'Thông báo khi điều chỉnh công việc được phê duyệt(Vai trò Người xem)',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_ADJUSTMENT_REJECTED_PROCESSOR: {
    value: 'TASK_ADJUSTMENT_REJECTED_PROCESSOR',
    name: 'Điều chỉnh công việc bị từ chối(Vai trò xử lý)',
    description: 'Thông báo khi điều chỉnh công việc bị từ chối(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_ADJUSTMENT_REJECTED_VIEWER: {
    value: 'TASK_ADJUSTMENT_REJECTED_VIEWER',
    name: 'Điều chỉnh công việc bị từ chối(Vai trò Người xem)',
    description: 'Thông báo khi điều chỉnh công việc bị từ chối(Vai trò Người xem)',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_RESULT_APPROVAL_REQUESTED: {
    value: 'TASK_RESULT_APPROVAL_REQUESTED_PROCESSOR',
    name: 'Gửi yêu cầu phê duyệt kết quả công việc(Vai trò xử lý)',
    description: 'Thông báo khi gửi yêu cầu phê duyệt kết quả công việc(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_ADJUSTMENT_APPROVAL_REQUESTED: {
    value: 'TASK_ADJUSTMENT_APPROVAL_REQUESTED_PROCESSOR',
    name: 'Gửi yêu cầu phê duyệt điều chỉnh công việc(Vai trò xử lý)',
    description: 'Thông báo khi gửi yêu cầu phê duyệt điều chỉnh công việc(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_RESULT_APPROVED: {
    value: 'TASK_RESULT_APPROVED_PROCESSOR',
    name: 'Kết quả công việc được phê duyệt(Vai trò xử lý)',
    description: 'Thông báo khi kết quả công việc được phê duyệt(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_RESULT_REJECTED: {
    value: 'TASK_RESULT_REJECTED_PROCESSOR',
    name: 'Kết quả công việc bị từ chối(Vai trò xử lý)',
    description: 'Thông báo khi kết quả công việc bị từ chối(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_ADJUSTMENT_APPROVED: {
    value: 'TASK_ADJUSTMENT_APPROVED_PROCESSOR',
    name: 'Điều chỉnh công việc được phê duyệt(Vai trò xử lý)',
    description: 'Thông báo khi điều chỉnh công việc được phê duyệt(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_ADJUSTMENT_REJECTED: {
    value: 'TASK_ADJUSTMENT_REJECTED_PROCESSOR',
    name: 'Điều chỉnh công việc bị từ chối(Vai trò xử lý)',
    description: 'Thông báo khi điều chỉnh công việc bị từ chối(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_DUE_SOON_PROCESSOR: {
    value: 'TASK_DUE_SOON_PROCESSOR',
    name: 'Công việc sắp đến hạn(Vai trò xử lý)',
    description: 'Thông báo khi công việc sắp đến hạn(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  TASK_DUE_SOON_VIEWER: {
    value: 'TASK_DUE_SOON_VIEWER',
    name: 'Công việc sắp đến hạn(Vai trò Người xem)',
    description: 'Thông báo khi công việc sắp đến hạn(Vai trò Người xem)',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  PROJECT_DUE_SOON_PROCESSOR: {
    value: 'PROJECT_DUE_SOON_PROCESSOR',
    name: 'Dự án sắp đến hạn(Vai trò xử lý)',
    description: 'Thông báo khi dự án sắp đến hạn(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PROJECT_DUE_SOON_VIEWER: {
    value: 'PROJECT_DUE_SOON_VIEWER',
    name: 'Dự án sắp đến hạn(Vai trò Người xem)',
    description: 'Thông báo khi dự án sắp đến hạn(Vai trò Người xem)',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  TASK_DUE_SOON: {
    value: 'TASK_DUE_SOON_PROCESSOR',
    name: 'Công việc sắp đến hạn(Vai trò xử lý)',
    description: 'Thông báo khi công việc sắp đến hạn(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PROJECT_DUE_SOON: {
    value: 'PROJECT_DUE_SOON_PROCESSOR',
    name: 'Dự án sắp đến hạn(Vai trò xử lý)',
    description: 'Thông báo khi dự án sắp đến hạn(Vai trò xử lý)',
    defaultGroups: [NotificationGroup.PROCESS],
  },

  // LỊCH HỌP
  MEETING_APPROVAL_REQUESTED: {
    value: 'MEETING_APPROVAL_REQUESTED',
    name: 'Gửi duyệt soạn lịch họp',
    description: 'Thông báo khi gửi duyệt soạn lịch họp',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_APPROVED: {
    value: 'MEETING_APPROVED',
    name: 'Lịch họp đã được phê duyệt',
    description: 'Thông báo khi lịch họp đã được phê duyệt',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_REJECTED: {
    value: 'MEETING_REJECTED',
    name: 'Lịch họp không được phê duyệt',
    description: 'Thông báo khi lịch họp không được phê duyệt',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_PUBLISHED: {
    value: 'MEETING_PUBLISHED',
    name: 'Lịch họp được công bố',
    description: 'Thông báo khi lịch họp được công bố',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_INVITATION: {
    value: 'MEETING_INVITATION',
    name: 'Người dùng được mời tham gia cuộc họp',
    description: 'Thông báo khi người dùng được mời tham gia cuộc họp',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_REMOVED: {
    value: 'MEETING_REMOVED',
    name: 'Bạn không còn thuộc danh sách tham dự',
    description: 'Thông báo khi bạn không còn thuộc danh sách tham dự',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_STATUS_CHANGED: {
    value: 'MEETING_STATUS_CHANGED',
    name: 'Chuyển trạng thái lịch họp',
    description: 'Thông báo khi chuyển trạng thái lịch họp',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  MEETING_DOC_NEW_COMMENT: {
    value: 'MEETING_DOC_NEW_COMMENT',
    name: 'Có thảo luận/bình luận trong tài liệu họp',
    description: 'Thông báo khi có thảo luận/bình luận trong tài liệu họp',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  MEETING_PARTICIPANT_AUTHORIZED: {
    value: 'MEETING_PARTICIPANT_AUTHORIZED',
    name: 'Người tham dự ủy quyền tham gia họp',
    description: 'Thông báo khi người tham dự ủy quyền tham gia họp',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_REMINDER_1_DAY: {
    value: 'MEETING_REMINDER_1_DAY',
    name: 'Nhắc họp trước 1 ngày',
    description: 'Thông báo nhắc họp trước 1 ngày',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  MEETING_REMINDER_SOON: {
    value: 'MEETING_REMINDER_SOON',
    name: 'Nhắc họp sắp diễn ra',
    description: 'Thông báo nhắc họp sắp diễn ra',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_UNCONFIRMED_REMINDER: {
    value: 'MEETING_UNCONFIRMED_REMINDER',
    name: 'Nhắc người tham dự chưa xác nhận',
    description: 'Thông báo nhắc người tham dự chưa xác nhận',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_DOC_UNLOADED_REMINDER: {
    value: 'MEETING_DOC_UNLOADED_REMINDER',
    name: 'Nhắc đơn vị/cá nhân chưa tải tài liệu chuẩn bị',
    description: 'Thông báo nhắc đơn vị/cá nhân chưa tải tài liệu chuẩn bị',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  MEETING_INFO_CHANGED: {
    value: 'MEETING_INFO_CHANGED',
    name: 'Thông tin cuộc họp được điều chỉnh',
    description: 'Thông báo khi thông tin cuộc họp đã được điều chỉnh',
    defaultGroups: [NotificationGroup.PROCESS],
  },

  // TIỆN ÍCH - HỘ CHIẾU
  PASSPORT_BORROW_APPROVED: {
    value: 'PASSPORT_BORROW_APPROVED',
    name: '[Hộ chiếu] Phê duyệt yêu cầu mượn hộ chiếu',
    description: 'Thông báo khi phê duyệt yêu cầu mượn hộ chiếu',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PASSPORT_BORROW_FORWARDED: {
    value: 'PASSPORT_BORROW_FORWARDED',
    name: '[Hộ chiếu] Chuyển xử lý yêu cầu mượn hộ chiếu',
    description: 'Thông báo khi chuyển xử lý yêu cầu mượn hộ chiếu',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PASSPORT_BORROW_REJECTED: {
    value: 'PASSPORT_BORROW_REJECTED',
    name: '[Hộ chiếu] Yêu cầu mượn hộ chiếu bị từ chối',
    description: 'Thông báo khi yêu cầu mượn hộ chiếu bị từ chối',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PASSPORT_BORROW_COORDINATED: {
    value: 'PASSPORT_BORROW_COORDINATED',
    name: '[Hộ chiếu] Nhận yêu cầu mượn hộ chiếu được điều phối',
    description: 'Thông báo khi nhận yêu cầu mượn hộ chiếu được điều phối',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PASSPORT_HANDOVER_SIGNED: {
    value: 'PASSPORT_HANDOVER_SIGNED',
    name: '[Hộ chiếu] Ký nhận bàn giao hộ chiếu',
    description: 'Thông báo khi ký nhận bàn giao hộ chiếu',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PASSPORT_RETURN_SIGNED: {
    value: 'PASSPORT_RETURN_SIGNED',
    name: '[Hộ chiếu] Ký nhận phiếu trả hộ chiếu(Thông báo đến chủ hộ chiếu)',
    description: 'Thông báo đến chủ hộ chiếu khi ký nhận phiếu trả hộ chiếu',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PASSPORT_RETURN_REJECTED: {
    value: 'PASSPORT_RETURN_REJECTED',
    name: '[Hộ chiếu] Trả lại phiếu trả hộ chiếu(Thông báo đến QLHC)',
    description: 'Thông báo đến QLHC khi trả lại phiếu trả hộ chiếu',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  PASSPORT_RETURN_COMPLETED: {
    value: 'PASSPORT_RETURN_COMPLETED',
    name: '[Hộ chiếu] Đã trả hộ chiếu(Thông báo đến QLHC)',
    description: 'Thông báo đến QLHC khi đã trả hộ chiếu',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  PASSPORT_EXPIRING_SOON: {
    value: 'PASSPORT_EXPIRING_SOON',
    name: '[Hộ chiếu] Hộ chiếu sắp hết hạn',
    description: 'Thông báo khi hộ chiếu sắp hết hạn',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  PASSPORT_EXPIRED: {
    value: 'PASSPORT_EXPIRED',
    name: '[Hộ chiếu] Hộ chiếu hết hạn',
    description: 'Thông báo khi hộ chiếu hết hạn',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  PASSPORT_EXPIRING_SOON_REMINDER: {
    value: 'PASSPORT_EXPIRING_SOON_REMINDER',
    name: '[Hộ chiếu] Nhắc nhở hộ chiếu sắp hết hạn',
    description: 'Thông báo nhắc nhở hộ chiếu sắp hết hạn',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  PASSPORT_EXPIRED_REMINDER: {
    value: 'PASSPORT_EXPIRED_REMINDER',
    name: '[Hộ chiếu] Nhắc nhở hộ chiếu hết hạn',
    description: 'Thông báo nhắc nhở hộ chiếu hết hạn',
    defaultGroups: [NotificationGroup.RECEIVE],
  },

  // TIỆN ÍCH - PHẢN ÁNH
  FEEDBACK_RECEIVED: {
    value: 'FEEDBACK_RECEIVED',
    name: '[Phản ảnh] Nhận yêu cầu phản ảnh',
    description: 'Thông báo khi nhận yêu cầu phản ảnh',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  FEEDBACK_REJECTED_BY_DEPT: {
    value: 'FEEDBACK_REJECTED_BY_DEPT',
    name: '[Phản ảnh] Yêu cầu bị từ chối do bộ phận chuyên trách',
    description: 'Thông báo khi yêu cầu phản ánh bị từ chối do bộ phận chuyên trách',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  FEEDBACK_COORDINATED: {
    value: 'FEEDBACK_COORDINATED',
    name: '[Phản ảnh] Yêu cầu được điều phối',
    description: 'Thông báo khi yêu cầu phản ảnh được điều phối',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  FEEDBACK_REJECTED_BY_ASSIGNEE: {
    value: 'FEEDBACK_REJECTED_BY_ASSIGNEE',
    name: '[Phản ảnh] Yêu cầu bị từ chối do người xử lý',
    description: 'Thông báo khi yêu cầu bị từ chối do người xử lý',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  FEEDBACK_ACCEPTED: {
    value: 'FEEDBACK_ACCEPTED',
    name: '[Phản ảnh] Yêu cầu được tiếp nhận',
    description: 'Thông báo khi yêu cầu được tiếp nhận',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  FEEDBACK_COMPLETED: {
    value: 'FEEDBACK_COMPLETED',
    name: '[Phản ảnh] Yêu cầu hoàn thành xử lý',
    description: 'Thông báo khi yêu cầu hoàn thành xử lý',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  FEEDBACK_RATED_BY_CREATOR: {
    value: 'FEEDBACK_RATED_BY_CREATOR',
    name: '[Phản ánh] Yêu cầu được đánh giá bởi người tạo',
    description: 'Thông báo khi yêu cầu được đánh giá bởi người tạo',
    defaultGroups: [NotificationGroup.RECEIVE],
  },

  // TIỆN ÍCH - ĐĂNG KÝ XE
  CAR_BOOKING_REQUESTED: {
    value: 'CAR_BOOKING_REQUESTED',
    name: '[Đăng ký xe] Yêu cầu đăng ký xe từ người tạo',
    description: 'Thông báo khi có yêu cầu đăng ký xe từ người tạo',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  CAR_BOOKING_REJECTED_BY_FLEET: {
    value: 'CAR_BOOKING_REJECTED_BY_FLEET',
    name: '[Đăng ký xe] Yêu cầu bị từ chối từ đội xe',
    description: 'Thông báo khi yêu cầu bị từ chối từ đội xe',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  CAR_BOOKING_COORDINATED: {
    value: 'CAR_BOOKING_COORDINATED',
    name: '[Đăng ký xe] Yêu cầu đăng ký xe được điều phối',
    description: 'Thông báo khi yêu cầu đăng ký xe được điều phối',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  CAR_BOOKING_ACCEPTED_BY_DRIVER: {
    value: 'CAR_BOOKING_ACCEPTED_BY_DRIVER',
    name: '[Đăng ký xe] Yêu cầu được tài xế tiếp nhận',
    description: 'Thông báo khi yêu cầu được tài xế tiếp nhận',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  CAR_BOOKING_COMPLETED_BY_FLEET: {
    value: 'CAR_BOOKING_COMPLETED_BY_FLEET',
    name: '[Đăng ký xe] Yêu cầu được hoàn thành bởi Đội xe',
    description: 'Thông báo khi yêu cầu được hoàn thành bởi Đội xe',
    defaultGroups: [NotificationGroup.RECEIVE],
  },

  // TIN TỨC
  NEWS_APPROVAL_REQUESTED: {
    value: 'NEWS_APPROVAL_REQUESTED',
    name: 'Yêu cầu duyệt tin tức',
    description: 'Thông báo khi có yêu cầu duyệt tin tức',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  NEWS_APPROVED: {
    value: 'NEWS_APPROVED',
    name: 'Tin tức được duyệt',
    description: 'Thông báo khi tin tức được duyệt',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  NEWS_RETURNED: {
    value: 'NEWS_RETURNED',
    name: 'Tin tức bị trả lại',
    description: 'Thông báo khi tin tức bị trả lại',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  NEWS_CANCELED: {
    value: 'NEWS_CANCELED',
    name: 'Tin tức bị hủy',
    description: 'Thông báo khi tin tức bị hủy',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  NEWS_APPROVAL_OVERDUE: {
    value: 'NEWS_APPROVAL_OVERDUE',
    name: 'Tin tức quá hạn phê duyệt',
    description: 'Thông báo khi tin tức quá hạn phê duyệt',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  NEWS_LIKED: {
    value: 'NEWS_LIKED',
    name: 'Người đọc tim tin tức',
    description: 'Thông báo khi người đọc tim tin tức',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  NEWS_COMMENTED: {
    value: 'NEWS_COMMENTED',
    name: 'Người đọc tin bình luận / góp ý',
    description: 'Thông báo khi người đọc tin bình luận hoặc đóng góp ý kiến',
    defaultGroups: [NotificationGroup.PROCESS, NotificationGroup.RECEIVE],
  },
  NEWS_FEEDBACK: {
    value: 'NEWS_FEEDBACK',
    name: 'Góp ý tin tức',
    description: 'Thông báo khi có góp ý tin tức',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  NEWS_RECALLED: {
    value: 'NEWS_RECALLED',
    name: 'Tin tức bị thu hồi',
    description: 'Thông báo khi tin tức bị thu hồi',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  NEWS_MENTIONED_IN_COMMENT: {
    value: 'NEWS_MENTIONED_IN_COMMENT',
    name: 'Được nhắc đến trong bình luận',
    description: 'Thông báo khi được nhắc đến trong bình luận',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  EVENT_INVITATION: {
    value: 'EVENT_INVITATION',
    name: 'Người dùng được mời tham gia sự kiện',
    description: 'Thông báo khi người dùng được mời tham gia sự kiện',
    defaultGroups: [NotificationGroup.RECEIVE],
  },

  // VĂN BẢN ĐI
  OUTGOING_DOC_PROCESS_ASSIGNEE: {
    value: 'OUTGOING_DOC_PROCESS_ASSIGNEE',
    name: 'Người nhận xử lý văn bản',
    description: 'Thông báo cho người nhận xử lý văn bản',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  OUTGOING_DOC_CLERK_RECEIVED: {
    value: 'OUTGOING_DOC_CLERK_RECEIVED',
    name: 'Văn thư nhận văn bản phát hành, đóng dấu',
    description: 'Thông báo văn thư nhận văn bản phát hành, đóng dấu',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  OUTGOING_DOC_PUBLISHED_RECEIVER_PROCESS: {
    value: 'OUTGOING_DOC_PUBLISHED_RECEIVER_PROCESS',
    name: 'Văn bản được phát hành và người nhận nằm trong mục nhận để biết (Xử lý)',
    description: 'Văn bản được phát hành và người nhận nằm trong mục nhận để biết, cần xử lý',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  OUTGOING_DOC_PUBLISHED_RECEIVER_KNOW: {
    value: 'OUTGOING_DOC_PUBLISHED_RECEIVER_KNOW',
    name: 'Văn bản được phát hành và người nhận nằm trong mục nhận để biết',
    description: 'Văn bản được phát hành và người nhận nằm trong mục nhận để biết',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  OUTGOING_DOC_PUBLISHED_CLERK_OPINION: {
    value: 'OUTGOING_DOC_PUBLISHED_CLERK_OPINION',
    name: 'Văn bản được phát hành và người nhận là đơn vị nhận để biết (Văn thư), xin ý kiến',
    description: 'Văn bản được phát hành và người nhận là đơn vị nhận để biết (Văn thư), xin ý kiến',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  OUTGOING_DOC_RETURNED: {
    value: 'OUTGOING_DOC_RETURNED',
    name: 'Văn bản bị trả lại',
    description: 'Thông báo khi văn bản bị trả lại',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  OUTGOING_DOC_RECALLED: {
    value: 'OUTGOING_DOC_RECALLED',
    name: 'Văn bản bị thu hồi',
    description: 'Thông báo khi văn bản bị thu hồi',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  OUTGOING_DOC_OPINION_REQUESTED: {
    value: 'OUTGOING_DOC_OPINION_REQUESTED',
    name: 'Văn bản cần cho ý kiến',
    description: 'Thông báo khi văn bản cần cho ý kiến',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  OUTGOING_DOC_OPINION_PROVIDED: {
    value: 'OUTGOING_DOC_OPINION_PROVIDED',
    name: 'Văn bản được cho ý kiến',
    description: 'Thông báo khi văn bản được cho ý kiến',
    defaultGroups: [NotificationGroup.RECEIVE],
  },

  // VĂN BẢN ĐẾN
  INCOMING_DOC_PROCESS_ASSIGNEE: {
    value: 'INCOMING_DOC_PROCESS_ASSIGNEE',
    name: 'Người nhận xử lý văn bản',
    description: 'Thông báo cho người nhận xử lý văn bản đến',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  INCOMING_DOC_RETURNED: {
    value: 'INCOMING_DOC_RETURNED',
    name: 'Văn bản bị trả lại',
    description: 'Thông báo khi văn bản đến bị trả lại',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  INCOMING_DOC_RECALLED: {
    value: 'INCOMING_DOC_RECALLED',
    name: 'Văn bản bị thu hồi',
    description: 'Thông báo khi văn bản đến bị thu hồi',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  INCOMING_DOC_EDITED: {
    value: 'INCOMING_DOC_EDITED',
    name: 'Văn bản được chỉnh sửa',
    description: 'Thông báo khi văn bản đến được chỉnh sửa',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  INCOMING_DOC_DUE_1_DAY: {
    value: 'INCOMING_DOC_DUE_1_DAY',
    name: 'Văn bản trước hạn 1 ngày',
    description: 'Thông báo văn bản đến trước hạn 1 ngày',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  INCOMING_DOC_OVERDUE_1_DAY: {
    value: 'INCOMING_DOC_OVERDUE_1_DAY',
    name: 'Văn bản quá hạn 1 ngày',
    description: 'Thông báo văn bản đến quá hạn 1 ngày',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  INCOMING_DOC_NEW_OPINION: {
    value: 'INCOMING_DOC_NEW_OPINION',
    name: 'Thông báo tới tất cả những người tham gia trong luồng xử lý văn bản khi có người thêm ý kiến xử lý',
    description: 'Thông báo tới tất cả những người tham gia trong luồng xử lý văn bản khi có người thêm ý kiến xử lý',
    defaultGroups: [NotificationGroup.RECEIVE],
  },

  // HỒ SƠ LƯU TRỮ
  ARCHIVE_RECORD_PROCESS_ASSIGNEE: {
    value: 'ARCHIVE_RECORD_PROCESS_ASSIGNEE',
    name: 'Người nhận xử lý hồ sơ',
    description: 'Thông báo người nhận xử lý hồ sơ',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  ARCHIVE_RECORD_RETURNED: {
    value: 'ARCHIVE_RECORD_RETURNED',
    name: 'Hồ sơ trả lại',
    description: 'Thông báo khi hồ sơ bị trả lại',
    defaultGroups: [NotificationGroup.PROCESS],
  },
  ARCHIVE_RECORD_APPROVED_BY_CVP: {
    value: 'ARCHIVE_RECORD_APPROVED_BY_CVP',
    name: 'Thông báo tới tất cả những người tham gia trong luồng khai thác hồ sơ khi hồ sơ đã được CVP duyệt yêu cầu khai thác',
    description: 'Thông báo tới tất cả những người tham gia trong luồng khai thác hồ sơ khi hồ sơ đã được CVP duyệt yêu cầu khai thác',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  ARCHIVE_RECORD_COMPLETE: {
    value: 'ARCHIVE_RECORD_COMPLETE',
    name: 'Hoàn thành khai thác hồ sơ',
    description: 'Thông báo khi yêu cầu khai thác hồ sơ đã được hoàn thành',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
  CONCURENT_STEP_OUTGOING: {
    value: 'CONCURENT_STEP_OUTGOING',
    name: 'Thông báo cho giai đoạn tiếp theo',
    description: 'Thông báo cho giai đoạn tiếp theo',
    defaultGroups: [NotificationGroup.RECEIVE],
  },
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType]['value'];

export enum ModuleType {
  VIEW_TASK = 'VIEW_TASK',
  VIEW_MEETING_ROOM = 'VIEW_MEETING_ROOM',
  VIEW_UTILITY = 'VIEW_UTILITY',
  VIEW_NEWS = 'VIEW_NEWS',
  VIEW_OUTCOMING_DOC = 'VIEW_OUTCOMING_DOC',
  VIEW_INCOMING_DOC = 'VIEW_INCOMING_DOC',
  VIEW_RECORD_EXPLOITATION = 'VIEW_RECORD_EXPLOITATION',
}
