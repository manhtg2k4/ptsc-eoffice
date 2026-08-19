
// ==========================================
// FILE & FOLDER UPLOAD CONFIGURATION
// ==========================================

import { styled } from "@mui/material";
import { SkyTypography } from "@styles/SkyStyles";

// 1) GIỚI HẠN THEO 1 LẦN TẢI LÊN
export const UPLOAD_LIMITS_PER_BATCH = {
  MAX_FILES: 20,        // Tối đa 20 file/lần
  MAX_FOLDERS: 1,       // Tối đa 1 folder/lần
};

// 2) GIỚI HẠN THEO 1 CÔNG VIỆC
export const UPLOAD_LIMITS_PER_TASK = {
  MAX_ATTACHMENTS: 200,           // Tổng số đính kèm tối đa (file + folder)
  MAX_TOTAL_SIZE: 2 * 1024 * 1024 * 1024,  // Tổng dung lượng tối đa: 2GB
};

// 3) GIỚI HẠN CHO 1 FILE
export const UPLOAD_LIMITS_PER_FILE = {
  MAX_SIZE: 100 * 1024 * 1024,    // Dung lượng tối đa: 100MB/file
};

// 4) GIỚI HẠN CHO 1 FOLDER
export const UPLOAD_LIMITS_PER_FOLDER = {
  MAX_SIZE: 1 * 1024 * 1024 * 1024,  // Tổng dung lượng folder tối đa: 1GB
  MAX_FILES: 500,                     // Số lượng file con tối đa: 500 file
  MAX_DEPTH: 10,                      // Độ sâu thư mục tối đa: 10 cấp
  MAX_PATH_LENGTH: 240,               // Độ dài đường dẫn tối đa: 240 ký tự
};

// 5) GIỚI HẠN TÊN FILE/FOLDER
export const FILE_NAME_LIMITS = {
  MAX_LENGTH: 255,                    // Độ dài tên tối đa: 255 ký tự
};

// 6) WHITELIST - ĐỊNH DẠNG FILE CHO PHÉP
export const ALLOWED_FILE_EXTENSIONS = {
  // Văn phòng
  OFFICE: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
  // Ảnh
  IMAGE: ['jpg', 'jpeg', 'png'],
  // Nén
  ARCHIVE: ['zip', 'rar'],
};

// Tạo danh sách extension được phép (flatten)
export const ALLOWED_EXTENSIONS_LIST = [
  ...ALLOWED_FILE_EXTENSIONS.OFFICE,
  ...ALLOWED_FILE_EXTENSIONS.IMAGE,
  ...ALLOWED_FILE_EXTENSIONS.ARCHIVE,
];

// 7) MIME TYPES CHO PHÉP (để kiểm tra kép với extension)
export const ALLOWED_MIME_TYPES = {
  // PDF
  'application/pdf': ['pdf'],

  // Office - Word
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],

  // Office - Excel
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],

  // Office - PowerPoint
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],

  // Text
  'text/plain': ['txt'],
  'text/csv': ['csv'],

  // Images
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],

  // Archive
  'application/zip': ['zip'],
  'application/x-zip-compressed': ['zip'],
  'application/x-rar-compressed': ['rar'],
  'application/vnd.rar': ['rar'],
};

// 8) BLACKLIST - ĐỊNH DẠNG NGUY HIỂM BỊ CHẶN
export const BLOCKED_FILE_EXTENSIONS = [
  'exe', 'msi', 'bat', 'cmd', 'ps1', 'sh',  // Thực thi
  'com', 'scr', 'vbs', 'js', 'jar',         // Thực thi khác
  'dll', 'sys', 'drv',                       // System files
  'app', 'deb', 'rpm',                       // Installer khác
];

