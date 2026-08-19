import * as yup from 'yup';
import dayjs from 'dayjs';

// Stage constants (trạng thái hoạt động của phòng)
export const STAGE = {
    INACTIVE: 0,
    ACTIVE: 1,
    MAINTENANCE: 2,
};

// Stage options for select
export const STAGE_OPTIONS = [
    { id: STAGE.ACTIVE, name: 'Đang hoạt động' },
    { id: STAGE.INACTIVE, name: 'Ngừng hoạt động' },
    { id: STAGE.MAINTENANCE, name: 'Bảo trì' },
];

// Amenities options (thiết bị)
export const AMENITIES_OPTIONS = [
    { id: 'projector', name: 'Máy chiếu' },
    { id: 'tv', name: 'Màn hình TV' },
    { id: 'sound', name: 'Hệ thống âm thanh' },
    { id: 'video_conf', name: 'Thiết bị họp trực tuyến' },
    { id: 'whiteboard', name: 'Bảng trắng' },
];

// Room type options (loại phòng họp)
export const ROOM_TYPE_OPTIONS = [
    { id: 'hoi_thao', name: 'Hội thảo' },
    { id: 'tiec_bach', name: 'Tiệc bách' },
    { id: 'lop_hoc', name: 'Lớp học' },
];

// Layout type options (kiểu bố trí phòng)
export const LAYOUT_TYPE_OPTIONS = [
    // { id: 'doi_xung', name: 'Đối xứng' },
    { id: 'hoi_truong', name: 'Hội trường' },
    { id: 'theater_block', name: 'Hội trường khối' },
    { id: 'u_shape', name: 'Chữ U' },
    { id: 'u_shape_double', name: 'Chữ U kép' },
    { id: 'o_shape', name: 'Tròn' },
    // { id: 'classroom', name: 'Lớp học' },
    // { id: 'h_shape', name: 'Chữ H' },
    // { id: 'l_shape', name: 'Chữ L' },
    // { id: 't_shape', name: 'Hình chữ T' },
    // { id: 'e_shape', name: 'Hình chữ E' },
    // { id: 'boardroom', name: 'Bàn họp lớn' },
    { id: 'meeting_table', name: 'Bàn họp (Classic)' },
];

// Usage Status constants (tình trạng sử dụng)
export const USAGE_STATUS = {
    AVAILABLE: 1, // Đang trống
    MAINTENANCE: 2, // Bảo trì`
    // PENDING: 2,   // Đang chờ duyệt
    // BOOKED: 3,    // Đã đặt
    // MEETING: 4,   // Đang họp
    // MAINTENANCE: 5 // Bảo trì
};

// Usage status options for select
// Usage status options for select
export const USAGE_STATUS_OPTIONS = [
    // { id: USAGE_STATUS.AVAILABLE, name: 'Đang trống', color: '#757575' }, // Xám
    // { id: USAGE_STATUS.PENDING, name: 'Đang chờ duyệt', color: '#ffeb3b' }, // Vàng
    { id: USAGE_STATUS.AVAILABLE, name: 'Sẵn sàng sử dụng', color: '#2e7d32' }, // Xanh dương
    // { id: USAGE_STATUS.MEETING, name: 'Đang họp', color: '#2e7d32' }, // Xanh lá
    { id: USAGE_STATUS.MAINTENANCE, name: 'Bảo trì', color: '#d32f2f' } // Đỏ
];


// Default values
export const DEFAULT_VALUES = {
    CAPACITY: 20,
    STAGE: STAGE.ACTIVE,
    LAYOUT_COL_WING: 1, // Number of columns for wings (sides) 
    LAYOUT_ROW_BOTTOM: 1, // Number of rows for bottom edge
};

