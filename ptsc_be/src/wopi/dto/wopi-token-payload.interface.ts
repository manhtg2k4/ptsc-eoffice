export interface WopiTokenPayload {
  fileId: string;
  userId: string;
  permissions: {
    canEdit: boolean;
    canView: boolean;
    canShare: boolean;
  };
  exp: number;
}
