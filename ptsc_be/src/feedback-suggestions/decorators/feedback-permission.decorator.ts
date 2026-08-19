import { SetMetadata } from '@nestjs/common';

export enum FeedbackPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  DISPATCH = 'dispatch',
  ACCEPT = 'accept',
  COMPLETE = 'complete',
  RATING = 'rating',
  REJECT = 'reject',
}

export const FEEDBACK_PERMISSION_KEY = 'feedback_permission';
export const RequireFeedbackPermission = (action: FeedbackPermissionAction) =>
  SetMetadata(FEEDBACK_PERMISSION_KEY, action);
