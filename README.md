# PTSC E-Office

Hệ thống Văn phòng điện tử PTSC (E-Office PTSC) bao gồm 2 thành phần chính:
- **Backend**: NestJS (`ptsc_be`)
- **Frontend**: ReactJS (`ptsc_fe`)

---

## 🛠️ Hướng dẫn cài đặt và cấu hình môi trường (.env)

### 1. Cấu hình Backend (`ptsc_be`)

Di chuyển vào thư mục backend và tạo file `.env` từ file mẫu `.env.example`:

```bash
cd ptsc_be
cp .env.example .env
```

Mở file `.env` vừa tạo và cấu hình các thông số phù hợp:

```properties
PORT=3156

# Cấu hình SQL Server
SQLSERVER_HOST=192.168.10.158
SQLSERVER_PORT=1433
SQLSERVER_DATABASE=app_ptsc
SQLSERVER_USER=lifetex
SQLSERVER_PASSWORD=LTLT@2025

# JWT Secret
JWT_SECRET=0a6b944d-d2fb-46fc-a85e-0295c986cd9f

# Cấu hình Redis
REDIS_HOST=192.168.0.77
REDIS_PORT=6379
REDIS_PASSWORD=LTLT@2026
REDIS_DB=0

# Cấu hình MinIO
CONFIG_MINIO_FROM_ENV=true
ACTIVE_TYPE=minio
MINIO_ACCESS_KEY=admin
MINIO_BUCKET=tancang
MINIO_ENDPOINT=minio.lifetex.vn:9002
MINIO_SECRET_KEY=password123
```

#### Chạy Backend:
```bash
npm install
npm run start:dev
```

---

### 2. Cấu hình Frontend (`ptsc_fe`)

Di chuyển vào thư mục frontend và tạo file `.env` từ file mẫu `.env.example`:

```bash
cd ../ptsc_fe
cp .env.example .env
```

Nội dung file `.env` Frontend:

```properties
REACT_APP_WSO2_AUTHORIZATION_URL=https://lifesso.lifetex.vn:9445/oauth2/authorize
REACT_APP_WSO2_TOKEN_URL=https://lifesso.lifetex.vn:9445/oauth2/token
REACT_APP_WSO2_USER_INFO_URL=https://lifesso.lifetex.vn:9445/oauth2/userinfo
REACT_APP_WSO2_CLIENT_ID=fyG0Ofbuekh08hKARMxfkOXd_4Ia
REACT_APP_WSO2_CLIENT_SECRET=XbtCAMuADk9FvbIJ5Nf8bhCs2J7wVFVxWfB5hfeDbOUa
REACT_APP_WSO2_REDIRECT_URI=http://localhost:8080/auth/callback
REACT_APP_WSO2_SCOPE=openid address email groups profile roles
REACT_APP_WSO2_POST_LOGOUT_REDIRECT_URI=http://localhost:8080/
```

Ngoài ra, cấu hình API URL cho Frontend nằm ở: `src/assets/js/appConfig.js`:
- `APP_BASE_URL`: `http://localhost:3156`
- `APP_DHVB`: `http://localhost:3156/api`

#### Chạy Frontend:
```bash
npm install
npm start
```

---

## 📁 Cấu trúc thư mục

```
eoffice_ptsc/
├── ptsc_be/                 # Mã nguồn Backend (NestJS, SQL Server, Redis, MinIO)
│   ├── .env.example         # File mẫu biến môi trường Backend
│   ├── src/                 # Code logic backend
│   └── scripts/             # Scripts hỗ trợ (tạo admin, migrate dữ liệu)
├── ptsc_fe/                 # Mã nguồn Frontend (ReactJS)
│   ├── .env.example         # File mẫu biến môi trường Frontend
│   └── src/                 # Giao diện & component
├── .gitignore               # Cấu hình bỏ qua node_modules, .env khi commit
└── README.md                # Tài liệu hướng dẫn dự án
```

---

## 🔒 Lưu ý bảo mật
- **Tuyệt đối không đẩy file `.env` lên GitHub** (đã được cấu hình trong `.gitignore`).
- Khi triển khai lên server production, vui lòng thay đổi các khóa bí mật (`JWT_SECRET`, `KEYCLOAK_CLIENT_SECRET`, mật khẩu Database/Redis/MinIO).
