IF NOT EXISTS (
  SELECT 1
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[hrm_sync_history]')
    AND type = N'U'
)
BEGIN
  CREATE TABLE [dbo].[hrm_sync_history] (
    [id] INT IDENTITY(1, 1) NOT NULL PRIMARY KEY,
    [sync_time] DATETIME NOT NULL DEFAULT GETDATE(),
    [added] INT NOT NULL DEFAULT 0,
    [updated] INT NOT NULL DEFAULT 0,
    [unchanged] INT NOT NULL DEFAULT 0,
    [total] INT NOT NULL DEFAULT 0
  );
END;
