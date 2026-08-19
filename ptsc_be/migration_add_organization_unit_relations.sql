-- ============================================
-- Migration Script: Thêm quan hệ OrganizationUnit
-- Database: MSSQL Server
-- ============================================

-- 1. Thêm cột organization_unit_id vào bảng users (nếu chưa có)
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('users') 
    AND name = 'organization_unit_id'
)
BEGIN
    ALTER TABLE users
    ADD organization_unit_id VARCHAR(100) NULL;
    
    PRINT '✅ Đã thêm cột organization_unit_id vào bảng users';
END
ELSE
BEGIN
    PRINT '⚠️ Cột organization_unit_id đã tồn tại trong bảng users';
END
GO

-- 2. Tạo bảng phụ user_group_users (quan hệ ManyToMany giữa users và group_users)
-- Xóa foreign keys nếu tồn tại
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_user_group_users_user')
    ALTER TABLE user_group_users DROP CONSTRAINT FK_user_group_users_user;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_user_group_users_group_user')
    ALTER TABLE user_group_users DROP CONSTRAINT FK_user_group_users_group_user;
GO

-- Xóa indexes nếu tồn tại
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_user_group_users_user_id' AND object_id = OBJECT_ID('user_group_users'))
    DROP INDEX IX_user_group_users_user_id ON user_group_users;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_user_group_users_group_user_id' AND object_id = OBJECT_ID('user_group_users'))
    DROP INDEX IX_user_group_users_group_user_id ON user_group_users;
GO

-- Xóa bảng nếu tồn tại
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_group_users')
    DROP TABLE user_group_users;
GO

-- Tạo bảng mới
CREATE TABLE user_group_users (
    user_id NVARCHAR(100) NOT NULL,
    group_user_id UNIQUEIDENTIFIER NOT NULL,
    PRIMARY KEY (user_id, group_user_id)
);
GO

-- Tạo foreign keys sau khi tạo bảng
ALTER TABLE user_group_users
ADD CONSTRAINT FK_user_group_users_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
GO

ALTER TABLE user_group_users
ADD CONSTRAINT FK_user_group_users_group_user 
    FOREIGN KEY (group_user_id) 
    REFERENCES group_users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
GO

-- Tạo index để tối ưu query
CREATE INDEX IX_user_group_users_user_id ON user_group_users(user_id);
GO

CREATE INDEX IX_user_group_users_group_user_id ON user_group_users(group_user_id);
GO

PRINT '✅ Đã tạo bảng user_group_users';
GO

-- 3. Tạo bảng phụ group_user_organization_units (quan hệ ManyToMany giữa group_users và organization_units)
-- Xóa foreign keys nếu tồn tại
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_group_user_org_units_group_user')
    ALTER TABLE group_user_organization_units DROP CONSTRAINT FK_group_user_org_units_group_user;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_group_user_org_units_org_unit')
    ALTER TABLE group_user_organization_units DROP CONSTRAINT FK_group_user_org_units_org_unit;
GO

-- Xóa indexes nếu tồn tại
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_group_user_org_units_group_user_id' AND object_id = OBJECT_ID('group_user_organization_units'))
    DROP INDEX IX_group_user_org_units_group_user_id ON group_user_organization_units;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_group_user_org_units_org_unit_id' AND object_id = OBJECT_ID('group_user_organization_units'))
    DROP INDEX IX_group_user_org_units_org_unit_id ON group_user_organization_units;
GO

-- Xóa bảng nếu tồn tại
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'group_user_organization_units')
    DROP TABLE group_user_organization_units;
GO

-- Tạo bảng mới
CREATE TABLE group_user_organization_units (
    group_user_id UNIQUEIDENTIFIER NOT NULL,
    organization_unit_id VARCHAR(100) NOT NULL,
    PRIMARY KEY (group_user_id, organization_unit_id)
);
GO

-- Tạo foreign keys sau khi tạo bảng
ALTER TABLE group_user_organization_units
ADD CONSTRAINT FK_group_user_org_units_group_user 
    FOREIGN KEY (group_user_id) 
    REFERENCES group_users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
GO

ALTER TABLE group_user_organization_units
ADD CONSTRAINT FK_group_user_org_units_org_unit 
    FOREIGN KEY (organization_unit_id) 
    REFERENCES organization_units(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
GO

-- Tạo index để tối ưu query
CREATE INDEX IX_group_user_org_units_group_user_id ON group_user_organization_units(group_user_id);
GO

CREATE INDEX IX_group_user_org_units_org_unit_id ON group_user_organization_units(organization_unit_id);
GO

PRINT '✅ Đã tạo bảng group_user_organization_units';
GO

-- 4. Thêm Foreign Key constraint cho organization_unit_id trong bảng users
IF NOT EXISTS (
    SELECT 1 
    FROM sys.foreign_keys 
    WHERE name = 'FK_users_organization_unit'
)
BEGIN
    ALTER TABLE users
    ADD CONSTRAINT FK_users_organization_unit
        FOREIGN KEY (organization_unit_id) 
        REFERENCES organization_units(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    
    -- Tạo index để tối ưu query
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_organization_unit_id')
    BEGIN
        CREATE INDEX IX_users_organization_unit_id ON users(organization_unit_id);
    END
    
    PRINT '✅ Đã thêm Foreign Key constraint cho organization_unit_id';
END
ELSE
BEGIN
    PRINT '⚠️ Foreign Key FK_users_organization_unit đã tồn tại';
END
GO

-- 5. Kiểm tra và thêm index cho cột parent trong bảng users (nếu chưa có)
IF NOT EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'IX_users_parent' 
    AND object_id = OBJECT_ID('users')
)
BEGIN
    CREATE INDEX IX_users_parent ON users(parent);
    PRINT '✅ Đã tạo index IX_users_parent';
END
ELSE
BEGIN
    PRINT '⚠️ Index IX_users_parent đã tồn tại';
END
GO

-- ============================================
-- Kiểm tra kết quả
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'KẾT QUẢ MIGRATION:';
PRINT '============================================';

-- Kiểm tra cột organization_unit_id
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('users') 
    AND name = 'organization_unit_id'
)
    PRINT '✅ Cột organization_unit_id: Đã tồn tại';
ELSE
    PRINT '❌ Cột organization_unit_id: CHƯA TỒN TẠI';

-- Kiểm tra bảng user_group_users
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_group_users')
    PRINT '✅ Bảng user_group_users: Đã tồn tại';
ELSE
    PRINT '❌ Bảng user_group_users: CHƯA TỒN TẠI';

-- Kiểm tra bảng group_user_organization_units
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'group_user_organization_units')
    PRINT '✅ Bảng group_user_organization_units: Đã tồn tại';
ELSE
    PRINT '❌ Bảng group_user_organization_units: CHƯA TỒN TẠI';

-- Kiểm tra Foreign Key
IF EXISTS (
    SELECT 1 
    FROM sys.foreign_keys 
    WHERE name = 'FK_users_organization_unit'
)
    PRINT '✅ Foreign Key FK_users_organization_unit: Đã tồn tại';
ELSE
    PRINT '❌ Foreign Key FK_users_organization_unit: CHƯA TỒN TẠI';

PRINT '============================================';
PRINT 'Migration hoàn tất!';
PRINT '============================================';
GO

