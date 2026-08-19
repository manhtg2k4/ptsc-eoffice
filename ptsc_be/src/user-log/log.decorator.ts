// src/user-log/log.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const LOG_ACTION_KEY = 'logAction';
export const LogAction = (actionName?: string) =>
  SetMetadata(LOG_ACTION_KEY, actionName || true);
