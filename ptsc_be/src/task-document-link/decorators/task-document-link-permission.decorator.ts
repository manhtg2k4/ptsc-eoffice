import { SetMetadata } from '@nestjs/common';
import { TaskDocumentLinkAction } from '../task-document-link-permission.service';

export const TASK_DOCUMENT_LINK_PERMISSION_KEY = 'task_document_link_permission';

export const RequireTaskDocumentLinkPermission = (action: TaskDocumentLinkAction) =>
  SetMetadata(TASK_DOCUMENT_LINK_PERMISSION_KEY, action);
