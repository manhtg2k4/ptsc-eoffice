# Module Phản ánh - Góp ý (Feedback Suggestions)

## 1. Tổng quan

Module quản lý quy trình tiếp nhận, điều phối và xử lý **phản ánh, kiến nghị** của cán bộ công nhân viên (CBCNV). Hệ thống hỗ trợ luồng nghiệp vụ hoàn chỉnh từ lúc gửi phản ánh đến khi hoàn thành xử lý và đánh giá chất lượng, tích hợp BPMN workflow.

**Base URL:** `{{LCTTHC}}/api/feedback-suggestions`

---

## 2. Cấu trúc thư mục

```
feedback-suggestions/
├── dto/
│   ├── create-feedback-suggestion.dto.ts
│   ├── update-feedback-suggestion.dto.ts
│   ├── list-feedback-suggestion.dto.ts
│   ├── dispatch-feedback.dto.ts
│   ├── reject-feedback.dto.ts
│   ├── complete-feedback.dto.ts
│   └── rating-feedback.dto.ts
├── entities/
│   ├── feedback-suggestion.entity.ts
│   └── feedback-history.entity.ts
├── feedback-suggestions.controller.ts
├── feedback-suggestions.service.ts
└── feedback-suggestions.module.ts
```

---

## 3. Luồng nghiệp vụ (Workflow)

```
CBCNV tạo → [1] Chờ điều phối → [2] Chờ xử lý → [3] Đang xử lý → [4] Hoàn thành
                     │                   │                │
                     ▼                   ▼                ▼
                  [5] Từ chối ←──────────────────────────┘
                     │
              Gửi lại (resubmit)
                     │
                     ▼
              [1] Chờ điều phối
```

### Trạng thái processStatus (số nguyên)

| Số | Trạng thái     | Mô tả                                     |
|----|----------------|-------------------------------------------|
| `1` | Chờ điều phối | Vừa tạo, chờ BPCT xem xét                |
| `2` | Chờ xử lý     | Đã điều phối, chờ người xử lý tiếp nhận  |
| `3` | Đang xử lý    | Đã tiếp nhận, đang xử lý                 |
| `4` | Hoàn thành    | Đã xử lý xong                            |
| `5` | Từ chối       | Bị từ chối (BPCT hoặc người xử lý)       |

> API trả về thêm field `processStatusLabel` kèm nhãn tiếng Việt tương ứng.

### Trạng thái status (vòng đời bản ghi)

| Số | Ý nghĩa       |
|----|---------------|
| `1` | Đang hoạt động |
| `3` | Đã xóa (soft delete) |

---

## 4. Cơ sở dữ liệu

### 4.1. Bảng `dbo.feedback_suggestions`

| Cột              | Kiểu               | Nullable | Mô tả                                              |
|------------------|--------------------|----------|----------------------------------------------------|
| `id`             | `uniqueidentifier` | Không    | UUID tự sinh                                       |
| `code`           | `nvarchar(50)`     | Không    | Mã duy nhất `YC-YYYYMMDD-XXX`                     |
| `type`           | `nvarchar(255)`    | Không    | Loại phản ánh                                      |
| `priority`       | `nvarchar(50)`     | Không    | Mã mức độ: `binhthuong` / `gap` / `khancap`       |
| `title`          | `nvarchar(200)`    | Không    | Tiêu đề (tối đa 200 ký tự)                        |
| `content`        | `nvarchar(MAX)`    | Không    | Nội dung chi tiết                                  |
| `files`          | `nvarchar(MAX)`    | Có       | JSON array file đính kèm                           |
| `status`         | `int`              | Không    | Vòng đời: `1`=active, `3`=đã xóa                  |
| `process_status` | `int`              | Không    | Trạng thái xử lý: 1–5 (xem bảng trên)            |
| `unit_id`        | `nvarchar(255)`    | Có       | ID người xử lý được điều phối tới                 |
| `processor_id`   | `nvarchar(255)`    | Có       | ID người xử lý cụ thể (tuỳ chọn)                 |
| `deadline`       | `datetime2`        | Có       | Hạn xử lý (SLA)                                   |
| `note`           | `nvarchar(MAX)`    | Có       | Ghi chú xử lý                                     |
| `result`         | `nvarchar(MAX)`    | Có       | Kết quả xử lý                                     |
| `overdue_reason` | `nvarchar(MAX)`    | Có       | Lý do quá hạn / từ chối                           |
| `created_by_id`  | `nvarchar(100)`    | Có       | FK → `users.id`                                    |
| `created_at`     | `datetime2`        | Không    | Thời gian tạo                                      |
| `updated_at`     | `datetime2`        | Không    | Thời gian cập nhật                                 |