// Validation schema for Meeting Room form
export const meetingRoomSchema = yup.object().shape({
    
    name: yup
        .string()
        .required('Tên phòng họp là bắt buộc')
        .min(3, 'Tên phòng họp phải có ít nhất 3 ký tự')
        .max(100, 'Tên phòng họp không được vượt quá 100 ký tự'),
    
    location: yup
        .string()
        .required('Địa điểm là bắt buộc')
        .max(200, 'Địa điểm không được vượt quá 200 ký tự'),
    
    capacity: yup
        .number()
        .typeError('Sức chứa phải là số')
        .required('Sức chứa là bắt buộc')
        .positive('Sức chứa phải lớn hơn 0')
        .integer('Sức chứa phải là số nguyên')
        .min(1, 'Sức chứa tối thiểu là 1 người')
        .max(1000, 'Sức chứa tối đa là 1000 người')
        .default(DEFAULT_VALUES.CAPACITY),

    availableFrom: yup
        .mixed()
        .required('Thời gian khả dụng là bắt buộc')
        .test('is-valid-date', 'Thời gian không hợp lệ', value => !value || dayjs(value).isValid()),
    
    amenities: yup
        .array()
        .of(yup.string())
        .nullable(),
    
    status: yup
        .number()
        .default(DEFAULT_VALUES.STATUS),
    
    stage: yup
        .number()
        .required('Trạng thái là bắt buộc')
        .oneOf([STAGE.INACTIVE, STAGE.ACTIVE, STAGE.MAINTENANCE], 'Trạng thái không hợp lệ')
        .default(DEFAULT_VALUES.STAGE),
});

// Helper to calculate total seats based on layout type
export const calculateTotalSeats = (layoutType, numRows, numSeats, numBlocks = 1, layoutColWing = 1, layoutRowBottom = 1) => {
    const r = Number(numRows) || 0;
    const c = Number(numSeats) || 0;
    const blocks = Number(numBlocks) || 1;
    const wing = Number(layoutColWing) || 1;
    const bottom = Number(layoutRowBottom) || 1;
    
    // numSeats is total seats per row (width)
    // blocks is number of groups

    if (layoutType === 'meeting_table') {
        if (r < 2) return r * c;
        return 2 + ((r - 2) * 2);
    } else if (layoutType === 'o_shape' || layoutType === 'boardroom') {
         if (r < 2 || c < 2) return r * c;
         return (r * 2) + ((c - 2) * 2);
    } else if (layoutType === 'u_shape') {
        // Wing seats: (Total Rows - Top Gap (1) - Bottom Thick) * (Wing Thick * 2)
        const wingSeats = Math.max(0, r - 1 - bottom) * (wing * 2);
        // Bottom seats: (Bottom Thick * total width)
        const bottomSeats = Math.max(0, bottom) * c;
        
        // If bottom overlaps with top gap (row 0), we need to subtract those seats from bottomSeats
        const overlapWithTopGap = Math.max(0, (bottom - (r - 1))); 
        const total = wingSeats + bottomSeats - (overlapWithTopGap * c);
        return Math.max(0, total);
    } else if (layoutType === 'u_shape_double') {
        const numGaps = blocks - 1;
        const topRows = Math.max(0, r - 2);
        const bottomRows = Math.min(r, 2);
        // Top rows: only 4 seats if width allows, minus any gaps that happen to be in those 4 cols (usually 0)
        const seatsTop = topRows * Math.min(4, c - numGaps);
        // Bottom rows: full width
        const seatsBottom = bottomRows * c;
        return seatsTop + seatsBottom;
    } else if (layoutType === 'theater_block' || layoutType === 'classroom' || layoutType === 'hoi_truong' || layoutType === 'doi_xung') {
        const numGaps = blocks - 1;
        return r * (c - numGaps);
    } else if (layoutType === 'h_shape') {
        return (r * 2) + Math.max(0, c - 2);
    } else if (layoutType === 'l_shape' || layoutType === 't_shape') {
        return r + c - 1;
    } else if (layoutType === 'e_shape') {
        return r + (c - 1) * 3;
    } else {
        // theater, classroom, doi_xung, hoi_truong, theater_block
        return r * c;
    }
};

