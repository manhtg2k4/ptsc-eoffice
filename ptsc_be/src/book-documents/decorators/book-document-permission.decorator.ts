import { SetMetadata } from '@nestjs/common';

export const BOOK_DOCUMENT_PERMISSION_KEY = 'book_document_permission';

/**
 * Decorator để đánh dấu endpoint cần kiểm tra quyền sổ văn bản
 * Sử dụng trên các method cần bảo vệ (create, update)
 */
export function RequireBookDocumentPermission() {
  return SetMetadata(BOOK_DOCUMENT_PERMISSION_KEY, true);
}