### 4.2. Bảng `dbo.feedback_histories`

| Cột            | Kiểu               | Nullable | Mô tả                          |
|----------------|--------------------|----------|--------------------------------|
| `id`           | `uniqueidentifier` | Không    | UUID tự sinh                   |
| `feedback_id`  | `uniqueidentifier` | Không    | FK → `feedback_suggestions.id` |
| `action`       | `nvarchar(255)`    | Không    | Tên hành động                  |
| `note`         | `nvarchar(MAX)`    | Có       | Ghi chú kèm theo               |
| `performer_id` | `nvarchar(100)`    | Có       | FK → `users.id`                |
| `performed_at` | `datetime2`        | Không    | Thời gian thực hiện            |

### 4.3. Migration SQL

```sql
ALTER TABLE dbo.feedback_suggestions ADD process_status INT NULL;
UPDATE dbo.feedback_suggestions SET process_status = 1 WHERE process_status IS NULL;
ALTER TABLE dbo.feedback_suggestions ALTER COLUMN process_status INT NOT NULL;
ALTER TABLE dbo.feedback_suggestions ADD CONSTRAINT DF_feedback_process_status DEFAULT 1 FOR process_status;

ALTER TABLE dbo.feedback_suggestions DROP CONSTRAINT DF__feedback___statu__0EE3280B;
DROP INDEX IX_feedback_suggestions_status ON dbo.feedback_suggestions;
ALTER TABLE dbo.feedback_suggestions ALTER COLUMN status INT NULL;
```

---

## 5. API Endpoints

### 5.1. CRUD cơ bản

#### Tạo phản ánh (tích hợp BPMN workflow)
```
POST /feedback-suggestions
Authorization: Bearer {token}
```

**Body** (`CreateFeedbackSuggestionDto`):

| Trường     | Kiểu     | Bắt buộc | Mô tả                                              |
|------------|----------|----------|----------------------------------------------------|
| `type`     | `string` | ✅       | Loại phản ánh                                      |
| `priority` | `string` | ❌       | `binhthuong` (mặc định) \| `gap` \| `khancap`     |
| `title`    | `string` | ✅       | Tiêu đề (tối đa 200 ký tự)                        |
| `content`  | `string` | ✅       | Nội dung chi tiết                                  |
| `files`    | `any[]`  | ❌       | File minh chứng đính kèm                           |

> Khi tạo thành công, hệ thống tự động khởi tạo BPMN workflow, tạo `work_items` và `audit` record.

**Response**: Bản ghi vừa tạo, mã `YC-YYYYMMDD-XXX`, `processStatus: 1`, `processStatusLabel: "Chờ điều phối"`.

---

#### Xem chi tiết
```
GET /feedback-suggestions/:id
```
Trả về phản ánh kèm `histories`, `createdBy`, `processStatusLabel`, `priority` đã map nhãn tiếng Việt.

---

#### Cập nhật thông tin
```
PATCH /feedback-suggestions/:id
```

---

#### Xóa mềm hàng loạt
```
DELETE /feedback-suggestions
```
**Body**: `{ "ids": ["uuid-1", "uuid-2"] }`
Đặt `status = 3` cho các bản ghi có ID trong danh sách, không xóa vật lý khỏi DB.

---

### 5.2. Danh sách theo trạng thái

> **Role-based trong service:** `ADMIN_FEEDBACK`/`ADMIN` → thấy tất cả. Role khác → chỉ thấy bản ghi liên quan (`createdById = userId` HOẶC `unit_id = userId`). userId/userRole tự động lấy từ JWT.

