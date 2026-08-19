#!/bin/bash
# =============================================================================
# NEWS WORKFLOW API - CURL EXAMPLES
# =============================================================================
# Hướng dẫn sử dụng các API endpoint cho luồng quản lý tin tức
# 
# Yêu cầu:
# - Đã đăng nhập và có JWT token
# - Có quyền truy cập các endpoint tương ứng
# - Đã cấu hình BPMN workflow cho tin tức
# =============================================================================

# =============================================================================
# CONFIGURATION
# =============================================================================
BASE_URL="http://localhost:3000"
TOKEN="your_jwt_token_here"

# =============================================================================
# 1. TẠO TIN TỨC MỚI (Create News)
# =============================================================================
# Endpoint: POST /news
# Description: Tạo tin tức mới và khởi tạo workflow từ StartEvent
# Required: title, content, authorId
# Response: Trả về tin tức đã tạo với status = 0 (Draft)

curl -X POST "${BASE_URL}/news" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Thông báo quan trọng về chính sách mới",
    "content": "<p>Nội dung chi tiết về chính sách...</p>",
    "summary": "Tóm tắt nội dung",
    "nameThumbnail": "thumbnail.jpg",
    "topic": "chinh-sach",
    "tags": ["chính sách", "thông báo"],
    "processKey": "quan_ly_tin_tuc",
    "flowId": "flow_news_001"
  }'

# Response example:
# {
#   "status": 1,
#   "document": {
#     "id": 123,
#     "title": "Thông báo quan trọng...",
#     "status": 0,
#     "authorId": "user_001",
#     "authorName": "Nguyễn Văn A",
#     "createdAt": "2026-01-10T02:00:00.000Z"
#   }
# }

# =============================================================================
# 2. LƯU NHÁP (Save Draft) - Optional
# =============================================================================
# Endpoint: PATCH /news/:id
# Description: Cập nhật nội dung tin tức khi đang ở trạng thái nháp
# Required: id của tin tức

NEWS_ID=123

curl -X PATCH "${BASE_URL}/news/${NEWS_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Thông báo quan trọng về chính sách mới (Đã chỉnh sửa)",
    "content": "<p>Nội dung đã được cập nhật...</p>",
    "summary": "Tóm tắt mới"
  }'

# =============================================================================
# 3. TRÌNH DUYỆT TIN TỨC (Submit for Approval)
# =============================================================================
# Endpoint: POST /news/submit/:workItemId
# Description: Gửi tin tức (hoặc nhiều tin) đến bước tiếp theo trong workflow
# Required: workItemId (lấy từ work-items của tin tức), ids (array), roleCode, processKey
# Note: workItemId được tạo khi create news, cần query từ work-items endpoint

WORK_ITEM_ID="wi_1736476800000_abc123"

curl -X POST "${BASE_URL}/news/submit/${WORK_ITEM_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "ids": [123],
    "roleCode": "TRUONG_PHONG",
    "processKey": "quan_ly_tin_tuc",
    "note": "Đề nghị xem xét và phê duyệt"
  }'

# Trình duyệt nhiều tin cùng lúc:
curl -X POST "${BASE_URL}/news/submit/${WORK_ITEM_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "ids": [123, 124, 125],
    "roleCode": "TRUONG_PHONG",
    "processKey": "quan_ly_tin_tuc",
    "note": "Gửi 3 tin tức cùng lúc để phê duyệt"
  }'

# Response example:
# {
#   "status": 1,
#   "document": {
#     "id": 123,
#     "status": 0,
#     "workItems": [...]
#   }
# }

# =============================================================================
# 4. PHÊ DUYỆT TIN TỨC (Approve News)
# =============================================================================
# Endpoint: POST /news/:id/approve
# Description: Phê duyệt tin tức và chuyển đến bước tiếp theo (hoặc hoàn thành)
# Required: id, workItemId (work item của người phê duyệt)
# Optional: note, publishImmediately (xuất bản ngay lập tức)
# Note: Tìm flow có name='DUYET' trong BPMN

# Phê duyệt và giữ ở trạng thái chờ:
curl -X POST "${BASE_URL}/news/123/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "workItemId": "wi_1736476900000_def456",
    "note": "Nội dung tốt, đồng ý phê duyệt",
    "publishImmediately": false
  }'

