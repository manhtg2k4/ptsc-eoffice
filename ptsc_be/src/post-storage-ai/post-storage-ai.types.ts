// src/post-storage-ai/post-storage-ai.types.ts

export type AiKind = 'incoming' | 'outgoing';

/**
 * Trạng thái sync AI của 1 document (in-memory)
 * Dùng để đảm bảo idempotent (không gửi trùng vô hạn)
 */
export interface PostStorageAiState {
  documentId: string;

  kind: AiKind;

  /** cache metadata thô (response "data" của outgoing document) */
  metadata?: any;

  /** đã push AI chưa (metadata-only hoặc combined) */
  synced: boolean;

  /** đã push kèm file chưa */
  syncedWithFile: boolean;

  /** hash payload gần nhất để chống push trùng nội dung */
  lastPayloadHash?: string;

  /** timer chờ file (60s) */
  waitFileTimer?: NodeJS.Timeout;

  lastSyncAt?: Date;
}