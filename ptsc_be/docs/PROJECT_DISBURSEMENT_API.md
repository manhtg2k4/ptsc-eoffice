# API Quản lý Thông tin Giải ngân Dự án

## Giới thiệu

API này cho phép quản lý thông tin giải ngân cho các dự án, bao gồm các chức năng:
- Thêm mới đợt giải ngân
- Cập nhật thông tin đợt giải ngân
- Xóa đợt giải ngân
- Lấy danh sách giải ngân kèm thông tin tóm tắt

## Mô tả Dữ liệu

### Thành phần Thông tin Giải ngân Dự án

1. **Tổng mức đầu tư**: Lấy từ trường `budget` của dự án. Nếu chưa nhập thì để trống (giá trị mặc định là 0)
2. **Tổng giải ngân**: Tính tổng của `disbursementAmount` từ tất cả các đợt giải ngân
3. **Số đợt giải ngân**: Tổng số bản ghi giải ngân của dự án
4. **Thời gian giải ngân**: 
   - Mặc định là ngày hiện tại khi tạo mới
   - Người tạo có thể chỉnh sửa thời gian
   - **Lưu ý**: Không cho phép chọn thời gian trước ngày bắt đầu của dự án
5. **Người giải ngân**: 
   - Chọn từ danh sách thành viên trong dự án
   - Chỉ cho phép chọn 1 người
6. **Ghi chú**: Tùy chọn, người dùng có thể thêm hoặc không

## Các Endpoint

### 1. Thêm mới đợt giải ngân

**Endpoint**: `POST /project/:id/disbursements`

**Permissions**: `updateGeneralInfo` (trong dự án)

**Request Body**:
```json
{
  "disbursementAmount": 100000000,
  "disbursementDate": "2026-04-24T00:00:00Z",
  "disbursedByUserId": "user123",
  "notes": "Giải ngân đợt 1 - Thanh toán vật liệu xây dựng"
}
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| disbursementAmount | number | ✓ | Số tiền giải ngân |
| disbursementDate | string (ISO 8601) | ✗ | Thời gian giải ngân (mặc định: ngày hôm nay) |
| disbursedByUserId | string | ✓ | ID người giải ngân (phải là thành viên dự án) |
| notes | string | ✗ | Ghi chú |

**Response** (200 OK):
```json
{
  "id": 1,
  "projectId": 1,
  "disbursementAmount": 100000000,
  "disbursementDate": "2026-04-24T00:00:00.000Z",
  "disbursedByUserId": "user123",
  "notes": "Giải ngân đợt 1 - Thanh toán vật liệu xây dựng",
  "createdAt": "2026-04-24T10:30:00.000Z",
  "updatedAt": "2026-04-24T10:30:00.000Z",
  "createdBy": "user456"
}
```

**Error Responses**:
- `404`: Dự án không tồn tại
- `400`: Người được chọn không phải thành viên dự án hoặc thời gian giải ngân trước ngày bắt đầu dự án

---

### 2. Lấy danh sách giải ngân

**Endpoint**: `GET /project/:id/disbursements`

**Permissions**: `viewAnalysis` (trong dự án)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Trang hiện tại |
| limit | number | 25 | Số bản ghi mỗi trang |

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "projectId": 1,
      "disbursementAmount": 100000000,
      "disbursementDate": "2026-04-24T00:00:00.000Z",
      "disbursedByUserId": "user123",
      "disbursedByUserName": "Nguyễn Văn A",
      "notes": "Giải ngân đợt 1",
      "createdAt": "2026-04-24T10:30:00.000Z",
      "updatedAt": "2026-04-24T10:30:00.000Z",
      "createdBy": "user456"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 25,
  "totalPages": 1
}
```

**Response Structure**:
- `data[]`: Danh sách các đợt giải ngân (được sắp xếp theo thời gian tạo mới nhất trước)
- `total`: Tổng số bản ghi
- `page`: Trang hiện tại
- `limit`: Số bản ghi mỗi trang
- `totalPages`: Tổng số trang

**Error Responses**:
- `404`: Dự án không tồn tại

---

### 3. Lấy thông tin tóm tắt giải ngân

**Endpoint**: `GET /project/:id/disbursements/summary`

**Permissions**: `viewAnalysis` (trong dự án)

**Response** (200 OK):
```json
{
  "totalInvestment": 500000000,
  "totalDisbursement": 250000000,
  "disbursementCount": 2
}
```

**Response Structure**:
- `totalInvestment`: Tổng mức đầu tư (lấy từ budget của dự án)
- `totalDisbursement`: Tổng giải ngân (tổng của tất cả disbursementAmount)
- `disbursementCount`: Số đợt giải ngân

**Error Responses**:
- `404`: Dự án không tồn tại

---

