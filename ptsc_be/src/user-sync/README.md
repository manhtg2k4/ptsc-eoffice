# 🔄 User Sync Module - Đồng bộ User giữa Keycloak và MongoDB

Module này cung cấp các API để đồng bộ 2 chiều giữa Keycloak và MongoDB.

## 📋 Tính năng

- ✅ Lấy danh sách user từ Keycloak
- ✅ Đồng bộ user từ Keycloak → MongoDB
- ✅ Đồng bộ user từ MongoDB → Keycloak
- ✅ Đồng bộ 2 chiều (Full Sync)
- ✅ Tự động tạo/cập nhật user
- ✅ Kiểm tra trạng thái kết nối

## 🔐 Cấu hình Environment Variables

Thêm các biến sau vào `ecosystem.config.js`:

```javascript
KEYCLOAK_ADMIN_URL: 'https://lifesso.lifetex.vn:9445',
KEYCLOAK_REALM: 'master',
KEYCLOAK_ADMIN_USERNAME: 'admin',
KEYCLOAK_ADMIN_PASSWORD: 'admin',
```

## 🚀 API Endpoints

### 1. Kiểm tra kết nối
```bash
GET /api/user-sync/status
```

**Response:**
```json
{
  "success": true,
  "message": "Connected to Keycloak successfully",
  "timestamp": "2025-11-03T14:00:00.000Z"
}
```

---

### 2. Lấy danh sách user từ Keycloak
```bash
GET /api/user-sync/keycloak-users?max=100
```

**Query Parameters:**
- `max` (optional): Số lượng user tối đa (default: 100)

**Response:**
```json
[
  {
    "id": "abc-123",
    "username": "john.doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "enabled": true,
    "emailVerified": true
  }
]
```

---

### 3. Đồng bộ từ Keycloak → MongoDB
```bash
POST /api/user-sync/from-keycloak
```

**Mô tả:** Lấy toàn bộ user từ Keycloak và đồng bộ sang MongoDB:
- Nếu user đã tồn tại (theo `username` hoặc `keycloakUserId`) → **Cập nhật**
- Nếu user chưa tồn tại → **Tạo mới**

**Response:**
```json
{
  "success": true,
  "message": "Sync from Keycloak to MongoDB completed",
  "result": {
    "total": 50,
    "created": 10,
    "updated": 40,
    "failed": 0
  }
}
```

---

### 4. Đồng bộ từ MongoDB → Keycloak
```bash
POST /api/user-sync/to-keycloak
```

**Mô tả:** Lấy toàn bộ user từ MongoDB (status != -1) và đồng bộ sang Keycloak:
- Nếu user có `keycloakUserId` → **Cập nhật** trên Keycloak
- Nếu user chưa có `keycloakUserId` → **Tạo mới** trên Keycloak và lưu `keycloakUserId` vào MongoDB
- Nếu username đã tồn tại trên Keycloak → **Skip**

**Response:**
```json
{
  "success": true,
  "message": "Sync from MongoDB to Keycloak completed",
  "result": {
    "total": 55,
    "created": 5,
    "updated": 45,
    "failed": 0,
    "skipped": 5
  }
}
```

---

### 5. Đồng bộ 2 chiều (Full Sync)
```bash
POST /api/user-sync/full
```

**Mô tả:** Thực hiện đồng bộ 2 chiều:
1. **Bước 1:** Keycloak → MongoDB
2. **Bước 2:** MongoDB → Keycloak

**Response:**
```json
{
  "success": true,
  "message": "Full bi-directional sync completed",
  "result": {
    "keycloakToMongo": {
      "total": 50,
      "created": 10,
      "updated": 40,
      "failed": 0
    },
    "mongoToKeycloak": {
      "total": 55,
      "created": 5,
      "updated": 45,
      "failed": 0,
      "skipped": 5
    }
  }
}
```

---

## 📝 Cách sử dụng

### Bước 1: Kiểm tra kết nối
```bash
curl http://localhost:3156/api/user-sync/status
```

### Bước 2: Đồng bộ từ Keycloak sang MongoDB
```bash
curl -X POST http://localhost:3156/api/user-sync/from-keycloak
```

### Bước 3: Đồng bộ từ MongoDB sang Keycloak
```bash
curl -X POST http://localhost:3156/api/user-sync/to-keycloak
```

### Hoặc: Đồng bộ 2 chiều
```bash
curl -X POST http://localhost:3156/api/user-sync/full
```

---

## 🔍 Logic đồng bộ

### Keycloak → MongoDB
- **Match điều kiện:** `username` hoặc `keycloakUserId`
- **Tạo mới:** Nếu không tìm thấy user trong MongoDB
- **Cập nhật:** Nếu tìm thấy user → cập nhật thông tin

### MongoDB → Keycloak
- **Có keycloakUserId:** Cập nhật user trên Keycloak
- **Không có keycloakUserId:** Tạo user mới trên Keycloak và lưu ID về MongoDB
- **Username trùng:** Skip (không tạo duplicate)
- **Password mặc định:** `Lifetek@2024` (nếu không có password)

---

## ⚠️ Lưu ý

1. **Permissions:** Keycloak admin user cần có quyền:
   - `view-users`
   - `manage-users`
   - `query-users`

2. **Schema MongoDB:** 
   - Đã thêm field `keycloakUserId` vào User schema
   - Field này dùng để map user giữa 2 hệ thống

3. **Performance:**
   - Đồng bộ lần đầu có thể mất nhiều thời gian (tùy số lượng user)
   - Token admin được cache và tự động refresh

4. **Error Handling:**
   - Nếu 1 user bị lỗi, các user khác vẫn tiếp tục sync
   - Chi tiết lỗi được log trong console

---

## 🔧 Scheduled Job (Optional)

Có thể thêm scheduled job để tự động đồng bộ định kỳ:

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async autoSync() {
  await this.userSyncService.fullSync();
}
```

---

## 📊 Monitoring

Xem log để theo dõi quá trình đồng bộ:

```
✅ Fetched 50 users from Keycloak
➕ Created user: john.doe
✏️ Updated user: jane.smith
⏭️ User already exists in Keycloak: admin
❌ Failed to sync user: invalid-user
✅ Sync completed: {"total":50,"created":10,"updated":40,"failed":0}
```

---

## 🆘 Troubleshooting

### Lỗi: "Cannot authenticate with Keycloak"
- Kiểm tra `KEYCLOAK_ADMIN_USERNAME` và `KEYCLOAK_ADMIN_PASSWORD`
- Kiểm tra kết nối tới `KEYCLOAK_ADMIN_URL`

### Lỗi: "User already exists"
- User đã tồn tại trên Keycloak với username trùng
- Có thể cần update thay vì create

### Lỗi: SSL/TLS
- Đã config `rejectUnauthorized: false` cho self-signed cert
- Nếu vẫn lỗi, kiểm tra firewall/proxy

---

## 📦 Dependencies

- `@nestjs/common`
- `@nestjs/mongoose`
- `axios`
- `mongoose`

---

## 👨‍💻 Maintainer

Module được phát triển để đồng bộ user giữa Keycloak và MongoDB cho hệ thống Ban Cơ Yếu.

