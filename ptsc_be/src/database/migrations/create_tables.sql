-- =============================================
-- Script tạo bảng cho các entity đã chuyển từ MongoDB sang MSSQL
-- Chạy script này trên SQL Server database
-- =============================================

-- 1. Bảng bpmn_design_version
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='bpmn_design_version' AND xtype='U')
BEGIN
    CREATE TABLE bpmn_design_version (
        id INT IDENTITY(1,1) PRIMARY KEY,
        design_id NVARCHAR(255) NULL,
        process_key NVARCHAR(255) NULL,
        version INT DEFAULT 1,
        base64_file NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_bpmn_version_design_id ON bpmn_design_version(design_id);
    PRINT 'Created table: bpmn_design_version';
END
GO

-- 2. Bảng common_categories
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='common_categories' AND xtype='U')
BEGIN
    CREATE TABLE common_categories (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        category_code NVARCHAR(255) NULL,
        category_name NVARCHAR(500) NULL,
        description NVARCHAR(MAX) NULL,
        is_required BIT DEFAULT 0,
        value_list NVARCHAR(MAX) NULL, -- JSON array
        status INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_common_categories_code ON common_categories(category_code);
    PRINT 'Created table: common_categories';
END
GO

-- 3. Bảng theme_configs
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='theme_configs' AND xtype='U')
BEGIN
    CREATE TABLE theme_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        config_key NVARCHAR(255) UNIQUE DEFAULT 'main_theme',
        options NVARCHAR(MAX) NULL, -- JSON object
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: theme_configs';
END
GO

-- 4. Bảng custom_themes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='custom_themes' AND xtype='U')
BEGIN
    CREATE TABLE custom_themes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        created_by NVARCHAR(255) NOT NULL,
        options NVARCHAR(MAX) NULL, -- JSON object
        is_default BIT DEFAULT 0,
        status INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_custom_themes_created_by ON custom_themes(created_by);
    PRINT 'Created table: custom_themes';
END
GO

-- 5. Bảng decentralization
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='decentralization' AND xtype='U')
BEGIN
    CREATE TABLE decentralization (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_group_id NVARCHAR(255) UNIQUE NOT NULL,
        module_name NVARCHAR(MAX) NULL, -- JSON array
        function_name NVARCHAR(MAX) NULL, -- JSON array
        permissions NVARCHAR(MAX) NULL, -- JSON array
        status INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Created table: decentralization';
END
GO

-- 6. Bảng system_error_logs
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_error_logs' AND xtype='U')
BEGIN
    CREATE TABLE system_error_logs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(255) NULL,
        type NVARCHAR(255) NULL,
        message NVARCHAR(MAX) NULL,
        user_name NVARCHAR(255) NULL,
        status INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_system_error_logs_type ON system_error_logs(type);
    CREATE INDEX idx_system_error_logs_code ON system_error_logs(code);
    PRINT 'Created table: system_error_logs';
END
GO

-- 7. Bảng share_counts
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='share_counts' AND xtype='U')
BEGIN
    CREATE TABLE share_counts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        resource_id NVARCHAR(255) NOT NULL,
        count INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_share_counts_resource_id ON share_counts(resource_id);
    PRINT 'Created table: share_counts';
END
GO

