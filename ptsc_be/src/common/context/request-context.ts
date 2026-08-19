import { AsyncLocalStorage } from 'async_hooks';

export class RequestContext {
  private static storage = new AsyncLocalStorage<Map<string, unknown>>();

  static run(values: Record<string, unknown>, callback: () => unknown) {
    const map = new Map<string, unknown>(this.storage.getStore());
    for (const [key, value] of Object.entries(values)) {
      map.set(key, value);
    }
    return this.storage.run(map, callback);
  }

  static getStore(): Map<string, unknown> | undefined {
    return this.storage.getStore();
  }

  static get(key: string): unknown {
    const store = this.getStore();
    return store ? store.get(key) : undefined;
  }

  static getString(key: string): string | undefined {
    const value = this.get(key);
    return typeof value === 'string' ? value : undefined;
  }

  static getNumber(key: string): number | undefined {
    const value = this.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  static set(key: string, value: unknown): void {
    const store = this.getStore();
    if (store) {
      store.set(key, value);
    }
  }

  static getUserId(): string | undefined {
    const userId = this.get('userId');
    return typeof userId === 'string' ? userId : undefined;
  }

  static getTraceId(): string | undefined {
    return this.getString('traceId');
  }

  static getSpanId(): string | undefined {
    return this.getString('spanId');
  }

  static getMethod(): string | undefined {
    return this.getString('method');
  }

  static getPath(): string | undefined {
    return this.getString('path');
  }

  static getRoute(): string | undefined {
    return this.getString('route');
  }

  static getStatusCode(): number | undefined {
    return this.getNumber('statusCode');
  }

  static getResponseTimeMs(): number | undefined {
    return this.getNumber('responseTimeMs');
  }

  static getCurrentUser(): unknown {
    return this.get('user');
  }
}
