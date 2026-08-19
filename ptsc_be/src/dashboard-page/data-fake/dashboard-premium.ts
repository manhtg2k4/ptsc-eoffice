export const dataDashboardPremiumStats = [
  {
    id: 'company-performance',
    color: 'blue',
    variantIcon: '📊',
    label: 'Hiệu suất công việc · Toàn CT',
    value: '82%',
    premiumTags: [
      { id: 'mom-up', label: '▲ 4% so tháng trước', type: 'up' },
      { id: 'target', label: 'Mục tiêu: 85%', type: 'neutral' },
    ],
  },
  {
    id: 'ceo-approvals',
    color: 'orange',
    variantIcon: '⏳',
    label: 'Phê duyệt chờ xử lý · Cấp TGĐ',
    value: '12',
    premiumTags: [
      { id: 'overdue', label: '4 quá hạn', type: 'down' },
      { id: 'avg', label: 'TB 2.1 ngày/YC', type: 'neutral' },
    ],
  },
  {
    id: 'total-employees',
    color: 'teal',
    variantIcon: '👥',
    label: 'Tổng CBNV toàn hệ thống',
    value: '6,842',
    premiumTags: [{ id: 'new-hires', label: '+47 tháng này', type: 'up' }],
  },
  {
    id: 'company-tasks',
    color: 'green',
    variantIcon: '📋',
    label: 'Công việc toàn CT · Tháng 03',
    value: '487',
    premiumTags: [
      { id: 'done', label: '348 hoàn thành', type: 'up' },
      { id: 'late', label: '28 quá hạn', type: 'down' },
    ],
  },
  {
    id: 'company-documents',
    color: 'purple',
    variantIcon: '📄',
    label: 'Văn bản toàn CT · Tháng 03',
    value: '347',
    premiumTags: [
      { id: 'processed', label: 'Đã xử lý 89%', type: 'up' },
      { id: 'doc-late', label: '12 quá hạn', type: 'down' },
    ],
  },
];
