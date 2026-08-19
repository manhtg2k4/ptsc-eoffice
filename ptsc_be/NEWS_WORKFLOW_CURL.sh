#!/bin/bash

# ===========================================
# CURL EXAMPLES - NEWS WORKFLOW API
# ===========================================
# Base URL (thay đổi theo môi trường)
BASE_URL="http://localhost:3000"
TOKEN="your_jwt_token_here"

# ===========================================
# 1. TẠO TIN TỨC MỚI (CREATE NEWS)
# ===========================================
# Endpoint: POST /news
# Mô tả: Tạo tin tức mới tại StartEvent, tự động chuyển sang node tiếp theo

curl -X POST "${BASE_URL}/news" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Thông báo quan trọng về hội nghị cuối năm",
    "content": "<p>Nội dung chi tiết về hội nghị...</p>",
    "summary": "Tóm tắt tin tức",
    "nameThumbnail": "thumbnail.jpg",
    "topic": "Thông báo",
    "tags": ["hội nghị", "cuối năm"],
    "status": 0,
    "scheduledPublishAt": "2026-01-15T10:00:00Z"
  }'

# ===========================================
# 2. TRÌNH DUYỆT TIN TỨC (SUBMIT NEWS)
# ===========================================
# Endpoint: POST /news/:id/submit
# Mô tả: Người tạo tin trình duyệt lên nhóm người dùng có vai trò động (role-feature)

curl -X POST "${BASE_URL}/news/1/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "roleCode": "NGUOI_PHE_DUYET",
    "processKey": "quan_ly_tin_tuc",
    "note": "Đề nghị phê duyệt tin tức này"
  }'

# ===========================================
# 3. PHÊ DUYỆT TIN TỨC (APPROVE NEWS)
# ===========================================
# Endpoint: POST /news/:id/approve (Cần thêm vào controller)
# Mô tả: Người phê duyệt đồng ý xuất bản tin

curl -X POST "${BASE_URL}/news/1/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "note": "Đã xem xét và đồng ý",
    "publishImmediately": true
  }'

# Hoặc phê duyệt nhưng chưa xuất bản ngay
curl -X POST "${BASE_URL}/news/1/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "note": "Đã phê duyệt, xuất bản sau",
    "publishImmediately": false
  }'

# ===========================================
# 4. TỪ CHỐI TIN TỨC (REJECT NEWS)
# ===========================================
# Endpoint: POST /news/:id/reject (Cần thêm vào controller)
# Mô tả: Người phê duyệt từ chối, trả lại cho người tạo sửa

curl -X POST "${BASE_URL}/news/1/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "reason": "Nội dung chưa đầy đủ",
    "note": "Vui lòng bổ sung thêm chi tiết về chương trình"
  }'

# ===========================================
# 5. HỦY TIN TỨC (CANCEL NEWS)
# ===========================================
# Endpoint: POST /news/:id/cancel (Cần thêm vào controller)
# Mô tả: Người phê duyệt hủy tin tức, đánh dấu status = 3

curl -X POST "${BASE_URL}/news/1/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "reason": "Tin tức không còn phù hợp",
    "note": "Hội nghị đã bị hủy"
  }'

# ===========================================
# 6. THU HỒI TIN ĐÃ XUẤT BẢN (RECALL NEWS)
# ===========================================
# Endpoint: POST /news/:id/recall (Cần thêm vào controller)
# Mô tả: Tác giả thu hồi tin đã xuất bản (status = 1 -> 0)

curl -X POST "${BASE_URL}/news/1/recall" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "reason": "Phát hiện thông tin sai sót",
    "note": "Cần chỉnh sửa ngày giờ họp"
  }'

# ===========================================
# 7. XEM LỊCH SỬ AUDIT (GET AUDIT LOG)
# ===========================================
# Endpoint: GET /news/:id/audit (Cần thêm vào controller)
# Mô tả: Lấy toàn bộ lịch sử xử lý của tin tức

curl -X GET "${BASE_URL}/news/1/audit" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 8. XEM WORK ITEMS (GET WORK ITEMS)
# ===========================================
# Endpoint: GET /news/:id/work-items (Cần thêm vào controller)
# Mô tả: Lấy danh sách work items của tin tức

curl -X GET "${BASE_URL}/news/1/work-items" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 9. CẬP NHẬT TIN TỨC (UPDATE NEWS)
# ===========================================
# Endpoint: PATCH /news/:id (Đã có trong controller)
# Mô tả: Cập nhật thông tin tin tức

