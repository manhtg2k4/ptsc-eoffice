import { SetMetadata } from '@nestjs/common';

export const RECORD_SCOPE_KEY = 'recordScope';

export const NEWS_RECORD_SCOPES = {
  ANY_VISIBLE: 'NEWS_ANY_VISIBLE',
  DRAFT: 'NEWS_DRAFT',
  PENDING_APPROVAL: 'NEWS_PENDING_APPROVAL',
  PUBLISHED: 'NEWS_PUBLISHED',
  RETURNED: 'NEWS_RETURNED',
  CANCELLED: 'NEWS_CANCELLED',
  RECALLED: 'NEWS_RECALLED',
  RECALLED_BY_USER: 'NEWS_RECALLED_BY_USER',
  WAITING_APPROVAL: 'NEWS_WAITING_APPROVAL',
} as const;

export type NewsRecordScope =
  (typeof NEWS_RECORD_SCOPES)[keyof typeof NEWS_RECORD_SCOPES];

export const RecordScope = (scope: string) => SetMetadata(RECORD_SCOPE_KEY, scope);
