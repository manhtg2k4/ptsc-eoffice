// src/post-storage-ai/post-storage-ai.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ChatbotAiAdapter } from './adapters/chatbot-ai.adapter';
import { PostStorageAiRepository } from './repositories/post-storage-ai.repository';
import { PushAiDto } from './dto/push-ai.dto';
import { PostStorageAiHelper } from './helpers/post-storage-ai.helper';
import {
  POST_STORAGE_AI_KIND_OUTGOING,
  POST_STORAGE_AI_KIND_INCOMING,
  FILE_OBJECT_TYPE_DOC_DRAFT,
  FILE_OBJECT_TYPE_INCOMING_DOCUMENT,
} from './post-storage-ai.constants';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';

type TrySyncEvent = 'metadata' | 'file' | 'manual';

type TrySyncParams =
  | string
  | {
      documentId: string;
      /** metadata raw lấy từ response tạo outgoing (data) */
      metadata?: any;
      /** event nguồn gọi */
      event?: TrySyncEvent;
    };

interface NormalizedSyncParams {
  documentId: string;
  metadata?: any;
  event: TrySyncEvent;
}

/**
 * Parse boolean env safely:
 * - "true"  -> true
 * - "false" -> false
 * - undefined -> defaultValue
 */
function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  return String(raw).toLowerCase() === 'true';
}

function isIncomingAiEnabled(): boolean {
  // default ON if not set
  return envBool('ENABLE_AI_SYNC_INCOMING', true);
}

function isOutgoingAiEnabled(): boolean {
  // default ON if not set
  return envBool('ENABLE_AI_SYNC_OUTGOING', true);
}

@Injectable()
export class PostStorageAiService {
  private readonly logger = new Logger(PostStorageAiService.name);

  // timeout 60s theo yêu cầu
  private readonly WAIT_FILE_MS = 60_000;

  /**
   * ============================================================
   * BOOK DOCUMENT FILTER (bật/tắt trong code, KHÔNG env)
   * ============================================================
   * Yêu cầu bổ sung:
   * - Chỉ sync sang AI nếu bookDocumentId == 36
   * - Áp dụng cho cả incoming và outgoing
   *
   * Cách bật/tắt:
   * - Đặt ENABLE_BOOK_DOCUMENT_ID_FILTER = true/false
   *
   * Lưu ý:
   * - Filter này chỉ chặn tại "thời điểm push" (không phá cache/timer).
   * - Nếu metadata không có bookDocumentId => mặc định KHÔNG sync (an toàn).
   */
  private readonly ENABLE_BOOK_DOCUMENT_ID_FILTER = true;
  private readonly ALLOWED_BOOK_DOCUMENT_IDS = new Set<string>(['88', '89']);

  /**
   * Trả về true nếu document KHÔNG đạt điều kiện bookDocumentId => nên skip push AI.
   * - Chấp nhận bookDocumentId là number hoặc string.
   * - Nếu thiếu/null/empty => skip.
   */
  private shouldSkipAiSyncByBookDocumentId(metadata: any): boolean {
    if (!this.ENABLE_BOOK_DOCUMENT_ID_FILTER) return false; // filter tắt => không skip
    const raw = metadata?.bookDocumentId;
    if (raw === undefined || raw === null || String(raw).trim() === '') return true;
    const normalized = String(raw).trim();
    return !this.ALLOWED_BOOK_DOCUMENT_IDS.has(normalized);
  }

  constructor(
    private readonly aiAdapter: ChatbotAiAdapter,
    private readonly repo: PostStorageAiRepository,
    private readonly filesService: FilesManagementService,
  ) {}

