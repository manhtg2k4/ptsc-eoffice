export const predefinedFields = [
  {
    placeholder: 'Nhập dữ liệu...',
    name: 'phoneNumber',
    label: 'Số điện thoại',
    type: 'text',
    required: true,
  },
  {
    placeholder: 'Nhập dữ liệu...',
    name: 'address',
    label: 'Địa chỉ',
    type: 'text',
    required: false,
    maxLength: 50,
  },
  {
    placeholder: 'Nhập dữ liệu...',
    name: 'email',
    label: 'Email',
    type: 'text',
    required: true,
  },
  {
    placeholder: 'Nhập họ và tên...',
    name: 'fullName',
    label: 'Họ và tên',
    type: 'text',
    required: true,
  },
  {
    placeholder: 'Nhập tuổi...',
    name: 'age',
    label: 'Tuổi',
    type: 'number',
    required: false,
    min: 0,
    max: 120,
  },
  {
    placeholder: 'Chọn giới tính...',
    name: 'gender',
    label: 'Giới tính',
    type: 'autocomplete',
    required: true,
    options: [
      { label: 'Nam', value: 'male' },
      { label: 'Nữ', value: 'female' },
      { label: 'Khác', value: 'other' },
    ],
  },
  {
    placeholder: 'Nhập nghề nghiệp...',
    name: 'occupation',
    label: 'Nghề nghiệp',
    type: 'text',
    required: false,
  },
  {
    placeholder: 'Chọn quốc gia...',
    name: 'country',
    label: 'Quốc gia',
    type: 'autocomplete',
    required: false,
    options: [
      { label: 'Việt Nam', value: 'vn' },
      { label: 'Hoa Kỳ', value: 'us' },
      { label: 'Nhật Bản', value: 'jp' },
    ],
  },
  {
    placeholder: 'Chọn ngày sinh...',
    name: 'birthday',
    label: 'Ngày sinh',
    type: 'date',
    required: false,
  },
  {
    placeholder: 'Nhập số CCCD...',
    name: 'citizenId',
    label: 'Căn cước công dân',
    type: 'text',
    required: false,
    maxLength: 12,
  },
  {
    placeholder: 'Chọn phòng ban...',
    name: 'department',
    label: 'Phòng ban',
    type: 'autocomplete',
    required: true,
    options: [
      { label: 'Kế toán', value: 'accounting' },
      { label: 'Nhân sự', value: 'hr' },
      { label: 'Kỹ thuật', value: 'engineering' },
    ],
  },
  {
    placeholder: 'Chọn ngày bắt đầu...',
    name: 'startDate',
    label: 'Ngày bắt đầu',
    type: 'date',
    required: true,
  },
  {
    placeholder: 'Nhập dữ liệu...',
    name: 'code',
    label: 'Code',
    type: 'text',
    required: false,
  },
  {
    placeholder: 'Nhập dữ liệu...',
    name: 'content',
    label: 'Content',
    type: 'text',
    required: false,
  },
  {
    placeholder: 'Nhập dữ liệu...',
    name: 'name',
    label: 'Name',
    type: 'text',
    required: false,
  },
  {
    placeholder: 'Nhập dữ liệu...',
    name: 'user_start',
    label: 'User Start',
    type: 'text',
    required: false,
  },
];


export const mapFields = {
  text: () => 'String',
  autocomplete: () => 'String',
  number: (value) => {
    if (/^-?\d+$/.test(value)) {
      const num = parseInt(value, 10);
      if (num >= -32768 && num <= 32767) return 'Short';
      if (num >= -2147483648 && num <= 2147483647) return 'Integer';
      return 'Long';
    }
    if (/^-?\d*\.\d+$/.test(value)) {
      return 'Double';
    }

  }
  ,
  date: () => 'String',
}