| Endpoint                                      | processStatus | Mô tả               |
|-----------------------------------------------|---------------|---------------------|
| `GET /feedback-suggestions`                   | tất cả        | Toàn bộ (theo role) |
| `GET /feedback-suggestions/cho-dieu-phoi`     | 1             | Chờ điều phối       |
| `GET /feedback-suggestions/cho-xu-ly`         | 2             | Chờ xử lý           |
| `GET /feedback-suggestions/dang-xu-ly`        | 3             | Đang xử lý          |
| `GET /feedback-suggestions/hoan-thanh`        | 4             | Hoàn thành          |
| `GET /feedback-suggestions/tu-choi`           | 5             | Từ chối             |

**Query params chung:**

| Param           | Kiểu     | Mặc định    | Mô tả                                                        |
|-----------------|----------|-------------|--------------------------------------------------------------|
| `page`          | `number` | `1`         | Số trang                                                     |
| `limit`         | `number` | `10`        | Số bản ghi/trang                                             |
| `keyword`       | `string` | —           | Tìm theo tiêu đề / mã                                       |
| `type`          | `string` | —           | Lọc loại phản ánh                                            |
| `priority`      | `string` | —           | `binhthuong` / `gap` / `khancap`                             |
| `startDate`     | `string` | —           | Ngày tạo từ (ISO)                                            |
| `endDate`       | `string` | —           | Ngày tạo đến (ISO)                                          |
| `deadlineStart` | `string` | —           | Hạn xử lý từ (ISO)                                         |
| `deadlineEnd`   | `string` | —           | Hạn xử lý đến (ISO)                                        |
| `sortBy`        | `string` | `createdAt` | `createdAt` \| `deadline` \| `priority` \| `processStatus`  |
| `order`         | `string` | `DESC`      | `ASC` \| `DESC`                                             |



---

### 5.3. Hành động nghiệp vụ

#### Điều phối phản ánh (BPCT)
```
PATCH /feedback-suggestions/:id/dispatch
```

**Body** (`DispatchFeedbackDto`):

| Trường        | Bắt buộc | Mô tả                           |
|---------------|----------|---------------------------------|
| `unitId`      | ✅       | ID **người** xử lý được giao    |
| `processorId` | ❌       | ID người xử lý cụ thể (tuỳ chọn) |
| `deadline`    | ❌       | Hạn xử lý (ISO date string)    |
| `note`        | ❌       | Ghi chú điều phối               |

**Chuyển trạng thái**: `1 → 2` (Chờ điều phối → Chờ xử lý)

---

#### Từ chối điều phối (BPCT)
```
PATCH /feedback-suggestions/:id/reject-dispatch
```
**Body**: `{ "overdueReason": "..." }` — **Chuyển**: `1 → 5`

---

#### Tiếp nhận xử lý
```
PATCH /feedback-suggestions/:id/accept
```
Không cần body. **Chuyển**: `2 → 3`

---

#### Từ chối xử lý
```
PATCH /feedback-suggestions/:id/reject-unit
```
**Body**: `{ "overdueReason": "..." }` — **Chuyển**: `2/3 → 5`

---

#### Hoàn thành xử lý
```
PATCH /feedback-suggestions/:id/complete
```

**Body** (`CompleteFeedbackDto`):

| Trường          | Bắt buộc | Mô tả                   |
|-----------------|----------|-------------------------|
| `result`        | ✅       | Kết quả xử lý           |
| `overdueReason` | ❌       | Lý do quá hạn (nếu có) |
| `note`          | ❌       | Ghi chú                 |
| `resultFiles`   | ❌       | File minh chứng kết quả |

**Chuyển**: `3 → 4`

---

#### Gửi lại phản ánh (CBCNV)
```
PATCH /feedback-suggestions/:id/resubmit
```
**Body**: Các trường của `CreateFeedbackSuggestionDto` (tất cả optional). **Chuyển**: `5 → 1`

---

#### Đánh giá chất lượng (CBCNV)
```
POST /feedback-suggestions/:id/rating
```
**Body**: `{ "score": 1-5, "ratingComment": "..." }`

---

### 5.4. Thống kê & Xuất dữ liệu

```
GET /feedback-suggestions/stats?startDate=...&endDate=...
GET /feedback-suggestions/export   → file .xlsx (tối đa 5000 bản ghi)
```

---

