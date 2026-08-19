-- SQL Server CREATE TABLE script for DashboardConfig
CREATE TABLE [dbo].[dashboard_config] (
    [id] [int] IDENTITY(1,1) NOT NULL,
    [userId] [nvarchar](100) NOT NULL,
    [columnLeft] [nvarchar](max) NULL DEFAULT '',
    [columnRight] [nvarchar](max) NULL DEFAULT '',
    [statOrder] [nvarchar](max) NULL DEFAULT '',
    [createdAt] [datetime2](7) NOT NULL DEFAULT (getdate()),
    [updatedAt] [datetime2](7) NOT NULL DEFAULT (getdate()),
    CONSTRAINT [PK_dashboard_config] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_dashboard_config_userId] UNIQUE NONCLUSTERED ([userId] ASC)
);
GO
