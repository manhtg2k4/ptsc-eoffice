import { SetMetadata } from '@nestjs/common';

export const CHECK_AUTHORITY_KEY = 'checkAuthority';

/**
 * Decorator để check ủy quyền cho API cụ thể
 * @param stage - Tên stage/API cần check (ví dụ: 'approval', 'document_review', etc.)
 * @example
 * @CheckAuthority('document_approval')
 * async approveDocument() { ... }
 */
export const CheckAuthority = (stage: string) => SetMetadata(CHECK_AUTHORITY_KEY, stage);