// 9) KÝ TỰ/CHUỖI NGUY HIỂM TRONG TÊN FILE
export const DANGEROUS_FILENAME_PATTERNS = [
  '../',      // Path traversal
  '..\\',     // Path traversal (Windows)
  ':',        // Driver/stream separator
  '<',        // HTML/XML tag
  '>',        // HTML/XML tag
  '"',        // Quote
  '|',        // Pipe
  '?',        // Wildcard
  '*',        // Wildcard
];

// Regex để kiểm tra ký tự điều khiển (0x00-0x1F, 0x7F)
// eslint-disable-next-line no-control-regex
export const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/;

// 10) QUY TẮC ĐỔI TÊN KHI TRÙNG
export const DUPLICATE_NAME_PATTERN = {
  SUFFIX_START: ' (',
  SUFFIX_END: ')',
  // Ví dụ: "ten (1)", "ten (2)"...
};

// 11) THỂ LOẠI LỖI (Để chuẩn hoá thông báo)
export const UPLOAD_ERROR_TYPES = {
  // Giới hạn số lượng
  EXCEED_MAX_FILES_PER_BATCH: 'EXCEED_MAX_FILES_PER_BATCH',
  EXCEED_MAX_FOLDERS_PER_BATCH: 'EXCEED_MAX_FOLDERS_PER_BATCH',
  EXCEED_MAX_ATTACHMENTS_PER_TASK: 'EXCEED_MAX_ATTACHMENTS_PER_TASK',

  // Giới hạn dung lượng
  EXCEED_MAX_FILE_SIZE: 'EXCEED_MAX_FILE_SIZE',
  EXCEED_MAX_FOLDER_SIZE: 'EXCEED_MAX_FOLDER_SIZE',
  EXCEED_MAX_TOTAL_SIZE: 'EXCEED_MAX_TOTAL_SIZE',

  // Giới hạn folder
  EXCEED_MAX_FILES_IN_FOLDER: 'EXCEED_MAX_FILES_IN_FOLDER',
  EXCEED_MAX_FOLDER_DEPTH: 'EXCEED_MAX_FOLDER_DEPTH',
  EXCEED_MAX_PATH_LENGTH: 'EXCEED_MAX_PATH_LENGTH',

  // Định dạng file
  UNSUPPORTED_FILE_FORMAT: 'UNSUPPORTED_FILE_FORMAT',
  BLOCKED_FILE_FORMAT: 'BLOCKED_FILE_FORMAT',
  MIME_TYPE_MISMATCH: 'MIME_TYPE_MISMATCH',

  // Tên file
  INVALID_FILE_NAME: 'INVALID_FILE_NAME',
  EMPTY_FILE_NAME: 'EMPTY_FILE_NAME',
  FILE_NAME_TOO_LONG: 'FILE_NAME_TOO_LONG',
  DANGEROUS_FILE_NAME: 'DANGEROUS_FILE_NAME',

  // Quyền
  NO_PERMISSION: 'NO_PERMISSION',

  // Khác
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// 12) THÔNG BÁO LỖI CHUẨN HOÁ
export const UPLOAD_ERROR_MESSAGES = {
  // Giới hạn số lượng
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_FILES_PER_BATCH]: `Vượt quá ${UPLOAD_LIMITS_PER_BATCH.MAX_FILES} file/lần tải lên`,
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_FOLDERS_PER_BATCH]: `Chỉ được tải tối đa ${UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS} folder/lần`,
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_ATTACHMENTS_PER_TASK]: `Vượt quá ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/công việc`,

  // Giới hạn dung lượng
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_FILE_SIZE]: `Vượt quá ${UPLOAD_LIMITS_PER_FILE.MAX_SIZE / 1024 / 1024}MB/file`,
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_FOLDER_SIZE]: `Vượt quá ${UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE / 1024 / 1024 / 1024}GB/folder`,
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_TOTAL_SIZE]: `Vượt quá ${UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE / 1024 / 1024 / 1024}GB tổng dung lượng/công việc`,

  // Giới hạn folder
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_FILES_IN_FOLDER]: `Vượt quá ${UPLOAD_LIMITS_PER_FOLDER.MAX_FILES} file trong folder`,
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_FOLDER_DEPTH]: `Vượt quá độ sâu thư mục tối đa ${UPLOAD_LIMITS_PER_FOLDER.MAX_DEPTH} cấp`,
  [UPLOAD_ERROR_TYPES.EXCEED_MAX_PATH_LENGTH]: `Đường dẫn vượt quá ${UPLOAD_LIMITS_PER_FOLDER.MAX_PATH_LENGTH} ký tự`,

  // Định dạng file
  [UPLOAD_ERROR_TYPES.UNSUPPORTED_FILE_FORMAT]: 'Định dạng không được hỗ trợ',
  [UPLOAD_ERROR_TYPES.BLOCKED_FILE_FORMAT]: 'Định dạng file bị chặn vì lý do bảo mật',
  [UPLOAD_ERROR_TYPES.MIME_TYPE_MISMATCH]: 'Định dạng file không khớp với nội dung thực tế',

  // Tên file
  [UPLOAD_ERROR_TYPES.INVALID_FILE_NAME]: 'Tên file không hợp lệ',
  [UPLOAD_ERROR_TYPES.EMPTY_FILE_NAME]: 'Tên file/folder không được rỗng hoặc chỉ chứa khoảng trắng',
  [UPLOAD_ERROR_TYPES.FILE_NAME_TOO_LONG]: `Tên file vượt quá ${FILE_NAME_LIMITS.MAX_LENGTH} ký tự`,
  [UPLOAD_ERROR_TYPES.DANGEROUS_FILE_NAME]: 'Tên file chứa ký tự nguy hiểm',

  // Quyền
  [UPLOAD_ERROR_TYPES.NO_PERMISSION]: 'Bạn không có quyền thực hiện thao tác này',

  // Khác
  [UPLOAD_ERROR_TYPES.UNKNOWN_ERROR]: 'Đã xảy ra lỗi không xác định',
};

