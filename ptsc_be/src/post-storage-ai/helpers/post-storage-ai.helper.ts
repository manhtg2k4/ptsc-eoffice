// src/post-storage-ai/helpers/post-storage-ai.helper.ts

export class PostStorageAiHelper {
  /**
   * Chuẩn hóa metadata trước khi gửi AI
   * (nếu sau này cần remove field, rename, flatten…)
   */
  static normalizeMetadata(metadata: any): any {
    if (!metadata) return {};

    // hiện tại giữ nguyên
    return metadata;
  }
}