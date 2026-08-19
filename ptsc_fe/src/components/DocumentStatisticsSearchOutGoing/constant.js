// Các trường có thể tìm kiếm
export const TEXT_SEARCHABLE_FIELDS = [
  { code: 'documentNumber', name: 'Số văn bản' },
  { code: 'subject', name: 'Trích yếu' },
  { code: 'senderUnit', name: 'Đơn vị gửi' },
  { code: 'receiverUnit', name: 'Đơn vị nhận' },
  { code: 'documentType', name: 'Loại văn bản' },
  { code: 'priority', name: 'Độ mật' },
];

// Cấu hình cột cho bảng
export const TABLE_COLUMNS = [
  {
    name: 'Ký hiệu văn bản',
    row: 'toBookTextSymbols',
    isShow: true,
  },
  {
    name: 'Trích yếu nội dung',
    row: 'abstract_note',
    isShow: true,
  },
  {
    name: 'Đơn vị soạn thảo',
    row: 'sender_unit',
    isShow: true,
  },
  {
    name: 'Người soạn thảo',
    row: 'drafter',
    isShow: true,
  },
  {
    name: 'Loại văn bản',
    row: 'document_type',
    isShow: true,
  },
  {
    name: 'Độ khẩn',
    row: 'urgency_level',
    isShow: true,
  },
  // {
  //   name: 'Độ mật',
  //   row: 'private_level',
  //   isShow: true,
  // },
  {
    name: 'Người ký phát hành',
    row: 'report_signer',
    isShow: true,
  },
  {
    name: 'Người xem để biết',
    row: 'viewers',
    isShow: true,
  },
  {
    name: 'Trạng thái',
    row: 'status_code',
    isShow: true,
  },
  {
    name: 'Văn bản đến đang phúc đáp',
    row: 'reply_incomming_doc',
    isShow: true,
  },
  {
    name: 'Ngày soạn thảo',
    row: 'created_at',
    isShow: true,
  },
  {
    name: 'Ngày cập nhật',
    row: 'updated_at',
    isShow: true,
  },
  {
    name: 'Xin ý kiến',
    row: 'processor',
    isShow: true,
  },
  {
    name: 'File dự thảo',
    row: 'files',
    isShow: true,
  },
  {
    name: 'Ngày ban hành',
    row: 'release_date',
    isShow: true,
  },
  {
    name: 'Loại quy trình',
    row: 'type_of_process',
    isShow: true,
  },
];

//  Dữ liệu mẫu cho bảng
export const MOCK_TABLE_DATA = [
  {
    id: 1,
    documentCode: '06/TB-TCg1',
    summary: 'Thông báo triển khai đồng bộ hệ thống quản lý văn bản toàn công ty',
    urgency: 'Khẩn',
    deadline: '28/05/2024',
    status: 'Văn bản mới',
    senderUnit: 'Phòng Chính trị',
    senderSub: 'Tổng Công ty Tân Cảng Sài Gòn',
    type: 'Loại: Công văn',
    symbol: 'Ký hiệu: xe 21/05/2024',
  },
  {
    id: 2,
    documentCode: '74/10-TCSG',
    summary: 'Kế hoạch về việc điều phối hàng hóa vào cảng trong dịp lễ 30/4 - 01/05',
    urgency: 'Bình thường',
    deadline: '15/05/2024',
    status: 'Đã hoàn thành',
    senderUnit: 'Tổng Công ty Tân Cảng Sài Gòn',
    senderSub: 'Cảng và Hàng hải TPHCM',
    type: 'Loại: Kế hoạch',
    symbol: 'Ký hiệu: 32-02/04/2024',
  },
  {
    id: 3,
    documentCode: '1904/TB-TCg',
    summary: 'Báo cáo tổng kết công tác chuyên đổi số quý I năm 2024 và kế hoạch',
    urgency: 'Hỏa tốc',
    deadline: '25/05/2024',
    status: 'Đang xử lý',
    senderUnit: 'Phòng Công nghệ Thông tin',
    senderSub: 'Ban Giám đốc Công ty',
    type: 'Loại: Báo cáo',
    symbol: 'Ký hiệu: xe 23/05/2024',
  },
  {
    id: 4,
    documentCode: '72/12/TTtr-',
    summary: 'Tờ trình về việc ban hành quy định mới về an toàn lao động tại khu vực',
    urgency: 'Khẩn',
    deadline: '10/05/2024',
    status: 'Quá hạn',
    senderUnit: 'Phòng An toàn Chất lượng',
    senderSub: 'Tổng Công ty Tân Cảng Sài Gòn',
    type: 'Loại: Tờ trình',
    symbol: 'Ký hiệu: xx 05/05/2024',
  },
  {
    id: 5,
    documentCode: '12/QD-TCg',
    summary: 'Quyết định phê duyệt dự án nâng cấp hệ thống hạ tầng tại container',
    urgency: 'Bình thường',
    deadline: '30/06/2024',
    status: 'Văn bản mới',
    senderUnit: 'Hội đồng Thành viên',
    senderSub: 'Các đơn vị trực thuộc',
    type: 'Loại: Quyết định',
    symbol: 'Ký hiệu: xx 24/03/2024',
  },
];