### 4. Cập nhật đợt giải ngân

**Endpoint**: `PATCH /project/:id/disbursements/:disbursementId`

**Permissions**: `updateGeneralInfo` (trong dự án)

**Request Body** (tất cả trường đều tùy chọn):
```json
{
  "disbursementAmount": 120000000,
  "disbursementDate": "2026-04-25T00:00:00Z",
  "disbursedByUserId": "user124",
  "notes": "Giải ngân đợt 1 - Cập nhật lại số tiền"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "projectId": 1,
  "disbursementAmount": 120000000,
  "disbursementDate": "2026-04-25T00:00:00.000Z",
  "disbursedByUserId": "user124",
  "notes": "Giải ngân đợt 1 - Cập nhật lại số tiền",
  "createdAt": "2026-04-24T10:30:00.000Z",
  "updatedAt": "2026-04-24T11:45:00.000Z",
  "createdBy": "user456"
}
```

**Error Responses**:
- `404`: Giải ngân hoặc dự án không tồn tại
- `400`: Người được chọn không phải thành viên dự án hoặc thời gian không hợp lệ

---

### 5. Xóa đợt giải ngân

**Endpoint**: `DELETE /project/:id/disbursements/:disbursementId`

**Permissions**: `updateGeneralInfo` (trong dự án)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Xóa giải ngân thành công"
}
```

**Note**: Đây là soft delete - bản ghi vẫn tồn tại trong database nhưng được đánh dấu là đã xóa (status = 3)

**Error Responses**:
- `404`: Giải ngân hoặc dự án không tồn tại

---

## Luồng Công việc

### Tạo mới Đợt Giải ngân

1. Người dùng gọi API `POST /project/:id/disbursements` với:
   - `disbursementAmount`: Số tiền muốn giải ngân
   - `disbursementDate`: Thời gian giải ngân (tùy chọn, mặc định là hôm nay)
   - `disbursedByUserId`: ID người giải ngân
   - `notes`: Ghi chú (tùy chọn)

2. Hệ thống kiểm tra:
   - Dự án tồn tại và đang hoạt động
   - Người giải ngân là thành viên của dự án
   - Ngày giải ngân không trước ngày bắt đầu dự án

3. Nếu hợp lệ, tạo bản ghi mới trong bảng `project_disbursements`

4. Trả về dữ liệu bản ghi vừa tạo

### Lấy Danh Sách Giải ngân

1. Người dùng gọi API `GET /project/:id/disbursements`

2. Hệ thống truy vấn:
   - Danh sách giải ngân của dự án (status = 1)
   - Thông tin người giải ngân từ bảng users

3. Trả về danh sách các đợt giải ngân

### Lấy Thông tin Tóm tắt

1. Người dùng gọi API `GET /project/:id/disbursements/summary`

2. Hệ thống tính toán:
   - Tổng mức đầu tư (từ project.budget)
   - Tổng giải ngân (tổng tất cả disbursementAmount)
   - Số lượng đợt giải ngân

3. Trả về thông tin tóm tắt

---

## Ghi Chú Quan trọng

1. **Quyền hạn**: Tất cả các endpoint đều yêu cầu quyền hạn `updateGeneralInfo` hoặc `viewAnalysis` tương ứng trong dự án
2. **Soft Delete**: Giải ngân được xóa không bị loại bỏ khỏi database, chỉ được đánh dấu là đã xóa (status = 3)
3. **Thời gian**: Tất cả thời gian đều sử dụng định dạng ISO 8601
4. **Thành viên Dự án**: Người giải ngân phải là thành viên của dự án hiện tại
5. **Ngày Bắt đầu**: Ngày giải ngân không được phép trước ngày bắt đầu của dự án

---

## Ví dụ cURL

### Thêm mới giải ngân
```bash
curl -X POST http://localhost:3000/project/1/disbursements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "disbursementAmount": 100000000,
    "disbursementDate": "2026-04-24T00:00:00Z",
    "disbursedByUserId": "user123",
    "notes": "Giải ngân đợt 1"
  }'
```Lấy thông tin tóm tắt
```bash
curl -X GET http://localhost:3000/project/1/disbursements/summary \
  -H "Authorization: Bearer <token>"
```

### 

### Lấy danh sách giải ngân
```bash
curl -X GET http://localhost:3000/project/1/disbursements \
  -H "Authorization: Bearer <token>"
```

### Cập nhật giải ngân
```bash
curl -X PATCH http://localhost:3000/project/1/disbursements/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "disbursementAmount": 120000000,
    "notes": "Cập nhật lại số tiền"
  }'
```

### Xóa giải ngân
```bash
curl -X DELETE http://localhost:3000/project/1/disbursements/1 \
  -H "Authorization: Bearer <token>"
```
