import 'dotenv/config'
const STATUS = {
  NOT_ACTIVED: 0,
  ACTIVED: 1,
  LOCKED: 2,
  DELETED: 3,
  DRAFT: 4,
};

const STATUSENTERPRISE = {
  0: 'Bị xóa',
  1: 'Đang hoạt động',
  2: 'Tạm ngưng',
  3: 'Đã giải thể',
};
const STATUSWITHDRAW = {
  WITHDRAW: 1,
  UNWITHDRAW: 2,
};

const STATUSDOCUMENTSTANDARD = {
  0: 'Đã hủy',
  1: 'Đang áp dụng',
  2: 'Tạm ngưng',
};

const STATUSPROFILEHISTORIES = {
  0: 'Thất bại',
  1: 'Hoàn thành',
};

const CODE_COMMON_CATEGORIES = {
  LTL: 'LTL001',
  DVKT: 'DVKT001',
  LSDLD:'SDLD001'
}

const CODE_VALUE_LIST_COMMON_CATEGORIES = {
  TSD: 'TSD',
}

const CODE_PROFILE_STATUS = {
  TSD:"TSD",
  LTL:"LTL",
}

const POSITION_LEVEL = {
  Admin: 0,
  Vanthu: 1,
  Giamdoc: 2,
  Phogiamdoc: 3,
  Truongphong: 4,
  Photruongphong: 5,
  Canbo: 6,
}

const DOC_TYPE = {
  CONG_VAN: 'CongvanDen',
  QUYET_DINH: 'QuyetdinhDen',
  THONG_BAO: 'ThongbaoDen',
  BAO_CAO: 'BaocaoDen'
}

const VAN_THU_ALL = (process.env.VAN_THU_ALL || '')
  .split(',')
  .map(r => r.trim())
  .filter(Boolean)

// Roles có quyền xem toàn bộ (global scope)
const GLOBAL_SCOPE_ROLES = (process.env.GLOBAL_SCOPE_ROLES || 'LANH_DAO')
  .split(',')
  .map(r => r.trim())
  .filter(Boolean)

// Roles có quyền xem theo đơn vị/phòng (unit scope)
const UNIT_SCOPE_ROLES = (process.env.UNIT_SCOPE_ROLES || 'VAN_THU,TRUONG_PHONG')
  .split(',')
  .map(r => r.trim())
  .filter(Boolean)

// ROOM_STAGE: stage của phòng họp, map với trạng thái cuộc họp
const ROOM_STAGE = {
  AVAILABLE:   1, // Phòng sẵn sàng đặt
  LOCKED:      2, // Phòng tạm khoá / bảo trì
  RESERVED:    3, // Có lịch họp sắp tới (DU_KIEN / CHUAN_BI)
  IN_MEETING:  4, // Đang họp thực tế (DANG_HOP)
};

// Các loại đơn vị trong cơ cấu tổ chức
const ORG_UNIT_TYPES = {
  BAN: 'Ban', // Ban
  TO: 'To', // Tổ
  PHONG: 'Phong', // Phòng
  BANLD: 'BanLD', // Ban Lãnh Đạo
};

export {
  STATUS,
  STATUSENTERPRISE,
  STATUSDOCUMENTSTANDARD,
  STATUSPROFILEHISTORIES,
  CODE_COMMON_CATEGORIES,
  STATUSWITHDRAW,
  CODE_VALUE_LIST_COMMON_CATEGORIES,
  CODE_PROFILE_STATUS,
  POSITION_LEVEL,
  ROOM_STAGE,
  VAN_THU_ALL,
  GLOBAL_SCOPE_ROLES,
  UNIT_SCOPE_ROLES,
  DOC_TYPE,
  ORG_UNIT_TYPES
};