curl -X PATCH "${BASE_URL}/news/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Thông báo quan trọng (CẬP NHẬT)",
    "content": "<p>Nội dung đã được chỉnh sửa...</p>"
  }'

# ===========================================
# 10. XÓA TIN TỨC (DELETE NEWS)
# ===========================================
# Endpoint: DELETE /news/:id (Đã có trong controller)
# Mô tả: Xóa tin tức

curl -X DELETE "${BASE_URL}/news/1" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 11. XÓA NHIỀU TIN TỨC (BULK DELETE)
# ===========================================
# Endpoint: DELETE /news/bulk (Đã có trong controller)
# Mô tả: Xóa nhiều tin tức cùng lúc

curl -X DELETE "${BASE_URL}/news/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "ids": [1, 2, 3, 4, 5]
  }'

# ===========================================
# 12. XEM CHI TIẾT TIN TỨC (GET ONE)
# ===========================================
# Endpoint: GET /news/:id (Đã có trong controller)
# Mô tả: Xem chi tiết tin tức theo ID

curl -X GET "${BASE_URL}/news/1" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 13. XEM TIN TỨC THEO SLUG (GET BY SLUG)
# ===========================================
# Endpoint: GET /news/slug/:slug (Đã có trong controller)
# Mô tả: Xem tin tức theo slug (SEO friendly)

curl -X GET "${BASE_URL}/news/slug/thong-bao-quan-trong-ve-hoi-nghi-cuoi-nam" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 14. DANH SÁCH TIN TỨC (GET ALL)
# ===========================================
# Endpoint: GET /news (Đã có trong controller)
# Mô tả: Lấy danh sách tin tức có phân trang

curl -X GET "${BASE_URL}/news?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với filter
curl -X GET "${BASE_URL}/news?page=1&limit=10&filter={\"status\":1,\"topic\":\"Thông báo\"}" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 15. THÊM COMMENT (ADD COMMENT)
# ===========================================
# Endpoint: POST /news/:id/comment (Đã có trong controller)
# Mô tả: Thêm comment vào tin tức

curl -X POST "${BASE_URL}/news/1/comment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "content": "Tin tức rất hữu ích!",
    "parentId": null
  }'

# ===========================================
# 16. XEM DANH SÁCH COMMENT (GET COMMENTS)
# ===========================================
# Endpoint: GET /news/:id/comments (Đã có trong controller)
# Mô tả: Lấy danh sách comment của tin tức

curl -X GET "${BASE_URL}/news/1/comments" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 17. LIKE/DISLIKE TIN TỨC HOẶC COMMENT
# ===========================================
# Endpoint: POST /news/like
# Mô tả: Like/Dislike tin tức hoặc comment (hỗ trợ toggle và chuyển đổi)

# Like tin tức
curl -X POST "${BASE_URL}/news/like" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "newsId": 1,
    "isLike": true
  }'

# Dislike tin tức
curl -X POST "${BASE_URL}/news/like" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "newsId": 1,
    "isLike": false
  }'

# Like comment
curl -X POST "${BASE_URL}/news/like" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "newsId": 1,
    "commentId": 123,
    "isLike": true
  }'

# Dislike comment
curl -X POST "${BASE_URL}/news/like" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "newsId": 1,
    "commentId": 123,
    "isLike": false
  }'

# Response examples:
# - Click vào cùng reaction: { "success": true, "message": "Bỏ like thành công", "liked": null, "disliked": null }
# - Đổi reaction: { "success": true, "message": "Đổi sang dislike thành công", "liked": false, "disliked": true }
# - Tạo mới: { "success": true, "message": "Like thành công", "liked": true, "disliked": false }

# ===========================================
# 18. XEM SỐ LƯỢNG LIKE/DISLIKE (GET LIKES)
# ===========================================
# Endpoint: GET /news/:id/likes
# Mô tả: Xem tổng số like/dislike của tin tức

curl -X GET "${BASE_URL}/news/1/likes" \
  -H "Authorization: Bearer ${TOKEN}"

# Response example:
# {
#   "success": true,
#   "data": {
#     "newsId": 1,
#     "totalLikes": 45,
#     "totalDislikes": 3
#   }
# }

# ===========================================
# 19. DANH SÁCH TIN CHỜ DUYỆT (WAITING APPROVAL)
# ===========================================
# Endpoint: GET /news/workflow/waiting-my-approval
# Mô tả: Lấy danh sách tin đang chờ người dùng phê duyệt (lọc theo action cuối cùng)

