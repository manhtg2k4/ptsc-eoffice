export const DESTROY_REASON_MAP = {
    HET_THOI_HAN: 'Hết thời hạn lưu trữ theo quy định',
    TRUNG_LAP: 'Hồ sơ trùng lặp',
    HU_HONG: 'Hồ sơ bị hư hỏng',
    HET_RANG_BUOC_PHAP_LY: 'Không còn ràng buộc pháp lý',
    KHONG_CON_GIA_TRI: 'Không còn giá trị sử dụng',
};

export const STATUS_MAP = {
    '0': 'Chưa trình',
    '1': 'Chờ văn phòng phê duyệt',
    '2': 'Chờ lãnh đạo phê duyệt',
    '3': 'Đã phê duyệt',
    '4': 'Đã trả lại',
    '5': 'Hoàn thành',
    '6': 'Văn phòng đã trả lại',
    '7': 'Lãnh đạo đã trả lại',
};

export const DESTROY_STATUS_LABELS = {
    '0': 'Chưa trình',
    '1': 'Chờ văn phòng phê duyệt',
    '2': 'Chờ lãnh đạo phê duyệt',
    '3': 'Đã phê duyệt',
    '4': 'Đã trả lại',
    '5': 'Hoàn thành',
    '6': 'Văn phòng đã trả lại',
    '7': 'Lãnh đạo đã trả lại',
};

export const DESTROY_LEADER_STATUS_LABELS = {
    '0': 'Chưa trình',
    '1': 'Chờ lãnh đạo phê duyệt',
    '2': 'Chờ lãnh đạo phê duyệt',
    '3': 'Đã phê duyệt',
    '4': 'Đã trả lại',
    '5': 'Hoàn thành',
    '6': 'Văn phòng đã trả lại',
    '7': 'Lãnh đạo đã trả lại',
};

export const DESTROY_COMMANDER_STATUS_LABELS = {
    '0': 'Chờ văn phòng phê duyệt',
    '1': 'Chờ văn phòng phê duyệt',
    '2': 'Chờ lãnh đạo phê duyệt',
    '3': 'Đã phê duyệt',
    '4': 'Đã trả lại',
    '5': 'Hoàn thành',
    '6': 'Văn phòng đã trả lại',
    '7': 'Lãnh đạo đã trả lại',
};

export const DESTROY_STATUS_MAP = {
    ...DESTROY_STATUS_LABELS,
};