  /**
   * Central gate to push data to AI based on env flags.
   * - Incoming controlled by ENABLE_AI_SYNC_INCOMING
   * - Outgoing controlled by ENABLE_AI_SYNC_OUTGOING
   */
  private async pushToAi(payload: PushAiDto): Promise<void> {
    const kind = payload?.kind;

    if (kind === POST_STORAGE_AI_KIND_INCOMING && !isIncomingAiEnabled()) {
      const docId = (payload as any)?.metadata?.documentId || (payload as any)?.metadata?.id;
      this.logger.warn(
        `[AI_SYNC_DISABLED] Skip INCOMING AI sync (ENABLE_AI_SYNC_INCOMING=false). documentId=${docId ?? 'unknown'}`,
      );
      return;
    }

    if (kind === POST_STORAGE_AI_KIND_OUTGOING && !isOutgoingAiEnabled()) {
      const docId = (payload as any)?.metadata?.documentId || (payload as any)?.metadata?.id;
      this.logger.warn(
        `[AI_SYNC_DISABLED] Skip OUTGOING AI sync (ENABLE_AI_SYNC_OUTGOING=false). documentId=${docId ?? 'unknown'}`,
      );
      return;
    }

    await this.aiAdapter.push(payload);
  }

  /**
   * Quy tắc:
   * - Event metadata (create outgoing):
   *    + cache metadata
   *    + set timer 60s chờ file
   *    + KHÔNG push metadata-only ngay
   *
   * - Event file (upload file):
   *    + nếu đã có metadata cache -> push combined ngay
   *    + nếu chưa có metadata -> chỉ ghi log (đợi metadata event / manual)
   *
   * - Event manual:
   *    + nếu có file + có metadata -> push combined
   *    + nếu chỉ có metadata -> push metadata-only ngay
   */
  async trySyncOutgoing(input: TrySyncParams): Promise<void> {
    if (!isOutgoingAiEnabled()) {
      this.logger.warn('[AI_SYNC_DISABLED] Skip trySyncOutgoing (ENABLE_AI_SYNC_OUTGOING=false).');
      return;
    }

    const params = this.normalizeParams(input);
    const documentId = params.documentId;
    if (!documentId) return;

    // 1) nếu có metadata => cache lại
    if (params.metadata) {
      this.repo.setMetadata(documentId, params.metadata);

      // event metadata => set timer 60s chờ file
      if (params.event === 'metadata') {
        const timer = setTimeout(() => {
          this.finalizeMetadataOnly(documentId).catch((e) =>
            this.logger.error(`Finalize metadata-only failed: ${documentId}`, e?.stack || e),
          );
        }, this.WAIT_FILE_MS);

        this.repo.setWaitFileTimer(documentId, timer);
      }
    }

    // 2) event file => ưu tiên đẩy combined nếu đủ điều kiện
    if (params.event === 'file') {
      await this.pushIfPossible(documentId, { preferWithFile: true, allowMetadataOnly: false });
      return;
    }

    // 3) manual: cho phép push metadata-only ngay nếu chưa có file
    if (params.event === 'manual') {
      await this.pushIfPossible(documentId, { preferWithFile: true, allowMetadataOnly: true });
      return;
    }

    // 4) metadata event: KHÔNG push metadata-only ngay (đợi timer)
    await this.pushIfPossible(documentId, { preferWithFile: true, allowMetadataOnly: false });
  }