## 6. Mã phản ánh

Định dạng: **`YC-YYYYMMDD-XXX`** — ví dụ: `YC-20260224-003`

---

## 7. Priority (Mức độ)

| Mã gửi lên    | Nhãn trả về     |
|---------------|-----------------|
| `binhthuong`  | Bình thường     |
| `gap`         | Gấp             |
| `khancap`     | Khẩn cấp        |

---

## 8. Ví dụ CURL

```bash
BASE_URL="{{LCTTHC}}/api/feedback-suggestions"
TOKEN="YOUR_JWT_TOKEN"
```

### 8.1. Tạo phản ánh
```bash
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "Thủ tục hành chính nội bộ",
    "priority": "binhthuong",
    "title": "Phản ánh về quy trình xử lý hồ sơ",
    "content": "Nội dung chi tiết phản ánh...",
    "files": []
  }'
```

### 8.2. Danh sách phản ánh (Tất cả - theo role)
```bash
# Tất cả liên quan đến tôi
curl -X GET "$BASE_URL?page=1&limit=10&sortBy=createdAt&order=DESC" \
  -H "Authorization: Bearer $TOKEN"
```

### 8.3. Danh sách theo trạng thái
```bash
# Chờ điều phối
curl -X GET "$BASE_URL/cho-dieu-phoi?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Chờ xử lý
curl -X GET "$BASE_URL/cho-xu-ly?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Đang xử lý
curl -X GET "$BASE_URL/dang-xu-ly?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Hoàn thành
curl -X GET "$BASE_URL/hoan-thanh?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Từ chối
curl -X GET "$BASE_URL/tu-choi?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 8.6. Xem chi tiết
```bash
curl -X GET "$BASE_URL/{id}" -H "Authorization: Bearer $TOKEN"
```

### 8.7. Cập nhật
```bash
curl -X PATCH "$BASE_URL/{id}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "title": "Tiêu đề cập nhật", "content": "Nội dung cập nhật" }'
```

### 8.8. Xóa mềm hàng loạt
```bash
curl -X DELETE "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "ids": ["id-1", "id-2"] }'
```

### 8.9. Điều phối (BPCT) — processStatus: 1 → 2
```bash
curl -X PATCH "$BASE_URL/{id}/dispatch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "unitId": "user-id-nguoi-xu-ly",
    "deadline": "2026-03-15T00:00:00.000Z",
    "note": "Ghi chú điều phối"
  }'
```

### 8.10. Từ chối điều phối (BPCT) — processStatus: 1 → 5
```bash
curl -X PATCH "$BASE_URL/{id}/reject-dispatch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "overdueReason": "Nội dung phản ánh không rõ ràng" }'
```

### 8.11. Tiếp nhận xử lý — processStatus: 2 → 3
```bash
curl -X PATCH "$BASE_URL/{id}/accept" -H "Authorization: Bearer $TOKEN"
```

### 8.12. Từ chối xử lý — processStatus: 2/3 → 5
```bash
curl -X PATCH "$BASE_URL/{id}/reject-unit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "overdueReason": "Không thuộc phạm vi xử lý" }'
```

### 8.13. Hoàn thành — processStatus: 3 → 4
```bash
curl -X PATCH "$BASE_URL/{id}/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "result": "Đã xử lý xong phản ánh...",
    "note": "Ghi chú bổ sung",
    "resultFiles": []
  }'
```

### 8.14. Gửi lại (CBCNV) — processStatus: 5 → 1
```bash
curl -X PATCH "$BASE_URL/{id}/resubmit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "title": "Tiêu đề chỉnh sửa", "content": "Nội dung bổ sung chi tiết..." }'
```

### 8.15. Đánh giá chất lượng (CBCNV)
```bash
curl -X POST "$BASE_URL/{id}/rating" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "score": 5, "ratingComment": "Xử lý nhanh chóng, rất hài lòng" }'
```

### 8.16. Thống kê
```bash
curl -X GET "$BASE_URL/stats?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

### 8.17. Xuất Excel
```bash
curl -X GET "$BASE_URL/export?page=1&limit=5000" \
  -H "Authorization: Bearer $TOKEN" \
  -o "PhanAnh_export.xlsx"
```

