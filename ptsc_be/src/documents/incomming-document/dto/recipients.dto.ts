
// Types// ========================
export interface DocumentRow {
  document_id: string;
  status_code?: string | null;

  created_at?: Date;
  updated_at?: Date;

  book_document_id?: number;
  abstract_note?: string;
  to_book?: string;
  to_book_code?: string;

  sender_unit?: string;
  receiver_unit?: string;

  document_date?: Date | string;
  receive_date?: Date | string;
  to_book_date?: Date | string;
  deadline?: Date | string;
  resolution_deadline?: Date | string;

  second_book?: string;
  receive_method?: string;
  private_level?: string;
  urgency_level?: string;
  document_type?: string;
  document_field?: string;
  signer?: string;

  fileids?: string;

  status?: number;
  isStar?: boolean;

  parent_doc?: string;
  type_process_doc?: string;

  bpmn_version?: string;
  copy_to_internal?: string;
  copy_count?: number;
  page_count?: number;
  view_group?: string;

  // computed / mapped
  viewers?: string[];
  is_authority?: string;
  is_incomming?: boolean;
}

interface IUser {
  _id: any;
  types: string;
  name?: string;
  fullname?: string;
  displayName?: string;
  username?: string;
}
export interface WorkItemRow {
  id: number | string;
  document_id: string;
  node_id: string;
  role: string;
  assignee_user_id?: string | null;
  node_type: string;
  state: string;
  created_at?: Date;
}

export interface AuditRow {
  id?: number;
  documentId: string;
  time?: Date | string;
  userId?: string | null;
  displayName?: string | null;
  role?: string | null;
  actionCode?: string | null;
  fromNodeId?: string | null;
  toNodeId?: string | null;
  originId?: string | null;
  createdBy?: string | null;
  receiver?: string | null;
  receiverUnit?: string | null;
  groupField?: string | null;
  roleProcess?: string | null;
  action?: string | null;
  deadline?: Date | string | null;
  stageStatus?: string | null;
  details?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface UserRoleRow {
  user_id: string;
  display_name: string;
}

export interface CommentRow {
  id: string;
  document_id: string;
  parent_id?: string | null;
  user_id: string;
  user_name: string;
  content: string;
  type: string;
  is_edited: 0 | 1;
  created_at: Date;
}

export interface BookDocumentRow {
  book_document_id: string;
  name: string;
  year?: number;
  status?: number;
  type_document?: string;
  sender_unit?: string;
  to_book_code?: string;
  document_field?: string;
  private_level?: string;
  manager_book?: string;
  count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkItemRow {
  id: number | string;
  document_id: string;
  node_id: string;
  role: string;
  assignee_user_id?: string | null;
  node_type: string;
  state: string;
  created_at?: Date;
}

export interface AuditRow {
  id?: number;
  documentId: string;
  time?: Date | string;
  userId?: string | null;
  displayName?: string | null;
  role?: string | null;
  actionCode?: string | null;
  fromNodeId?: string | null;
  toNodeId?: string | null;
  originId?: string | null;
  createdBy?: string | null;
  receiver?: string | null;
  receiverUnit?: string | null;
  groupField?: string | null;
  roleProcess?: string | null;
  action?: string | null;
  deadline?: Date | string | null;
  stageStatus?: string | null;
  details?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface OrgUnit {
  id: string;
  name: string;
  code?: string;
  [key: string]: any;
}

export interface BookDocument {
  name: string;
  to_book_code: string;
  count: number;
}

export interface CRMItem {
  value: string;
  title: string;
}