  /**
   * Sync AI cho VĂN BẢN ĐẾN (incoming)
   * - metadata: cache + set timer chờ file (mặc định 60s)
   * - file: nếu đã có metadata thì push combined ngay
   * - manual: cho phép push metadata-only (tuỳ bạn gọi)
   */
  async trySyncIncoming(input: TrySyncParams): Promise<void> {
    if (!isIncomingAiEnabled()) {
      this.logger.warn('[AI_SYNC_DISABLED] Skip trySyncIncoming (ENABLE_AI_SYNC_INCOMING=false).');
      return;
    }

    const params = this.normalizeParams(input);
    const documentId = params.documentId;
    if (!documentId) return;

    const kind: 'incoming' = 'incoming';

    // 1) nếu có metadata => cache lại
    if (params.metadata) {
      this.repo.setMetadata(documentId, params.metadata, kind);

      // event metadata => set timer chờ file
      if (params.event === 'metadata') {
        const timer = setTimeout(() => {
          this.finalizeMetadataOnlyIncoming(documentId).catch((e) =>
            this.logger.error(`Finalize incoming metadata-only failed: ${documentId}`, e?.stack || e),
          );
        }, this.WAIT_FILE_MS);

        this.repo.setWaitFileTimer(documentId, timer, kind);
      }
    }

    // 2) event file => ưu tiên push combined ngay (nếu có đủ metadata)
    if (params.event === 'file') {
      await this.pushIfPossibleIncoming(documentId, { preferWithFile: true, allowMetadataOnly: false });
      return;
    }

    // 3) manual: cho phép push metadata-only ngay nếu chưa có file
    if (params.event === 'manual') {
      await this.pushIfPossibleIncoming(documentId, { preferWithFile: true, allowMetadataOnly: true });
      return;
    }

    // 4) metadata event: KHÔNG push metadata-only ngay (đợi timer)
    await this.pushIfPossibleIncoming(documentId, { preferWithFile: true, allowMetadataOnly: false });
  }

  private normalizeParams(input: TrySyncParams): NormalizedSyncParams {
    if (typeof input === 'string') {
      return { documentId: String(input || '').trim(), event: 'manual' };
    }

    const documentId = String(input?.documentId || '').trim();
    const event: TrySyncEvent = (input?.event || 'manual') as TrySyncEvent;

    return {
      documentId,
      event,
      metadata: input?.metadata,
    };
  }

  /**
   * Hết 60s mà chưa có file → đẩy metadata-only (nếu chưa đẩy gì)
   */
  private async finalizeMetadataOnly(documentId: string) {
    const st = this.repo.get(documentId);
    if (!st?.metadata) return;

    // nếu đã push rồi thì khỏi
    if (st.synced) return;

    // nếu ngay lúc timeout mà file đã tồn tại rồi → push combined luôn
    const hasFile = await this.hasDocDraftFile(documentId);
    if (hasFile) {
      await this.pushIfPossible(documentId, { preferWithFile: true, allowMetadataOnly: false });
      return;
    }

    // push metadata-only
    await this.pushMetadataOnly(documentId);
  }

  /**
   * Quyết định push:
   * - preferWithFile=true và có file → combined
   * - nếu không có file:
   *    + allowMetadataOnly=true → push metadata-only
   *    + allowMetadataOnly=false → không push (đợi timer)
   */
  private async pushIfPossible(
    documentId: string,
    opts: { preferWithFile: boolean; allowMetadataOnly: boolean },
  ) {
    const st = this.repo.get(documentId);
    if (!st?.metadata) {
      this.logger.warn(`[PostStorageAI] No cached metadata yet for documentId=${documentId}`);
      return;
    }

    // ƯU TIÊN BPMN VERSION: Nếu là văn bản đi (VAN_BAN_DI) => cho phép push, bỏ qua bookDocumentId
    // Nếu KHÔNG phải VAN_BAN_DI => mới áp filter bookDocumentId như cũ
    const isOutgoingByBpmn = st.metadata?.bpmnVersion === 'VAN_BAN_DI';
    if (!isOutgoingByBpmn && this.shouldSkipAiSyncByBookDocumentId(st.metadata)) {
     // Không markSynced để tránh "đóng băng" vĩnh viễn trong trường hợp sau này bạn tắt filter và muốn sync lại.
     // Nhưng để tránh timer chạy vô ích, ta clear timer chờ file nếu có.
     this.repo.clearWaitFileTimer?.(documentId);
     return;
    }

    // đã push combined rồi => thôi
    if (st.synced && st.syncedWithFile) return;

    const hasFile = await this.hasDocDraftFile(documentId);

    // ưu tiên combined
    if (opts.preferWithFile && hasFile) {
      await this.pushCombined(documentId);
      return;
    }

    // đã push metadata-only rồi mà giờ có file => upgrade lên combined
    if (hasFile && st.synced && !st.syncedWithFile) {
      await this.pushCombined(documentId);
      return;
    }

    // chưa có file
    if (!hasFile && opts.allowMetadataOnly) {
      await this.pushMetadataOnly(documentId);
      return;
    }

    // còn lại: không làm gì (đợi metadata timer / lần gọi sau)
  }

