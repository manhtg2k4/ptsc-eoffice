import { Injectable, Logger } from '@nestjs/common';

/**
 * PermissionCacheService - Cache quyền BPMN trong bộ nhớ
 * 
 * Mục đích: Tránh parse BPMN XML và query DB mỗi request.
 * Cache tự động hết hạn sau TTL (mặc định 5 phút).
 * Có thể invalidate thủ công khi admin thay đổi BPMN hoặc phân quyền.
 */

interface CachedPermission {
  roles: string[];                      // Danh sách role codes (lowercase)
  permissions: Record<string, boolean>; // { canView: true, canCreate: false, ... }
  resolvedAt: number;                   // Timestamp (ms)
}

interface CachedLanes {
  lanes: any[];
  resolvedAt: number;
}

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);

  // Cache key: `${userId}:${processKey}` → permissions
  private cache = new Map<string, CachedPermission>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 phút

  // Cache BPMN Lane indexes theo flowConfigId (tránh parse XML lặp lại)
  private laneCache = new Map<string, CachedLanes>();

  // ===================== Permission Cache =====================

  getPermission(userId: string, processKey: string): CachedPermission | null {
    const key = `${userId}:${processKey}`;
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.resolvedAt > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return cached;
  }

  setPermission(userId: string, processKey: string, data: Omit<CachedPermission, 'resolvedAt'>): void {
    const key = `${userId}:${processKey}`;
    this.cache.set(key, { ...data, resolvedAt: Date.now() });
  }

  // ===================== BPMN Lane Cache =====================

  getLanes(flowConfigId: string): any[] | null {
    const cached = this.laneCache.get(flowConfigId);
    if (!cached) return null;
    if (Date.now() - cached.resolvedAt > this.TTL_MS) {
      this.laneCache.delete(flowConfigId);
      return null;
    }
    return cached.lanes;
  }

  setLanes(flowConfigId: string, lanes: any[]): void {
    this.laneCache.set(flowConfigId, { lanes, resolvedAt: Date.now() });
  }

  // ===================== Invalidation =====================

  /** Gọi khi admin thay đổi BPMN → xóa tất cả cache liên quan đến process */
  invalidateByProcess(processKey: string): void {
    let count = 0;
    for (const [key] of this.cache) {
      if (key.endsWith(`:${processKey}`)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.laneCache.delete(processKey);
  }

  /** Gọi khi thay đổi phân quyền hoặc nhóm người dùng → xóa cache của user đó */
  invalidateByUser(userId: string): void {
    let count = 0;
    for (const [key] of this.cache) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
  }

  /** Xóa toàn bộ cache (ví dụ: khi deploy mới) */
  invalidateAll(): void {
    const permCount = this.cache.size;
    const laneCount = this.laneCache.size;
    this.cache.clear();
    this.laneCache.clear();
  }

  /** Lấy thống kê cache (dùng cho monitoring) */
  getStats(): { permissionEntries: number; laneEntries: number } {
    return {
      permissionEntries: this.cache.size,
      laneEntries: this.laneCache.size,
    };
  }
}
