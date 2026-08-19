-- ============================================
-- Script Migration Dữ liệu từ MongoDB sang MSSQL
-- Lưu ý: Script này chỉ là template, cần điều chỉnh theo dữ liệu thực tế
-- ============================================

-- ============================================
-- BƯỚC 1: Migrate dữ liệu quan hệ User - OrganizationUnit
-- ============================================
-- Giả sử bạn đã có dữ liệu mapping từ MongoDB
-- Cần chạy script này để cập nhật organization_unit_id cho các user

-- Ví dụ: Cập nhật organization_unit_id dựa trên parent (nếu parent là organizationUnit)
-- UPDATE users
-- SET organization_unit_id = parent
-- WHERE parent IS NOT NULL 
--   AND organization_unit_id IS NULL;
-- 
-- Hoặc nếu bạn có bảng mapping riêng:
-- UPDATE u
-- SET u.organization_unit_id = m.organization_unit_id
-- FROM users u
-- INNER JOIN user_org_mapping m ON u.id = m.user_id
-- WHERE u.organization_unit_id IS NULL;

PRINT '⚠️ Cần điều chỉnh script này dựa trên dữ liệu thực tế từ MongoDB';
PRINT '⚠️ Cần tạo bảng mapping hoặc query trực tiếp từ MongoDB để lấy dữ liệu';
GO

-- ============================================
-- BƯỚC 2: Migrate dữ liệu quan hệ User - GroupUser (ManyToMany)
-- ============================================
-- Trong MongoDB, User có mảng GroupUser (ObjectId[])
-- Cần insert vào bảng user_group_users

-- Ví dụ script (cần điều chỉnh theo dữ liệu thực tế):
/*
-- Giả sử bạn đã export dữ liệu từ MongoDB ra bảng tạm
-- Tạo bảng tạm để import dữ liệu
CREATE TABLE #temp_user_group_users (
    user_id NVARCHAR(100),
    group_user_id UNIQUEIDENTIFIER
);

-- Insert dữ liệu vào bảng tạm (từ file CSV hoặc từ MongoDB)
-- BULK INSERT #temp_user_group_users
-- FROM 'C:\path\to\user_group_users.csv'
-- WITH (
--     FIELDTERMINATOR = ',',
--     ROWTERMINATOR = '\n',
--     FIRSTROW = 2
-- );

-- Insert vào bảng chính (tránh duplicate)
INSERT INTO user_group_users (user_id, group_user_id)
SELECT DISTINCT t.user_id, t.group_user_id
FROM #temp_user_group_users t
WHERE NOT EXISTS (
    SELECT 1 
    FROM user_group_users ugu 
    WHERE ugu.user_id = t.user_id 
      AND ugu.group_user_id = t.group_user_id
)
AND EXISTS (SELECT 1 FROM users WHERE id = t.user_id)
AND EXISTS (SELECT 1 FROM group_users WHERE id = t.group_user_id);

DROP TABLE #temp_user_group_users;
*/

PRINT '⚠️ Cần điều chỉnh script này để import dữ liệu từ MongoDB';
GO

-- ============================================
-- BƯỚC 3: Migrate dữ liệu quan hệ GroupUser - OrganizationUnit (ManyToMany)
-- ============================================
-- Trong MongoDB, GroupUser có mảng organizationUnits (ObjectId[])
-- Cần insert vào bảng group_user_organization_units

-- Ví dụ script (cần điều chỉnh theo dữ liệu thực tế):
/*
-- Tạo bảng tạm
CREATE TABLE #temp_group_user_org_units (
    group_user_id UNIQUEIDENTIFIER,
    organization_unit_id VARCHAR(100)
);

-- Import dữ liệu (từ file CSV hoặc từ MongoDB)
-- BULK INSERT #temp_group_user_org_units
-- FROM 'C:\path\to\group_user_org_units.csv'
-- WITH (
--     FIELDTERMINATOR = ',',
--     ROWTERMINATOR = '\n',
--     FIRSTROW = 2
-- );

-- Insert vào bảng chính
INSERT INTO group_user_organization_units (group_user_id, organization_unit_id)
SELECT DISTINCT t.group_user_id, t.organization_unit_id
FROM #temp_group_user_org_units t
WHERE NOT EXISTS (
    SELECT 1 
    FROM group_user_organization_units guou 
    WHERE guou.group_user_id = t.group_user_id 
      AND guou.organization_unit_id = t.organization_unit_id
)
AND EXISTS (SELECT 1 FROM group_users WHERE id = t.group_user_id)
AND EXISTS (SELECT 1 FROM organization_units WHERE id = t.organization_unit_id);

DROP TABLE #temp_group_user_org_units;
*/

PRINT '⚠️ Cần điều chỉnh script này để import dữ liệu từ MongoDB';
GO

-- ============================================
-- BƯỚC 4: Kiểm tra dữ liệu sau khi migrate
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'KIỂM TRA DỮ LIỆU SAU MIGRATION:';
PRINT '============================================';

-- Đếm số user có organization_unit_id
SELECT 
    COUNT(*) AS total_users,
    COUNT(organization_unit_id) AS users_with_org_unit,
    COUNT(*) - COUNT(organization_unit_id) AS users_without_org_unit
FROM users;

-- Đếm số quan hệ User - GroupUser
SELECT COUNT(*) AS total_user_group_relations
FROM user_group_users;

-- Đếm số quan hệ GroupUser - OrganizationUnit
SELECT COUNT(*) AS total_group_org_relations
FROM group_user_organization_units;

-- Kiểm tra dữ liệu orphan (không có trong bảng chính)
SELECT 'Orphan user_group_users' AS check_type, COUNT(*) AS count
FROM user_group_users ugu
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = ugu.user_id)
   OR NOT EXISTS (SELECT 1 FROM group_users WHERE id = ugu.group_user_id)

UNION ALL

SELECT 'Orphan group_user_org_units' AS check_type, COUNT(*) AS count
FROM group_user_organization_units guou
WHERE NOT EXISTS (SELECT 1 FROM group_users WHERE id = guou.group_user_id)
   OR NOT EXISTS (SELECT 1 FROM organization_units WHERE id = guou.organization_unit_id);

PRINT '============================================';
GO