curl -X GET "${BASE_URL}/news/workflow/waiting-my-approval?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với filter
curl -X GET "${BASE_URL}/news/workflow/waiting-my-approval?page=1&limit=10&search=hội nghị&topic=Thông báo" \
  -H "Authorization: Bearer ${TOKEN}"

# Response bao gồm:
# - items: danh sách tin tức
# - pagination: thông tin phân trang
# - debugInfo: thông tin debug (số lượng audit, document IDs)
# - deadlineInfo: thông tin hạn xử lý (isOverdue, remainingTime, remainingDays, remainingHours)

# ===========================================
# 20. DANH SÁCH TIN ĐÃ TRẢ LẠI (RETURNED)
# ===========================================
# Endpoint: GET /news/workflow/returned
# Mô tả: Lấy danh sách tin đã bị trả lại (có action TRA_LAI cuối cùng)

curl -X GET "${BASE_URL}/news/workflow/returned?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Với filter
curl -X GET "${BASE_URL}/news/workflow/returned?page=1&limit=10&search=hội nghị&topic=Thông báo" \
  -H "Authorization: Bearer ${TOKEN}"

# Response:
# - Chỉ hiển thị tin có action cuối cùng là TRA_LAI
# - Loại bỏ tin đã gửi lại duyệt (có SUBMIT sau TRA_LAI)

# ===========================================
# 21. DANH SÁCH TIN ĐÃ XUẤT BẢN (PUBLISHED)
# ===========================================
# Endpoint: GET /news/workflow/published
# Mô tả: Lấy danh sách tin đã được phê duyệt và xuất bản

curl -X GET "${BASE_URL}/news/workflow/published?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 22. DANH SÁCH TIN ĐÃ HỦY (CANCELLED)
# ===========================================
# Endpoint: GET /news/workflow/cancelled
# Mô tả: Lấy danh sách tin đã bị hủy

curl -X GET "${BASE_URL}/news/workflow/cancelled?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 23. DANH SÁCH TIN ĐÃ THU HỒI (RECALLED)
# ===========================================
# Endpoint: GET /news/workflow/recalled
# Mô tả: Lấy danh sách tin đã thu hồi

curl -X GET "${BASE_URL}/news/workflow/recalled?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# 24. DANH SÁCH TIN NHÁP (DRAFTS)
# ===========================================
# Endpoint: GET /news/workflow/drafts
# Mô tả: Lấy danh sách tin tức ở trạng thái nháp (chưa trình duyệt)

curl -X GET "${BASE_URL}/news/workflow/drafts?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# ===========================================
# LƯU Ý VÀ QUY ƯỚC
# ===========================================
# 1. Authentication:
#    - Tất cả API đều yêu cầu JWT token trong header Authorization
#    - userId được lấy từ JWT token (req.user)
#
# 2. Like/Dislike System:
#    - isLike = true: Like
#    - isLike = false: Dislike
#    - Click vào cùng reaction: Bỏ reaction (xóa)
#    - Click vào reaction khác: Đổi reaction
#    - commentId = null hoặc không truyền: Like/Dislike tin tức
#    - commentId có giá trị: Like/Dislike comment
#
# 3. Workflow Status Filtering:
#    - Waiting Approval: Lọc theo action cuối cùng = SUBMIT hoặc DUYET
#    - Returned: Lọc theo action cuối cùng = TRA_LAI
#    - Xử lý vòng lặp: Submit → Reject → Submit → Reject (luôn dựa vào action cuối)
#
# 4. Deadline Info:
#    - hasDeadline: Có hạn xử lý hay không
#    - isOverdue: Đã quá hạn hay chưa
#    - remainingTime: Thời gian còn lại (text)
#    - remainingDays/remainingHours: Số ngày/giờ còn lại
#
# 5. Pagination:
#    - Mặc định: page=1, limit=10
#    - Query params: page, limit, search, sortBy, sortOrder, topic
#
# 6. Action Codes:
#    - SUBMIT: Trình duyệt
#    - DUYET: Phê duyệt
#    - TRA_LAI: Từ chối/Trả lại
#    - HUY_TIN: Hủy tin
#    - RECALL: Thu hồi tin
#
# 7. Environment:
#    - Development: http://localhost:3000
#    - Staging: https://staging-api.example.com
#    - Production: https://api.example.com