# Phê duyệt và xuất bản ngay:
curl -X POST "${BASE_URL}/news/123/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "workItemId": "wi_1736476900000_def456",
    "note": "Phê duyệt và xuất bản ngay",
    "publishImmediately": true
  }'

# Response example:
# {
#   "status": 1,
#   "document": {
#     "id": 123,
#     "status": 1,
#     "reviewerId": "user_002",
#     "reviewerName": "Trần Văn B",
#     "publishedAt": "2026-01-10T03:00:00.000Z"
#   }
# }

# =============================================================================
# 5. TỪ CHỐI TIN TỨC (Reject News)
# =============================================================================
# Endpoint: POST /news/:id/reject
# Description: Từ chối tin tức và trả lại cho tác giả để chỉnh sửa
# Required: id, workItemId, reason
# Optional: note
# Note: Tìm flow có name='TRA_LAI' hoặc 'TRA_LAI_TIN' trong BPMN

curl -X POST "${BASE_URL}/news/123/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "workItemId": "wi_1736476900000_def456",
    "reason": "Nội dung chưa đầy đủ, cần bổ sung thêm thông tin",
    "note": "Vui lòng thêm số liệu và nguồn tham khảo"
  }'

# Response example:
# {
#   "status": 1,
#   "document": {
#     "id": 123,
#     "status": 0,
#     "reviewerId": "user_002",
#     "reviewerName": "Trần Văn B"
#   }
# }

# =============================================================================
# 6. HỦY TIN TỨC (Cancel News)
# =============================================================================
# Endpoint: POST /news/:id/cancel
# Description: Hủy tin tức và đóng tất cả work items
# Required: id, workItemId, reason
# Optional: note
# Note: Tìm flow có name='HUY_TIN' trong BPMN

curl -X POST "${BASE_URL}/news/123/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "workItemId": "wi_1736476900000_def456",
    "reason": "Thông tin không còn phù hợp",
    "note": "Hủy do thay đổi chính sách"
  }'

# Response example:
# {
#   "status": 1,
#   "document": {
#     "id": 123,
#     "status": 3
#   }
# }

# =============================================================================
# 7. THU HỒI TIN ĐÃ XUẤT BẢN (Recall Published News)
# =============================================================================
# Endpoint: POST /news/:id/recall
# Description: Thu hồi tin tức đã xuất bản, chỉ tác giả mới có quyền
# Required: id, reason
# Optional: note

curl -X POST "${BASE_URL}/news/123/recall" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "reason": "Phát hiện lỗi trong nội dung",
    "note": "Thu hồi để chỉnh sửa thông tin"
  }'

# Response example:
# {
#   "status": 1,
#   "document": {
#     "id": 123,
#     "status": 0
#   }
# }

# =============================================================================
# 8. LẤY DANH SÁCH WORK ITEMS (Get Work Items)
# =============================================================================
# Endpoint: GET /news/:id/work-items
# Description: Lấy danh sách work items của một tin tức
# Note: Dùng để lấy workItemId cho các action approve/reject/cancel

