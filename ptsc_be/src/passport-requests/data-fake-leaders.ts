/**
 * Fake data danh sách Lãnh đạo (thay thế HRM sau này)
 * Dùng cho dropdown "Lãnh đạo" trong form tạo yêu cầu mượn HC
 * Mỗi lãnh đạo có thể phụ trách nhiều nhân viên
 */
export const fakeLeaderData = [
    {
        id: 'LD001',
        employeeNumber: 'NV20001',
        nameVn: 'Nguyễn Hữu Trung',
        email: 'nguyen.huu.trung@tcsg.vn',
        position: 'Trưởng ban',
        rank: 'Đại tá',
        unit: 'Ban Kế hoạch - Đầu tư',
    },
    {
        id: 'LD002',
        employeeNumber: 'NV20002',
        nameVn: 'Trần Quốc Việt',
        email: 'tran.quoc.viet@tcsg.vn',
        position: 'Phó Tổng Giám đốc',
        rank: 'Đại tá',
        unit: 'Ban Giám đốc',
    },
    {
        id: 'LD003',
        employeeNumber: 'NV20003',
        nameVn: 'Lê Minh Tuấn',
        email: 'le.minh.tuan@tcsg.vn',
        position: 'Trưởng ban',
        rank: 'Thượng tá',
        unit: 'Ban Công nghệ thông tin',
    },
    {
        id: 'LD004',
        employeeNumber: 'NV20004',
        nameVn: 'Phạm Thanh Sơn',
        email: 'pham.thanh.son@tcsg.vn',
        position: 'Chánh Văn phòng',
        rank: 'Thượng tá',
        unit: 'Văn phòng',
    },
    {
        id: 'LD005',
        employeeNumber: 'NV20005',
        nameVn: 'Hoàng Đức Thắng',
        email: 'hoang.duc.thang@tcsg.vn',
        position: 'Phó Trưởng ban',
        rank: 'Trung tá',
        unit: 'Ban Tài chính - Kế toán',
    },
];
