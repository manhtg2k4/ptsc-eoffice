export const dataDashboardNormalStats = [
  {
    id: 'incoming-documents',
    label: 'Văn bản đến',
    icon: 'inbox',
    color: 'blue',
    value: 20,
    trend: { type: 'up', value: '12%' },
    insight: {
      type: 'danger',
      text: '3 văn bản quá hạn cần xử lý gấp!',
    },
    details: [
      { label: 'Chờ xử lý', value: 8, color: 'orange' },
      { label: 'Đang xử lý', value: 9, color: 'blue' },
      { label: 'Quá hạn', value: 3, color: 'red' },
    ],
  },
  {
    id: 'outgoing-documents',
    label: 'Văn bản đi',
    icon: 'send',
    color: 'green',
    value: 24,
    trend: { type: 'up', value: '8%' },
    insight: {
      type: 'warning',
      text: '12 văn bản đang chờ lãnh đạo phê duyệt',
    },
    details: [
      { label: 'Dự thảo', value: 5, color: 'gray' },
      { label: 'Chờ duyệt', value: 12, color: 'orange' },
      { label: 'Quá hạn', value: 7, color: 'red' },
    ],
  },
  {
    id: 'weekly-meetings',
    label: 'Lịch họp tuần này',
    icon: 'calendar',
    color: 'orange',
    value: 12,
    trend: { type: 'down', value: '5%' },
    insight: {
      type: 'info',
      text: '3 cuộc họp hôm nay, 1 cuộc cần xác nhận',
    },
    details: [
      { label: 'Hôm nay', value: 3, color: 'blue' },
      { label: 'Đã xác nhận', value: 7, color: 'green' },
      { label: 'Từ chối', value: 2, color: 'red' },
    ],
  },
  {
    id: 'tasks-overview',
    label: 'Công việc',
    icon: 'task',
    color: 'purple',
    value: 18,
    trend: { type: 'up', value: '15%' },
    insight: {
      type: 'success',
      text: 'Đã hoàn thành 28 CV tháng này',
    },
    details: [
      { label: 'Đang thực hiện', value: 8, color: 'blue' },
      { label: 'Quá hạn', value: 4, color: 'red' },
      { label: 'Chờ phê duyệt', value: 6, color: 'orange' },
    ],
  },
];

export const dataDashboardTaskOverview = {
  performance: {
    title: 'Tỷ lệ hoàn thành đúng hạn tháng này',
    value: '78%',
    percent: 78,
    leftLabel: 'Mục tiêu: 85%',
    rightLabel: 'Còn thiếu: 7%',
  },
  sourceChart: {
    title: 'Phân bố theo nguồn',
    badge: {
      text: 'Văn bản chiếm 45%',
      type: 'warning',
    },
    chartData: {
      labels: ['Văn bản', 'Cuộc họp', 'Chung'],
      values: [45, 30, 25],
      colors: ['#0f4c81', '#e17055', '#00b894'],
    },
  },
  roleChart: {
    title: 'Phân bố theo vai trò',
    badge: {
      text: 'Chủ trì 35%',
      type: 'success',
    },
    chartData: {
      labels: ['Chủ trì', 'Phối hợp', 'Xem để biết'],
      values: [35, 45, 20],
      colors: ['#6c5ce7', '#00a8e8', '#94a3b8'],
    },
  },
};

export const dataDashboardNormalProjects = {
  summary: [
    { value: 5, label: 'Dự án', color: 'blue' },
    { value: 2, label: 'Chậm tiến độ', color: 'red' },
    { value: 8, label: 'Việc cần làm', color: 'blue' },
    { value: 3, label: 'Deadline tuần này', color: 'green' },
  ],
  list: [
    {
      id: 'project-hrm-2',
      name: 'Hệ thống Quản lý Nhân sự 2.0',
      role: 'Chủ trì',
      tasks: '5 việc',
      deadline: 'Còn 3 ngày',
      statusText: 'Chậm tiến độ',
      statusColor: 'warning',
      progress: 65,
    },
    {
      id: 'project-digital-office-docs',
      name: 'Digital Office - Module Văn bản',
      role: 'Phối hợp',
      tasks: '2 việc',
      deadline: '28/02',
      statusText: 'Đúng tiến độ',
      statusColor: 'green',
      progress: 82,
    },
    {
      id: 'project-internal-portal',
      name: 'Cổng thông tin nội bộ',
      role: 'Chủ trì',
      tasks: '1 việc',
      deadline: 'Quá hạn',
      statusText: 'Quá hạn',
      statusColor: 'danger',
      progress: 45,
    },
  ],
};

export const dataDashboardNormalQuickActions = [
  {
    id: 'quick-car-booking',
    label: 'Đặt xe',
    icon: 'car',
    color: 'blue',
    badge: { value: 2, color: 'orange' },
  },
  {
    id: 'quick-passport',
    label: 'Hộ chiếu',
    icon: 'passport',
    color: 'green',
  },
  {
    id: 'quick-feedback',
    label: 'Phản ánh',
    icon: 'feedback',
    color: 'orange',
    badge: { value: 1, color: 'green' },
  },
];
export const dataDashboardNormalMeetings = [
  {
    id: 'meeting-daily-standup',
    type: 'urgent',
    time: '09:00',
    timeColor: 'blue',
    title: 'Daily Standup - Team BA',
    badge: 'Còn 30 phút',
    meta: [{ icon: 'location', text: 'Phòng A2' }],
  },
  {
    id: 'meeting-design-review',
    type: 'confirmed',
    time: '14:00',
    timeColor: 'green',
    title: 'Review thiết kế hệ thống QLNS',
    meta: [
      { icon: 'video', text: 'Teams' },
      { icon: 'clock', text: '2 giờ' },
    ],
  },
  {
    id: 'meeting-board-report',
    type: 'pending',
    time: '10:00',
    timeColor: 'orange',
    title: 'Họp BGĐ - Báo cáo Q1',
    meta: [
      { icon: 'calendar', text: '12/02' },
      { icon: 'location', text: 'Hội trường' },
    ],
  },
];

export const dataDashboardNormalEvents = [
  {
    id: 'event-labor-conference',
    day: '15',
    month: 'Th2',
    title: 'Hội nghị người lao động năm 2026',
    description: '14:00 - 17:00 • Hội trường',
    color: 'green',
  },
  {
    id: 'event-digital-workshop',
    day: '20',
    month: 'Th2',
    title: 'Workshop Chuyển đổi số',
    description: '09:00 - 17:00 • Teams',
    color: 'purple',
  },
  {
    id: 'event-anniversary-gala',
    day: '28',
    month: 'Th2',
    title: 'Gala Dinner kỷ niệm 30 năm',
    description: '19:00 - 21:00 • Rex Hotel',
    color: 'orange',
  },
];

export const dataDashboardNormalNews = [
  {
    id: 'news-logistics-award',
    emoji: '🏆',
    title: 'TCSG đạt giải "Doanh nghiệp Logistics xuất sắc 2025"',
    date: '05/02',
    likes: '328 lượt thích',
    comments: '56 bình luận',
    color: 'blue',
  },
  {
    id: 'news-benefits-program',
    emoji: '🎁',
    title: 'Chương trình phúc lợi mới cho nhân viên TCSG',
    date: '01/02',
    likes: '412 lượt thích',
    comments: '89 bình luận',
    color: 'green',
  },
  {
    id: 'news-digital-office-2',
    emoji: '🚀',
    title: 'Ra mắt hệ thống Digital Office phiên bản 2.0',
    date: '28/01',
    likes: '567 lượt thích',
    comments: '124 bình luận',
    color: 'orange',
  },
];
