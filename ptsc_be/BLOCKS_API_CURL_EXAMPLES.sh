#!/bin/bash

# BLOCKS API - CURL EXAMPLES
# Base URL
BASE_URL="http://localhost:3156"

echo "=========================================="
echo "BLOCKS API - CURL EXAMPLES"
echo "=========================================="

# ===========================================
# 1. Lưu toàn bộ blocks cho trang "about"
# ===========================================
echo -e "\n1. POST /pages - Lưu blocks cho trang 'about'"
curl -X POST "${LCTTHC}/api/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "about",
    "replaceAll": true,
    "blocks": [
      {
        "key": "preHeader",
        "name": "Top Bar",
        "order": -3,
        "imageUrl": "https://example.com/image.jpg",
        "title": "Sài gòn",
        "logoUrl": "https://example.com/logo.png",
        "logoWidth": 80,
        "logoHeight": 80,
        "text": "Sài gòn",
        "titleColor": "#2d6cd2",
        "textColor": "#3275d2"
      },
      {
        "key": "header",
        "name": "Header",
        "order": -2,
        "logo": "My CMS",
        "menu": [
          {"label": "Home", "href": "/"},
          {"label": "About", "href": "/about"},
          {"label": "Contact", "href": "/contact"}
        ]
      },
      {
        "key": "banner",
        "name": "Banner Hero",
        "order": 0,
        "type": "banner",
        "title": "Về chúng tôi"
      },
      {
        "key": "textBlock",
        "name": "Text Block",
        "order": 1,
        "type": "text",
        "text": "Giới thiệu công ty..."
      },
      {
        "key": "footer",
        "name": "Footer",
        "order": 9999,
        "text": "© 2024 My CMS. All rights reserved."
      }
    ]
  }'

# ===========================================
# 2. Lấy blocks của trang "about"
# ===========================================
echo -e "\n\n2. GET /pages/about - Lấy blocks của trang"
curl -X GET "${LCTTHC}/api/pages/about" \
  -H "Content-Type: application/json"

# ===========================================
# 3. Cập nhật một block cụ thể
# ===========================================
echo -e "\n\n3. PUT /pages/about/blocks/preHeader - Cập nhật block 'preHeader'"
curl -X PUT "${LCTTHC}/api/pages/about/blocks/preHeader" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hà Nội",
    "text": "Hà Nội",
    "titleColor": "#ff0000"
  }'

# ===========================================
# 4. Thêm block mới vào trang
# ===========================================
echo -e "\n\n4. POST /pages/about/blocks - Thêm block mới"
curl -X POST "${LCTTHC}/api/pages/about/blocks" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "newSection",
    "name": "New Section",
    "order": 2,
    "type": "section",
    "title": "New Content Section",
    "content": "This is a new section"
  }'

# ===========================================
# 5. Sắp xếp lại thứ tự blocks
# ===========================================
echo -e "\n\n5. PUT /pages/about/reorder - Sắp xếp lại thứ tự"
curl -X PUT "${LCTTHC}/api/pages/about/reorder" \
  -H "Content-Type: application/json" \
  -d '{
    "blocks": [
      {"key": "preHeader", "order": -3},
      {"key": "header", "order": -2},
      {"key": "banner", "order": 0},
      {"key": "newSection", "order": 1},
      {"key": "textBlock", "order": 2},
      {"key": "footer", "order": 9999}
    ]
  }'

# ===========================================
# 6. Xóa một block
# ===========================================
echo -e "\n\n6. DELETE /pages/about/blocks/newSection - Xóa block"
curl -X DELETE "${LCTTHC}/api/pages/about/blocks/newSection" \
  -H "Content-Type: application/json"

# ===========================================
# 7. Lưu blocks cho trang "home"
# ===========================================
echo -e "\n\n7. POST /pages - Lưu blocks cho trang 'home'"
curl -X POST "${LCTTHC}/api/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "home",
    "replaceAll": true,
    "blocks": [
      {
        "key": "heroSection",
        "name": "Hero Section",
        "order": 0,
        "type": "hero",
        "title": "Welcome to Our Website",
        "subtitle": "Your success is our mission"
      },
      {
        "key": "features",
        "name": "Features",
        "order": 1,
        "type": "features",
        "items": [
          {"title": "Fast", "desc": "Lightning fast performance"},
          {"title": "Secure", "desc": "Enterprise-grade security"},
          {"title": "Scalable", "desc": "Grows with your business"}
        ]
      }
    ]
  }'

# ===========================================
# 8. Lấy tất cả trang (pagination)
# ===========================================
echo -e "\n\n8. GET /pages?page=1&limit=10 - Lấy danh sách trang"
curl -X GET "${LCTTHC}/api/pages?page=1&limit=10" \
  -H "Content-Type: application/json"

# ===========================================
# 9. Xóa toàn bộ trang "home"
# ===========================================
echo -e "\n\n9. DELETE /pages/home - Xóa toàn bộ trang"
curl -X DELETE "${LCTTHC}/api/pages/home" \
  -H "Content-Type: application/json"

# ===========================================
# 10. Lưu blocks với replaceAll = false (merge)
# ===========================================
echo -e "\n\n10. POST /pages - Lưu blocks với replaceAll=false"
curl -X POST "${LCTTHC}/api/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "about",
    "replaceAll": false,
    "blocks": [
      {
        "key": "preHeader",
        "name": "Top Bar Updated",
        "order": -3,
        "title": "Updated Title"
      }
    ]
  }'

echo -e "\n\n=========================================="
echo "DONE! All API examples executed."
echo "=========================================="
