/**
 * Danh sách các stage/API được hỗ trợ ủy quyền
 * Thêm các stage mới vào đây khi cần
 */
export const AuthorityStages = {
  // Quản lý văn bản
  DOCUMENT_APPROVAL: 'document_approval',
  MEETING_APPROVAL: 'meeting_approval',
  ARCHIVE_RECORD: 'archive_records',
  DOCUMENT_REVIEW: 'document_review',
  DOCUMENT_SIGN: 'document_sign',

  // Quản lý ngân sách
  BUDGET_APPROVAL: 'budget_approval',
  BUDGET_REVIEW: 'budget_review',

  // Quản lý người dùng
  USER_MANAGEMENT: 'user_management',
  USER_APPROVAL: 'user_approval',

  // Quản lý quy trình
  WORKFLOW_APPROVAL: 'workflow_approval',
  VEHICLE_REGISTRATION: 'vehicle_registration',
  ALBUM_IMAGES: 'album_images',
  BANNER: 'banner',
  MEDIA_GALLERY: 'media_gallery',

  // Thêm các stage khác tại đây...
} as const;

export type AuthorityStage = typeof AuthorityStages[keyof typeof AuthorityStages];

