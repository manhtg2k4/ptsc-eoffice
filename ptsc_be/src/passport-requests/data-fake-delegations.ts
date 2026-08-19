/**
 * Fake data danh sách Đoàn ra (thay thế HRM sau này)
 * Dùng cho dropdown "Tên đoàn" trong form tạo yêu cầu đoàn ra
 * Khi chọn đoàn → auto-fill: trưởng đoàn, chức vụ
 */
export const fakeDelegationData = [
    {
        id: 'DG001',
        name: 'Đoàn công tác Nhật Bản',
        leaderName: 'Nguyễn Hữu Trung',
        leaderTitle: 'Trưởng ban Kế hoạch - Đầu tư',
        destination: 'Tokyo, Nhật Bản',
    },
    {
        id: 'DG002',
        name: 'Đoàn khảo sát Hàn Quốc',
        leaderName: 'Trần Quốc Việt',
        leaderTitle: 'Phó Tổng Giám đốc',
        destination: 'Seoul, Hàn Quốc',
    },
    {
        id: 'DG003',
        name: 'Đoàn đàm phán Singapore',
        leaderName: 'Lê Minh Tuấn',
        leaderTitle: 'Trưởng ban CNTT',
        destination: 'Singapore',
    },
    {
        id: 'DG004',
        name: 'Đoàn hợp tác Trung Quốc',
        leaderName: 'Phạm Thanh Sơn',
        leaderTitle: 'Chánh Văn phòng',
        destination: 'Thượng Hải, Trung Quốc',
    },
    {
        id: 'DG005',
        name: 'Đoàn tập huấn Đức',
        leaderName: 'Hoàng Đức Thắng',
        leaderTitle: 'Phó Trưởng ban Tài chính',
        destination: 'Hamburg, Đức',
    },
];
