-- ============================================
-- Migration Script: Xóa cột organization_unit_id
-- Database: MSSQL Server
-- ============================================

-- 1. Xóa Foreign Key constraint trước (nếu có)
IF EXISTS (
    SELECT 1 
    FROM sys.foreign_keys 
    WHERE name = 'FK_users_organization_unit'
)
BEGIN
    ALTER TABLE users DROP CONSTRAINT FK_users_organization_unit;
    PRINT '✅ Đã xóa Foreign Key FK_users_organization_unit';
END
ELSE
BEGIN
    PRINT '⚠️ Foreign Key FK_users_organization_unit không tồn tại';
END
GO

-- 2. Xóa Index (nếu có)
IF EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'IX_users_organization_unit_id' 
    AND object_id = OBJECT_ID('users')
)
BEGIN
    DROP INDEX IX_users_organization_unit_id ON users;
    PRINT '✅ Đã xóa Index IX_users_organization_unit_id';
END
ELSE
BEGIN
    PRINT '⚠️ Index IX_users_organization_unit_id không tồn tại';
END
GO

-- 3. Xóa cột organization_unit_id
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('users') 
    AND name = 'organization_unit_id'
)
BEGIN
    ALTER TABLE users DROP COLUMN organization_unit_id;
    PRINT '✅ Đã xóa cột organization_unit_id';
END
ELSE
BEGIN
    PRINT '⚠️ Cột organization_unit_id không tồn tại';
END
GO

PRINT '';
PRINT '============================================';
PRINT 'KẾT QUẢ MIGRATION:';
PRINT '✅ Đã xóa cột organization_unit_id khỏi bảng users';
PRINT '============================================';
GO