  private async pushMetadataOnly(documentId: string) {
    const st = this.repo.get(documentId);
    if (!st?.metadata) return;

   //BOOK DOCUMENT FILTER
   const isOutgoingByBpmn = st.metadata?.bpmnVersion === 'VAN_BAN_DI';
   if (!isOutgoingByBpmn && this.shouldSkipAiSyncByBookDocumentId(st.metadata)) {
     this.repo.clearWaitFileTimer?.(documentId);
     return;
   }

    const metadata = PostStorageAiHelper.normalizeMetadata(st.metadata);

    const payloadHash = this.hashPayload({
      kind: POST_STORAGE_AI_KIND_OUTGOING,
      metadata,
      file: null,
    });

    if (st.lastPayloadHash === payloadHash) return;

    await this.pushToAi({
      kind: POST_STORAGE_AI_KIND_OUTGOING,
      metadata,
      file: undefined,
    });

    this.repo.markSynced(documentId, false, payloadHash);
  }

  private async pushCombined(documentId: string) {
    const st = this.repo.get(documentId);
    if (!st?.metadata) return;

    //BOOK DOCUMENT FILTER
    const isOutgoingByBpmn = st.metadata?.bpmnVersion === 'VAN_BAN_DI';
    if (!isOutgoingByBpmn && this.shouldSkipAiSyncByBookDocumentId(st.metadata)) {
      this.repo.clearWaitFileTimer?.(documentId);
      return;
    }

    const metadata = PostStorageAiHelper.normalizeMetadata(st.metadata);

    // lấy file docDraft mới nhất (object_type=docDraft, object_id=documentId)
    const rs = await this.filesService.getLatestFilesByObject('docDraft', documentId, { page: 1, limit: 1 });
    const files = rs?.data || [];
    if (!files.length) {
      this.logger.warn(`No docDraft file found when pushing combined: documentId=${documentId}`);
      return;
    }

    const file = files[0];
    const view = await this.filesService.getFileForView(file.id);

    const filePayload: PushAiDto['file'] = {
      buffer: view.fileBuffer,
      fullPath: view.fullPath,
      filename: view.filename,
      mimetype: view.mimetype,
    };

    const payloadHash = this.hashPayload({
      kind: POST_STORAGE_AI_KIND_OUTGOING,
      metadata,
      file: { fullPath: view.fullPath, filename: view.filename },
    });

    if (st.lastPayloadHash === payloadHash) return;

    await this.pushToAi({
      kind: POST_STORAGE_AI_KIND_OUTGOING,
      metadata,
      file: filePayload,
    });

    this.repo.markSynced(documentId, true, payloadHash);
  }

  private async hasDocDraftFile(documentId: string): Promise<boolean> {
    const rs = await this.filesService.getLatestFilesByObject('docDraft', documentId, { page: 1, limit: 1 });
    const files = rs?.data || [];
    return files.length > 0;
  }

  private hashPayload(obj: any): string {
    const raw = JSON.stringify(obj);
    return createHash('sha256').update(raw).digest('hex');
  }

  private async finalizeMetadataOnlyIncoming(documentId: string) {
    const kind: 'incoming' = 'incoming';
    const st = this.repo.get(documentId, kind);
    if (!st?.metadata) return;

    // nếu đã sync combined rồi thì thôi
    if (st.synced && st.syncedWithFile) return;

    const hasFile = await this.hasIncomingDocumentFile(documentId);
    if (hasFile) {
      await this.pushCombinedIncoming(documentId);
       return;
    }

    // đến deadline vẫn chưa có file => push metadata-only
    await this.pushMetadataOnlyIncoming(documentId);
  }

