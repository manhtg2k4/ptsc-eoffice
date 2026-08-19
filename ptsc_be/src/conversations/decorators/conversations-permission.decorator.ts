import { SetMetadata } from '@nestjs/common';

export const CONVERSATIONS_PERMISSION_KEY = 'conversations_permission';

export enum ConversationsPermissionAction {
  CREATE = 'CREATE',
  VIEW = 'VIEW',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACTION = 'ACTION', // Pin, unpin, soft-delete, markRead...
}

export const RequireConversationsPermission = (action: ConversationsPermissionAction) =>
  SetMetadata(CONVERSATIONS_PERMISSION_KEY, action);