// 13) QUYỀN THAO TÁC
export const FILE_PERMISSIONS = {
  CAN_UPLOAD: 'can_upload',           // Quyền tải lên file/folder
  CAN_DELETE: 'can_delete',           // Quyền xoá đính kèm
  CAN_DOWNLOAD: 'can_download',       // Quyền tải xuống
  CAN_VIEW: 'can_view',               // Quyền xem
};

// Mapping quyền theo vai trò
export const PERMISSION_BY_ROLE = {
  // Người dùng có quyền cập nhật công việc
  UPDATE: {
    [FILE_PERMISSIONS.CAN_UPLOAD]: true,
    [FILE_PERMISSIONS.CAN_DELETE]: true,
    [FILE_PERMISSIONS.CAN_DOWNLOAD]: true,
    [FILE_PERMISSIONS.CAN_VIEW]: true,
  },
  // Người dùng chỉ có quyền xem
  VIEW_ONLY: {
    [FILE_PERMISSIONS.CAN_UPLOAD]: false,
    [FILE_PERMISSIONS.CAN_DELETE]: false,
    [FILE_PERMISSIONS.CAN_DOWNLOAD]: true,
    [FILE_PERMISSIONS.CAN_VIEW]: true,
  },
};

// 14) CÁC HELPER FUNCTIONS (tuỳ chọn)

/**
 * Lấy extension từ tên file
 */
export const getFileExtension = (filename) => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.substring(lastDot + 1).toLowerCase();
};

/**
 * Kiểm tra file extension có được phép không
 */
export const isAllowedExtension = (filename) => {
  const ext = getFileExtension(filename);
  return ALLOWED_EXTENSIONS_LIST.includes(ext);
};

/**
 * Kiểm tra file extension có bị chặn không
 */
export const isBlockedExtension = (filename) => {
  const ext = getFileExtension(filename);
  return BLOCKED_FILE_EXTENSIONS.includes(ext);
};