curl -X GET "${BASE_URL}/news/123/work-items" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "data": [
#     {
#       "id": "wi_1736476900000_def456",
#       "documentId": "123",
#       "nodeId": "Task_Review",
#       "role": "TRUONG_PHONG",
#       "assigneeUserId": "user_002",
#       "nodeType": "bpmn:UserTask",
#       "state": "open",
#       "createdAt": "2026-01-10T02:30:00.000Z"
#     }
#   ]
# }

# =============================================================================
# 9. LẤY LỊCH SỬ AUDIT LOG (Get Audit History)
# =============================================================================
# Endpoint: GET /news/:id/audit-log
# Description: Lấy lịch sử các hành động trên tin tức (submit, approve, reject, etc.)

curl -X GET "${BASE_URL}/news/123/audit-log" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "data": [
#     {
#       "id": 1,
#       "documentId": "123",
#       "userId": "user_002",
#       "displayName": "Trần Văn B",
#       "role": "TRUONG_PHONG",
#       "actionCode": "DUYET",
#       "fromNodeId": "Task_Review",
#       "toNodeId": null,
#       "details": "{\"note\":\"Phê duyệt\",\"publishImmediately\":true}",
#       "stageStatus": "HOAN_THANH",
#       "curStatusCode": "PUBLISHED",
#       "createdAt": "2026-01-10T03:00:00.000Z"
#     },
#     {
#       "id": 2,
#       "documentId": "123",
#       "userId": "user_001",
#       "displayName": "Nguyễn Văn A",
#       "role": "NGUOI_TAO_TIN",
#       "actionCode": "SUBMIT",
#       "fromNodeId": "Task_Edit",
#       "toNodeId": "Task_Review",
#       "details": "{\"note\":\"Đề nghị phê duyệt\"}",
#       "stageStatus": "CHUA_XU_LY",
#       "curStatusCode": "PENDING_APPROVAL",
#       "createdAt": "2026-01-10T02:30:00.000Z"
#     }
#   ]
# }

# =============================================================================
# 10. LẤY CHI TIẾT TIN TỨC (Get News Detail)
# =============================================================================
# Endpoint: GET /news/:id
# Description: Lấy thông tin chi tiết của tin tức

curl -X GET "${BASE_URL}/news/123" \
  -H "Authorization: Bearer ${TOKEN}"

# =============================================================================
# 11. LẤY DANH SÁCH TIN TỨC (Get News List)
# =============================================================================
# Endpoint: GET /news
# Description: Lấy danh sách tin tức với phân trang và filter

# Lấy tất cả tin tức:
curl -X GET "${BASE_URL}/news?page=1&limit=20" \
  -H "Authorization: Bearer ${TOKEN}"

# Lọc theo trạng thái:
curl -X GET "${BASE_URL}/news?page=1&limit=20&status=1" \
  -H "Authorization: Bearer ${TOKEN}"

# Lọc theo tác giả:
curl -X GET "${BASE_URL}/news?page=1&limit=20&authorId=user_001" \
  -H "Authorization: Bearer ${TOKEN}"

# Tìm kiếm theo từ khóa:
curl -X GET "${BASE_URL}/news?page=1&limit=20&search=chính%20sách" \
  -H "Authorization: Bearer ${TOKEN}"

# =============================================================================
# 12. LẤY ACTIONS KHẢ DỤNG (Get Available Actions)
# =============================================================================
# Endpoint: GET /news/:id/available-actions
# Description: Lấy danh sách các action có thể thực hiện trên tin tức
# Note: Trả về các cờ: canApproveNews, canRejectNews, canCancelNews, canSubmitNews, canSaveDraftNews

curl -X GET "${BASE_URL}/news/123/available-actions?workItemId=wi_1736476900000_def456" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "actions": {
#     "canApproveNews": true,
#     "canRejectNews": true,
#     "canCancelNews": true,
#     "canSubmitNews": false,
#     "canSaveDraftNews": false
#   }
# }

# =============================================================================
# 13. DANH SÁCH TIN ĐANG TẠO (My Drafts)
# =============================================================================
# Endpoint: GET /news/my-list/drafts
# Description: Lấy danh sách tin đang tạo (status=0/Draft) của người dùng hiện tại
# Query params: page, limit, search, sortBy, sortOrder, topic

# Lấy danh sách cơ bản:
curl -X GET "${BASE_URL}/news/my-list/drafts?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với tìm kiếm và sắp xếp:
curl -X GET "${BASE_URL}/news/my-list/drafts?page=1&limit=20&search=thông%20báo&sortBy=updatedAt&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}"

# Lọc theo topic:
curl -X GET "${BASE_URL}/news/my-list/drafts?page=1&limit=10&topic=chinh-sach" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "items": [
#     {
#       "id": 123,
#       "title": "Tin tức đang soạn",
#       "status": 0,
#       "authorId": "user_001",
#       "createdAt": "2026-01-10T02:00:00.000Z",
#       "updatedAt": "2026-01-10T02:30:00.000Z"
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 5,
#     "totalPages": 1
#   }
# }

# =============================================================================
# 14. DANH SÁCH TIN CHỜ DUYỆT (My Pending News)
# =============================================================================
# Endpoint: GET /news/my-list/pending
# Description: Lấy danh sách tin chờ duyệt - các tin tôi đang có work item
# Query params: page, limit, search, sortBy, sortOrder, topic

# Lấy danh sách cơ bản:
curl -X GET "${BASE_URL}/news/my-list/pending?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với tìm kiếm:
curl -X GET "${BASE_URL}/news/my-list/pending?page=1&limit=20&search=chính%20sách&sortBy=createdAt&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}"

# Sắp xếp theo lượt xem:
curl -X GET "${BASE_URL}/news/my-list/pending?page=1&limit=10&sortBy=viewCount&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "items": [
#     {
#       "id": 124,
#       "title": "Tin tức chờ duyệt",
#       "status": 0,
#       "authorId": "user_002",
#       "createdAt": "2026-01-10T03:00:00.000Z"
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 3,
#     "totalPages": 1
#   }
# }

# =============================================================================
# 15. DANH SÁCH TIN ĐÃ XUẤT BẢN (My Published News)
# =============================================================================
# Endpoint: GET /news/my-list/published
# Description: Lấy danh sách tin đã xuất bản (status=1) của người dùng hiện tại
# Query params: page, limit, search, sortBy, sortOrder, topic

# Lấy danh sách cơ bản:
curl -X GET "${BASE_URL}/news/my-list/published?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Sắp xếp theo ngày xuất bản:
curl -X GET "${BASE_URL}/news/my-list/published?page=1&limit=20&sortBy=publishedAt&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}"

# Tìm kiếm tin đã xuất bản:
curl -X GET "${BASE_URL}/news/my-list/published?page=1&limit=10&search=công%20nghệ" \
  -H "Authorization: Bearer ${TOKEN}"

# Lọc theo topic và sắp xếp theo lượt xem:
curl -X GET "${BASE_URL}/news/my-list/published?page=1&limit=10&topic=technology&sortBy=viewCount&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "items": [
#     {
#       "id": 125,
#       "title": "Tin tức đã xuất bản",
#       "status": 1,
#       "publishedAt": "2026-01-10T04:00:00.000Z",
#       "viewCount": 150,
#       "authorId": "user_001"
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 15,
#     "totalPages": 2
#   }
# }

# =============================================================================
# 16. DANH SÁCH TIN ĐÃ TRỞ LẠI (My Returned News)
# =============================================================================
# Endpoint: GET /news/my-list/returned
# Description: Lấy danh sách tin đã bị trả lại (REJECT) của người dùng hiện tại
# Query params: page, limit, search, sortBy, sortOrder, topic

# Lấy danh sách cơ bản:
curl -X GET "${BASE_URL}/news/my-list/returned?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với tìm kiếm và sắp xếp:
curl -X GET "${BASE_URL}/news/my-list/returned?page=1&limit=20&search=báo%20cáo&sortBy=updatedAt&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "items": [
#     {
#       "id": 126,
#       "title": "Tin tức bị trả lại",
#       "status": 0,
#       "authorId": "user_001",
#       "createdAt": "2026-01-10T02:00:00.000Z",
#       "updatedAt": "2026-01-10T05:00:00.000Z"
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 2,
#     "totalPages": 1
#   }
# }

# =============================================================================
# 17. DANH SÁCH TIN ĐÃ HỦY (My Cancelled News)
# =============================================================================
# Endpoint: GET /news/my-list/cancelled
# Description: Lấy danh sách tin đã hủy (CANCEL) của người dùng hiện tại
# Query params: page, limit, search, sortBy, sortOrder, topic

# Lấy danh sách cơ bản:
curl -X GET "${BASE_URL}/news/my-list/cancelled?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với các tham số tìm kiếm:
curl -X GET "${BASE_URL}/news/my-list/cancelled?page=1&limit=20&search=hội%20nghị&sortBy=createdAt&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "items": [
#     {
#       "id": 127,
#       "title": "Tin tức đã hủy",
#       "status": 3,
#       "authorId": "user_001",
#       "createdAt": "2026-01-09T02:00:00.000Z"
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 1,
#     "totalPages": 1
#   }
# }

# =============================================================================
# 18. DANH SÁCH TIN ĐÃ THU HỒI (My Recalled News)
# =============================================================================
# Endpoint: GET /news/my-list/recalled
# Description: Lấy danh sách tin đã thu hồi (RECALL) của người dùng hiện tại
# Query params: page, limit, search, sortBy, sortOrder, topic

# Lấy danh sách cơ bản:
curl -X GET "${BASE_URL}/news/my-list/recalled?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với sắp xếp và tìm kiếm:
curl -X GET "${BASE_URL}/news/my-list/recalled?page=1&limit=20&search=sửa%20lỗi&sortBy=updatedAt&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "items": [
#     {
#       "id": 128,
#       "title": "Tin tức đã thu hồi",
#       "status": 0,
#       "publishedAt": "2026-01-09T10:00:00.000Z",
#       "authorId": "user_001"
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 1,
#     "totalPages": 1
#   }
# }

# =============================================================================
# 19. DANH SÁCH TIN CHỜ TÔI PHÊ DUYỆT (Waiting My Approval)
# =============================================================================
# Endpoint: GET /news/my-list/waiting-approval
# Description: Lấy danh sách tin chờ tôi phê duyệt - các tin tôi có quyền phê duyệt
# Query params: page, limit, search, sortBy, sortOrder, topic

# Lấy danh sách cơ bản:
curl -X GET "${BASE_URL}/news/my-list/waiting-approval?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với tìm kiếm và sắp xếp:
curl -X GET "${BASE_URL}/news/my-list/waiting-approval?page=1&limit=20&search=khẩn&sortBy=createdAt&sortOrder=ASC" \
  -H "Authorization: Bearer ${TOKEN}"

# Lọc theo topic:
curl -X GET "${BASE_URL}/news/my-list/waiting-approval?page=1&limit=10&topic=urgent" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "status": 1,
#   "items": [
#     {
#       "id": 129,
#       "title": "Tin tức chờ phê duyệt",
#       "status": 0,
#       "authorId": "user_003",
#       "authorName": "Lê Văn C",
#       "createdAt": "2026-01-10T06:00:00.000Z"
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 7,
#     "totalPages": 1
#   }
# }

# =============================================================================
# DEMO: SỬ DỤNG CÁC API DANH SÁCH
# =============================================================================

echo "============================================="
echo "DEMO: Sử dụng các API danh sách tin tức"
echo "============================================="
echo ""

# Kiểm tra tin đang soạn
echo "1. Kiểm tra tin đang soạn..."
curl -s -X GET "${BASE_URL}/news/my-list/drafts?page=1&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.items[] | {id, title, updatedAt}'
echo ""

# Kiểm tra tin chờ phê duyệt
echo "2. Kiểm tra tin chờ tôi phê duyệt..."
curl -s -X GET "${BASE_URL}/news/my-list/waiting-approval?page=1&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.items[] | {id, title, authorName}'
echo ""

# Kiểm tra tin đã xuất bản
echo "3. Kiểm tra tin đã xuất bản (top 5 nhiều lượt xem nhất)..."
curl -s -X GET "${BASE_URL}/news/my-list/published?page=1&limit=5&sortBy=viewCount&sortOrder=DESC" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.items[] | {id, title, viewCount, publishedAt}'
echo ""

# Kiểm tra tin bị trả lại
echo "4. Kiểm tra tin bị trả lại..."
curl -s -X GET "${BASE_URL}/news/my-list/returned?page=1&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.items[] | {id, title}'
echo ""

echo "============================================="
echo "Hoàn thành demo các API danh sách!"
echo "============================================="

# =============================================================================
# WORKFLOW SEQUENCE - LUỒNG HOÀN CHỈNH
# =============================================================================

echo "============================================="
echo "DEMO: Luồng làm việc hoàn chỉnh với tin tức"
echo "============================================="
echo ""

# Bước 1: Tạo tin tức mới
echo "Bước 1: Tạo tin tức mới..."
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/news" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Tin tức demo workflow",
    "content": "<p>Nội dung demo</p>",
    "processKey": "quan_ly_tin_tuc"
  }')

NEWS_ID=$(echo $CREATE_RESPONSE | jq -r '.document.id')
echo "✓ Đã tạo tin tức ID: ${NEWS_ID}"
echo ""

# Bước 2: Lấy work item ID
echo "Bước 2: Lấy work item..."
WORK_ITEMS=$(curl -s -X GET "${BASE_URL}/news/${NEWS_ID}/work-items" \
  -H "Authorization: Bearer ${TOKEN}")

WORK_ITEM_ID=$(echo $WORK_ITEMS | jq -r '.data[0].id')
echo "✓ Work Item ID: ${WORK_ITEM_ID}"
echo ""

# Bước 3: Trình duyệt tin tức
echo "Bước 3: Trình duyệt tin tức..."
curl -s -X POST "${BASE_URL}/news/submit/${WORK_ITEM_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "ids": ['${NEWS_ID}'],
    "roleCode": "TRUONG_PHONG",
    "processKey": "quan_ly_tin_tuc",
    "note": "Đề nghị phê duyệt"
  }' > /dev/null
echo "✓ Đã trình duyệt"
echo ""

# Bước 4: Lấy work item mới của người phê duyệt
echo "Bước 4: Lấy work item mới..."
WORK_ITEMS_NEW=$(curl -s -X GET "${BASE_URL}/news/${NEWS_ID}/work-items" \
  -H "Authorization: Bearer ${TOKEN}")

REVIEWER_WORK_ITEM_ID=$(echo $WORK_ITEMS_NEW | jq -r '.data[] | select(.state=="open") | .id' | head -1)
echo "✓ Work Item ID người phê duyệt: ${REVIEWER_WORK_ITEM_ID}"
echo ""

# Bước 5: Phê duyệt tin tức
echo "Bước 5: Phê duyệt và xuất bản..."
curl -s -X POST "${BASE_URL}/news/${NEWS_ID}/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "workItemId": "'${REVIEWER_WORK_ITEM_ID}'",
    "note": "Đã phê duyệt",
    "publishImmediately": true
  }' > /dev/null
echo "✓ Đã phê duyệt và xuất bản"
echo ""

# Bước 6: Xem lịch sử audit
echo "Bước 6: Xem lịch sử audit..."
curl -s -X GET "${BASE_URL}/news/${NEWS_ID}/audit-log" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data[] | {action: .actionCode, user: .displayName, time: .createdAt}'
echo ""

echo "============================================="
echo "Hoàn thành demo workflow!"
echo "============================================="

# =============================================================================
# NOTES & TIPS
# =============================================================================

# 1. Work Item ID:
#    - Mỗi bước trong workflow có work item riêng
#    - Cần lấy đúng work item ID của user hiện tại
#    - Query từ endpoint /news/:id/work-items với state="open"

# 2. BPMN Flow Names:
#    - TRINH_DUYET: Gửi tin đi phê duyệt
#    - LUU_NHAP: Lưu nháp
#    - DUYET: Phê duyệt tin
#    - TRA_LAI / TRA_LAI_TIN: Trả lại tin
#    - HUY_TIN: Hủy tin

# 3. Status Codes:
#    - 0: Draft (Nháp)
#    - 1: Published (Đã xuất bản)
#    - 2: Scheduled (Đã lên lịch)
#    - 3: Deleted/Cancelled (Đã xóa/hủy)

# 4. Action Codes trong Audit:
#    - CREATE: Tạo mới
#    - SUBMIT: Trình duyệt
#    - DUYET: Phê duyệt
#    - TRA_LAI: Từ chối
#    - HUY_TIN: Hủy
#    - RECALL: Thu hồi

# 5. Stage Status:
#    - CHUA_XU_LY: Chưa xử lý
#    - DANG_XU_LY: Đang xử lý
#    - HOAN_THANH: Hoàn thành
#    - DA_HUY: Đã hủy
#    - THU_HOI: Thu hồi

# =============================================================================
# ERROR HANDLING
# =============================================================================

# Common errors:

# 1. "Không tìm thấy workItem"
#    -> Kiểm tra workItemId có đúng và thuộc user hiện tại
#    -> Query lại từ /news/:id/work-items

# 2. "Không tìm thấy flow"
#    -> Kiểm tra BPMN có đúng flow name không (DUYET, TRA_LAI, HUY_TIN)
#    -> Kiểm tra cấu hình BPMN workflow

# 3. "Bạn không có quyền"
#    -> Kiểm tra JWT token
#    -> Kiểm tra user có role phù hợp

# 4. "Node không có outgoing flow"
#    -> Kiểm tra BPMN design có đầy đủ connections
#    -> Có thể là node cuối cùng trong workflow

# =============================================================================
# END OF FILE
# =============================================================================
