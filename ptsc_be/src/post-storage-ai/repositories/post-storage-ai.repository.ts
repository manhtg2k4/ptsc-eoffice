// src/post-storage-ai/repositories/post-storage-ai.repository.ts

import { Injectable } from '@nestjs/common';
import { PostStorageAiState, AiKind } from '../post-storage-ai.types';

/**
 * Repo in-memory: lưu trạng thái sync theo documentId
 */
@Injectable()
export class PostStorageAiRepository {
  /**
   * Key: `${kind}:${documentId}`
   */
  private readonly store = new Map<string, PostStorageAiState>();

  private key(documentId: string, kind: AiKind): string {
    return `${kind}:${documentId}`;
  }

  get(documentId: string, kind: AiKind = 'outgoing'): PostStorageAiState | undefined {
    return this.store.get(this.key(documentId, kind));
  }

  getOrInit(documentId: string, kind: AiKind = 'outgoing'): PostStorageAiState {
    const k = this.key(documentId, kind);
    const cur = this.store.get(k);
    if (cur) return cur;

    const next: PostStorageAiState = {
      documentId,
      kind,
      synced: false,
      syncedWithFile: false,
      lastPayloadHash: undefined,
      lastSyncAt: undefined,
      waitFileTimer: undefined,
      metadata: undefined,
    };

    this.store.set(k, next);
    return next;
  }

  setMetadata(documentId: string, metadata: any, kind: AiKind = 'outgoing'): PostStorageAiState {
    const st = this.getOrInit(documentId, kind);
    st.metadata = metadata;
    this.store.set(this.key(documentId, kind), st);
    return st;
  }

  setWaitFileTimer(documentId: string, timer: NodeJS.Timeout, kind: AiKind = 'outgoing'): PostStorageAiState {
    const st = this.getOrInit(documentId, kind);
    st.waitFileTimer = timer;
    this.store.set(this.key(documentId, kind), st);
    return st;
  }

  /**
   * Clear timer "chờ file" theo documentId.
   *
   * Hỗ trợ 2 mode:
   * - clearWaitFileTimer(documentId)              : clear cho cả incoming  outgoing (tương thích code cũ)
   * - clearWaitFileTimer(documentId, kind)        : clear đúng theo kind (chuẩn kiến trúc)
   *
   * Lưu ý: repo của bạn lưu state trong Map với key `${kind}:${documentId}`,
   * nên việc clear phải thao tác trên `store` chứ không có incomingState/outgoingState.
   */
  clearWaitFileTimer(documentId: string): void;
  clearWaitFileTimer(documentId: string, kind: AiKind): void;
  clearWaitFileTimer(documentId: string, kind?: AiKind): void {
    const clearOne = (k: AiKind) => {
      const key = this.key(documentId, k);
      const st = this.store.get(key);
      if (!st?.waitFileTimer) return;

      clearTimeout(st.waitFileTimer);
      st.waitFileTimer = undefined;
      this.store.set(key, st);
    };

    // Nếu truyền kind => clear đúng 1 kho
    if (kind) {
      clearOne(kind);
      return;
    }

    // Nếu không truyền kind => clear cả 2 kho (incoming  outgoing) để tương thích ngược
    clearOne('incoming' as AiKind);
    clearOne('outgoing' as AiKind);
  }

  /**
   * Đánh dấu đã sync.
   * - withFile=false: metadata-only
   * - withFile=true : metadata + file
   */
  markSynced(documentId: string, withFile: boolean, payloadHash: string, kind: AiKind = 'outgoing') {
    const st = this.getOrInit(documentId, kind);
    st.synced = true;
    st.syncedWithFile = withFile ? true : st.syncedWithFile;
    st.lastPayloadHash = payloadHash;
    st.lastSyncAt = new Date();

    // nếu sync rồi thì timer chờ file không cần nữa
    if (st.waitFileTimer) {
      clearTimeout(st.waitFileTimer);
      st.waitFileTimer = undefined;
    }

    this.store.set(this.key(documentId, kind), st);
  }
}