/**
 * Kiểm tra tên file có ký tự nguy hiểm không
 */
export const hasDangerousCharacters = (filename) => {
  // Kiểm tra ký tự điều khiển
  if (CONTROL_CHAR_REGEX.test(filename)) return true;

  // Kiểm tra các pattern nguy hiểm
  return DANGEROUS_FILENAME_PATTERNS.some(pattern => filename.includes(pattern));
};

/**
 * Kiểm tra tên file có rỗng hoặc chỉ chứa khoảng trắng không
 */
export const isEmptyOrWhitespace = (filename) => {
  return !filename || filename.trim().length === 0;
};

/**
 * Rút gọn tên file để hiển thị (mặc định 15 ký tự)
 */
export const truncateFileName = (name, limit = 20) => {
  if (!name) return "";
  if (name.length <= limit) return name;
  return name.substring(0, limit) + "...";
};

/**
 * Validate tên file/folder
 */
export const validateFileName = (filename) => {
  // Kiểm tra rỗng
  if (isEmptyOrWhitespace(filename)) {
    return {
      valid: false,
      errorType: UPLOAD_ERROR_TYPES.EMPTY_FILE_NAME,
      message: UPLOAD_ERROR_MESSAGES[UPLOAD_ERROR_TYPES.EMPTY_FILE_NAME],
    };
  }

  // Kiểm tra độ dài
  if (filename.length > FILE_NAME_LIMITS.MAX_LENGTH) {
    return {
      valid: false,
      errorType: UPLOAD_ERROR_TYPES.FILE_NAME_TOO_LONG,
      message: UPLOAD_ERROR_MESSAGES[UPLOAD_ERROR_TYPES.FILE_NAME_TOO_LONG],
    };
  }

  // Kiểm tra ký tự nguy hiểm
  if (hasDangerousCharacters(filename)) {
    return {
      valid: false,
      errorType: UPLOAD_ERROR_TYPES.DANGEROUS_FILE_NAME,
      message: UPLOAD_ERROR_MESSAGES[UPLOAD_ERROR_TYPES.DANGEROUS_FILE_NAME],
    };
  }

  return { valid: true };
};

/**
 * Validate extension file
 */
export const validateFileExtension = (filename) => {
  // Kiểm tra có bị chặn không
  if (isBlockedExtension(filename)) {
    return {
      valid: false,
      errorType: UPLOAD_ERROR_TYPES.BLOCKED_FILE_FORMAT,
      message: UPLOAD_ERROR_MESSAGES[UPLOAD_ERROR_TYPES.BLOCKED_FILE_FORMAT],
    };
  }

  // Kiểm tra có được phép không
  if (!isAllowedExtension(filename)) {
    return {
      valid: false,
      errorType: UPLOAD_ERROR_TYPES.UNSUPPORTED_FILE_FORMAT,
      message: UPLOAD_ERROR_MESSAGES[UPLOAD_ERROR_TYPES.UNSUPPORTED_FILE_FORMAT],
    };
  }

  return { valid: true };
};

/**
 * Tạo tên mới khi trùng tên
 * Ví dụ: "document.pdf" -> "document (1).pdf"
 */
export const generateDuplicateName = (originalName, existingNames = []) => {
  let newName = originalName;
  let counter = 1;

  // Tách tên và extension
  const lastDot = originalName.lastIndexOf('.');
  const hasExtension = lastDot > 0;
  const baseName = hasExtension ? originalName.substring(0, lastDot) : originalName;
  const extension = hasExtension ? originalName.substring(lastDot) : '';

  // Tìm tên chưa trùng
  while (existingNames.includes(newName)) {
    newName = `${baseName}${DUPLICATE_NAME_PATTERN.SUFFIX_START}${counter}${DUPLICATE_NAME_PATTERN.SUFFIX_END}${extension}`;
    counter++;
  }

  return newName;
};

