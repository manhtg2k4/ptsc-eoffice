// src/post-storage-ai/dto/push-ai.dto.ts

import { AiKind } from '../post-storage-ai.types';

/**
 * DTO nội bộ dùng để push dữ liệu sang AI
 */
export class PushAiDto {
  kind: AiKind;

  /**
   * Metadata chính là object `data`
   * trả về từ POST /api/outgoing-documents
   */
  metadata: any;

  /**
   * File có thể có hoặc không
   */
  file?: {
    buffer?: Buffer;
    fullPath?: string;
    filename: string;
    mimetype: string;
  };
}