  private async pushIfPossibleIncoming(
    documentId: string,
    opts: { preferWithFile: boolean; allowMetadataOnly: boolean },
  ) {
    const kind: 'incoming' = 'incoming';
    const st = this.repo.get(documentId, kind);
    if (!st?.metadata) {
      this.logger.warn(`[PostStorageAI] (incoming) No cached metadata yet for documentId=${documentId}`);
      return;
    }

   //BOOK DOCUMENT FILTER: nếu không đạt điều kiện => không push sang AI
   if (this.shouldSkipAiSyncByBookDocumentId(st.metadata)) {
     this.repo.clearWaitFileTimer?.(documentId, kind);
     return;
   }

    // đã push combined rồi => thôi
    if (st.synced && st.syncedWithFile) return;

    const hasFile = await this.hasIncomingDocumentFile(documentId);

    // ưu tiên combined
    if (opts.preferWithFile && hasFile) {
      await this.pushCombinedIncoming(documentId);
      return;
    }

    // nếu cho phép metadata-only
    if (opts.allowMetadataOnly) {
      await this.pushMetadataOnlyIncoming(documentId);
    }
  }

  private async pushMetadataOnlyIncoming(documentId: string) {
    const kind: 'incoming' = 'incoming';
    const st = this.repo.get(documentId, kind);
    if (!st?.metadata) return;

    //BOOK DOCUMENT FILTER
    if (this.shouldSkipAiSyncByBookDocumentId(st.metadata)) {
      this.repo.clearWaitFileTimer?.(documentId, kind);
      return;
    }

    const metadata = PostStorageAiHelper.normalizeMetadata(st.metadata);

    const payloadHash = this.hashPayload({
      kind: POST_STORAGE_AI_KIND_INCOMING,
      metadata,
      file: null,
    });

    if (st.lastPayloadHash === payloadHash) return;

    await this.pushToAi({
      kind: POST_STORAGE_AI_KIND_INCOMING,
      metadata,
      file: undefined,
    });

    this.repo.markSynced(documentId, false, payloadHash, kind);
  }

  private async pushCombinedIncoming(documentId: string) {
    const kind: 'incoming' = 'incoming';
    const st = this.repo.get(documentId, kind);
    if (!st?.metadata) return;

    //BOOK DOCUMENT FILTER
    if (this.shouldSkipAiSyncByBookDocumentId(st.metadata)) {
      this.repo.clearWaitFileTimer?.(documentId, kind);
      return;
    }

    const metadata = PostStorageAiHelper.normalizeMetadata(st.metadata);

    // lấy file incoming mới nhất (object_type=incommingdocument, object_id=documentId)
    const rs = await this.filesService.getLatestFilesByObject(
      FILE_OBJECT_TYPE_INCOMING_DOCUMENT,
      documentId,
      { page: 1, limit: 1 },
    );

    const files = rs?.data || [];
    if (!files.length) {
      this.logger.warn(`No incomingdocument file found when pushing combined: documentId=${documentId}`);
      return;
    }

    const file = files[0];
    const view = await this.filesService.getFileForView(file.id);

    const filePayload: PushAiDto['file'] = {
      buffer: view.fileBuffer,
      fullPath: view.fullPath,
      filename: view.filename,
      mimetype: view.mimetype,
    };

    const payloadHash = this.hashPayload({
      kind: POST_STORAGE_AI_KIND_INCOMING,
      metadata,
      file: { fullPath: view.fullPath, filename: view.filename },
    });

    if (st.lastPayloadHash === payloadHash) return;

    await this.pushToAi({
      kind: POST_STORAGE_AI_KIND_INCOMING,
      metadata,
      file: filePayload,
    });

    this.repo.markSynced(documentId, true, payloadHash, kind);
  }

  private async hasIncomingDocumentFile(documentId: string): Promise<boolean> {
    const rs = await this.filesService.getLatestFilesByObject(
      FILE_OBJECT_TYPE_INCOMING_DOCUMENT,
      documentId,
      { page: 1, limit: 1 },
    );
    const files = rs?.data || [];
    return files.length > 0;
  }
}