/**
 * Format dung lượng file (bytes -> KB/MB/GB)
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};


const StyleSkyTypography = styled(SkyTypography)(() => ({
  color: '#0062AD',
  fontSize: '14px',
  whiteSpace: "normal",

}));

const formatTitle = (row) => {
  return <StyleSkyTypography>{row?.title}</StyleSkyTypography>;
}

const formatToBook = (row) => {
  return <StyleSkyTypography>{row?.toBook}</StyleSkyTypography>;
}


export const columns = [
  {
    row: 'toBook',
    label: 'Số văn bản',
    width: 200,
    isShow: true,
    wrapContent: true,
    accessor: formatToBook,

  },
  {
    row: 'abstractNote',
    label: 'Trích yếu',
    width: 330,
    isShow: true,
    wrapContent: true

  },
  {
    row: 'documentType',
    label: 'Loại văn bản',
    width: 200,
    isShow: true,
    wrapContent: true
  },
  {
    row: 'documentDate',
    label: 'Ngày trên văn bản',
    width: 150,
    isShow: true
  },
  {
    row: 'statusCode',
    label: 'Trạng thái',
    width: 150,
    isShow: true
  },
];


export const columnAddJobToMeeting = [
  {
    row: 'title',
    label: 'Tiêu đề cuộc họp',
    width: 350,
    isShow: true,
    wrapContent: true,
    accessor: formatTitle,
  },
  {
    row: 'roomIds',
    label: 'Địa điểm',
    width: 250,
    isShow: true,
    accessKey: 'roomIds',
    wrapContent: true

  },
  {
    row: 'meetingDate',
    label: 'Ngày họp',
    width: 150,
    isShow: true
  },
  {
    row: 'meetingTime',
    label: 'Thời gian họp',
    width: 150,
    isShow: true
  },
  {
    row: 'meetingState',
    label: 'Trạng thái',
    width: 150,
    isShow: true
  },
];


export const filter = [
  {
    name: 'Số văn bản', code: 'toBook',
  },
  { name: 'Trích yếu', code: 'abstract_note' }
]

export const advancedFilterConfig = [
  {
    key: "documentType",
    label: "Loại văn bản",
    type: "autocomplete",
    optionsProp: "docTypeOptions",
  },
  {
    key: "stage_status",
    label: "Trạng thái văn bản",
    type: "select",
    optionsProp: "statusOptions",
  },
  {
    key: "dateRange",
    label: "Ngày trên văn bản",
    type: "dateRange",
    fromKey: "documentDate.startDate",
    toKey: "documentDate.endDate",
  },
];

export const filterMeeting = [
  {
    name: 'Tiêu đề', code: 'title',
  },

]

export const advancedFilterConfigSourceMeeting = [
  {
    key: "documentType",
    label: "Loại lịch họp",
    type: "select",
    optionsProp: "docTypeOptions",
    crmSourceCode: "LOAILICHHOP",
  },
  {
    key: "roomIds",
    label: "Địa điểm",
    type: "select",
    optionsProp: "roomOptions",
    apiUrl: "/api/meeting-rooms/list",
    optionLabel: "name",
    optionValue: "id",
  },
  {
    key: "stage_status",
    label: "Trạng thái",
    type: "select",
    optionsProp: "statusOptions",
    crmSourceCode: "TRANGTHAILICHHOPCONGVIEC",
  },
  {
    key: "meetingDate",
    label: "Ngày họp",
    type: "dateRange",
    fromKey: "documentDate.startDate",
    toKey: "documentDate.endDate",
  },
];

export const statusOptions = [
  {
    label: "Đang xử lý",
    value: "CHUA_XU_LY",
  },
  {
    label: "Đã hoàn thành",
    value: "HOAN_THANH_VAN_BAN",
  },
  {
    label: "Trả lại",
    value: "TRA_LAI",
  },
  {
    label: "Chờ hoàn thành",
    value: "HOAN_THANH",
  },

]

