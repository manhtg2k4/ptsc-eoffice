import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * SanitizeResponseInterceptor
 * 
 * Global interceptor loại bỏ các trường nhạy cảm khỏi response trước khi trả về client.
 * Áp dụng cho TẤT CẢ API responses.
 * 
 * Mục tiêu:
 * - Không trả về password hash, token nội bộ, system logs
 * - Không trả về metadata hệ thống không cần thiết
 * - Bảo vệ thông tin nhạy cảm khỏi bị lộ qua API
 */

// Danh sách các key nhạy cảm cần loại bỏ (lowercase để so sánh case-insensitive)
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'hashedpassword',
  'hashed_password',
  'hash',
  'salt',
  'secret',
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'internaltoken',
  'internal_token',
  'systemlogs',
  'system_logs',
  '_internal',
  '__v',
  'stacktrace',
  'stack_trace',
]);

// Danh sách prefix của key cần loại bỏ
const SENSITIVE_PREFIXES = [
  '_system',
  '_debug',
  '_log',
];

@Injectable()
export class SanitizeResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.sanitize(data)),
    );
  }

  /**
   * Đệ quy loại bỏ các trường nhạy cảm từ object/array
   * Giới hạn độ sâu để tránh circular reference hoặc object quá lớn
   */
  private sanitize(data: any, depth = 0): any {
    // Giới hạn đệ quy tối đa 15 tầng để tránh stack overflow
    if (depth > 15) return data;

    if (data === null || data === undefined) return data;

    // Nếu là primitive, trả về nguyên
    if (typeof data !== 'object') return data;

    // Nếu là Date, trả về nguyên
    if (data instanceof Date) return data;

    // Nếu là Buffer, trả về nguyên
    if (Buffer.isBuffer(data)) return data;

    // Nếu là Array, sanitize từng phần tử
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item, depth + 1));
    }

    // Nếu là Object, lọc các key nhạy cảm
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();

      // Bỏ qua nếu key nằm trong danh sách nhạy cảm
      if (SENSITIVE_KEYS.has(keyLower)) continue;

      // Bỏ qua nếu key bắt đầu bằng prefix nhạy cảm
      if (SENSITIVE_PREFIXES.some(prefix => keyLower.startsWith(prefix))) continue;

      // Đệ quy sanitize value
      sanitized[key] = this.sanitize(value, depth + 1);
    }

    return sanitized;
  }
}
