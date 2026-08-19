// Các trường có thể tìm kiếm
export const TEXT_SEARCHABLE_FIELDS = [
  { code: 'documentNumber', name: 'Số văn bản' },
  { code: 'subject', name: 'Trích yếu' },
  { code: 'senderUnit', name: 'Đơn vị gửi' },
  { code: 'receiverUnit', name: 'Đơn vị nhận' },
  { code: 'documentType', name: 'Loại văn bản' },
  { code: 'priority', name: 'Độ mật' },
];


export const  tableData = [
    {
      _id: '1',
      nameOrg: 'Phòng Hành chính',
      count: 45,
      countNoComplete: 12,
      countNoCompleteNoDeadline: 3,
      countNoCompleteOutDeadline: 5,
      countNoCompleteInDeadline: 4,
      countComplete: 33,
      countCompleteNoDeadline: 8,
      countCompleteOutDeadline: 10,
      countCompleteInDeadline: 15,
    },
    {
      _id: '2',
      nameOrg: 'Phòng Kế toán',
      count: 38,
      countNoComplete: 8,
      countNoCompleteNoDeadline: 2,
      countNoCompleteOutDeadline: 3,
      countNoCompleteInDeadline: 3,
      countComplete: 30,
      countCompleteNoDeadline: 5,
      countCompleteOutDeadline: 8,
      countCompleteInDeadline: 17,
    },
    {
      _id: '3',
      nameOrg: 'Phòng Nhân sự',
      count: 52,
      countNoComplete: 15,
      countNoCompleteNoDeadline: 4,
      countNoCompleteOutDeadline: 6,
      countNoCompleteInDeadline: 5,
      countComplete: 37,
      countCompleteNoDeadline: 9,
      countCompleteOutDeadline: 12,
      countCompleteInDeadline: 16,
    },
  ];
  