-- 8. Bảng collection_management
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='collection_management' AND xtype='U')
BEGIN
    CREATE TABLE collection_management (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(500) NOT NULL,
        phone_number NVARCHAR(50) NOT NULL,
        email NVARCHAR(255) NULL,
        manager NVARCHAR(255) NULL,
        address NVARCHAR(MAX) NULL,
        description NVARCHAR(MAX) NULL,
        visits INT DEFAULT 0,
        status INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_collection_management_name ON collection_management(name);
    PRINT 'Created table: collection_management';
END
GO

-- 9. Bảng integration_management
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='integration_management' AND xtype='U')
BEGIN
    CREATE TABLE integration_management (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(500) UNIQUE NOT NULL,
        management_unit_id NVARCHAR(255) NULL,
        management_unit_name NVARCHAR(500) NULL,
        status_active INT NULL,
        access_count INT DEFAULT 0,
        description NVARCHAR(MAX) NULL,
        is_access_period BIT DEFAULT 0,
        access_period NVARCHAR(255) NULL,
        api_key NVARCHAR(255) NULL,
        is_access BIT DEFAULT 1,
        api_list NVARCHAR(MAX) NULL, -- JSON array
        status INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_integration_management_name ON integration_management(name);
    PRINT 'Created table: integration_management';
END
GO

-- 10. Bảng user_column_configs
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_column_configs' AND xtype='U')
BEGIN
    CREATE TABLE user_column_configs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(255) NOT NULL,
        code_module NVARCHAR(255) NOT NULL,
        columns NVARCHAR(MAX) NULL, -- JSON array
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT uq_user_column_configs UNIQUE (user_id, code_module)
    );
    PRINT 'Created table: user_column_configs';
END
GO

-- 11. Bảng role_groups
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='role_groups' AND xtype='U')
BEGIN
    CREATE TABLE role_groups (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        client_id NVARCHAR(255) NOT NULL,
        name NVARCHAR(500) NOT NULL,
        code NVARCHAR(255) UNIQUE NOT NULL,
        description NVARCHAR(MAX) NULL,
        entity_type NVARCHAR(255) NOT NULL,
        roles NVARCHAR(MAX) NULL, -- JSON array
        apply_to_module BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_role_groups_code ON role_groups(code);
    CREATE INDEX idx_role_groups_client_id ON role_groups(client_id);
    PRINT 'Created table: role_groups';
END
GO

-- 12. Bảng entity_role_groups
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='entity_role_groups' AND xtype='U')
BEGIN
    CREATE TABLE entity_role_groups (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        unit_id NVARCHAR(255) NOT NULL,
        entity_type NVARCHAR(50) NOT NULL,
        role_group_id NVARCHAR(255) NOT NULL,
        client_id NVARCHAR(255) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT uq_entity_role_groups UNIQUE (unit_id, entity_type, client_id)
    );
    CREATE INDEX idx_entity_role_groups_unit_id ON entity_role_groups(unit_id);
    PRINT 'Created table: entity_role_groups';
END
GO

-- 13. Bảng camunda_variables (đã tạo trước đó trong bpmn-designs migration)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='camunda_variables' AND xtype='U')
BEGIN
    CREATE TABLE camunda_variables (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        process_key NVARCHAR(255) NOT NULL,
        process_instance_id NVARCHAR(255) NULL,
        variables NVARCHAR(MAX) NULL, -- JSON object
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_camunda_variables_process_key ON camunda_variables(process_key);
    CREATE INDEX idx_camunda_variables_process_instance_id ON camunda_variables(process_instance_id);
    PRINT 'Created table: camunda_variables';
END
GO

-- 14. Bảng profile_management (đã tạo trước đó trong bpmn-designs migration)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='profile_management' AND xtype='U')
BEGIN
    CREATE TABLE profile_management (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        process_instance_id NVARCHAR(255) NULL,
        variables NVARCHAR(MAX) NULL, -- JSON object
        status INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_profile_management_process_instance_id ON profile_management(process_instance_id);
    PRINT 'Created table: profile_management';
END
GO

-- 15. Bảng hrm_sync_history
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='hrm_sync_history' AND xtype='U')
BEGIN
    CREATE TABLE hrm_sync_history (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sync_time DATETIME DEFAULT GETDATE(),
        added INT DEFAULT 0,
        updated INT DEFAULT 0,
        unchanged INT DEFAULT 0,
        total INT DEFAULT 0
    );
    CREATE INDEX idx_hrm_sync_history_sync_time ON hrm_sync_history(sync_time);
    PRINT 'Created table: hrm_sync_history';
END
GO

PRINT '=============================================';
PRINT 'All tables created successfully!';
PRINT '=============================================';









