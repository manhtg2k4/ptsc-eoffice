export class WopiFileInfoDto {
  // Required properties
  BaseFileName: string;
  OwnerId: string;
  Size: number;
  UserId: string;
  Version: string;
  
  // Permissions
  UserCanWrite: boolean;
  UserCanNotWriteRelative: boolean;
  ReadOnly: boolean;
  
  // WOPI Locking Support
  SupportsUpdate?: boolean;
  SupportsLocks?: boolean;
  SupportsGetLock?: boolean;
  
  // Optional but recommended
  UserFriendlyName?: string;
  LastModifiedTime?: string;
  SHA256?: string;
  
  // Collabora-specific
  DisablePrint?: boolean;
  DisableExport?: boolean;
  DisableCopy?: boolean;

  SupportsRename?: boolean;
  UserCanRename?: boolean;
}
