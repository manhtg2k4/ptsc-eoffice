import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { getMssqlPool } from '../database/mssql.pool';

type CheckState = 'up' | 'down';

interface DependencyCheckResult {
  state: CheckState;
  latencyMs: number;
  error?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

@Injectable()
export class HealthCheckService {
  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redisClient?: Redis,
  ) {}

  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      env: process.env.NODE_ENV ?? 'development',
    };
  }

  async ready() {
    const [mssql, redis] = await Promise.all([
      this.checkMssql(),
      this.checkRedis(),
    ]);

    const checks = { mssql, redis };
    const isAllUp = Object.values(checks).every((c) => c.state === 'up');

    return {
      status: isAllUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks,
    };
  }

  private async checkMssql(): Promise<DependencyCheckResult> {
    const startedAt = Date.now();
    try {
      const timeoutMs = Number(this.configService.get('HEALTHCHECK_MSSQL_TIMEOUT_MS') ?? 3000);
      const pool = await withTimeout(
        getMssqlPool(this.configService),
        timeoutMs,
        'MSSQL connect timeout',
      );
      await withTimeout(pool.request().query('SELECT 1 as ok'), timeoutMs, 'MSSQL query timeout');

      return { state: 'up', latencyMs: Date.now() - startedAt };
    } catch (err: any) {
      return {
        state: 'down',
        latencyMs: Date.now() - startedAt,
        error: String(err?.message || err),
      };
    }
  }

  private async checkRedis(): Promise<DependencyCheckResult> {
    const startedAt = Date.now();
    if (!this.redisClient) {
      return { state: 'down', latencyMs: 0, error: 'REDIS_CLIENT not configured' };
    }

    try {
      const timeoutMs = Number(this.configService.get('HEALTHCHECK_REDIS_TIMEOUT_MS') ?? 1500);
      await withTimeout(this.redisClient.ping(), timeoutMs, 'Redis ping timeout');
      return { state: 'up', latencyMs: Date.now() - startedAt };
    } catch (err: any) {
      return {
        state: 'down',
        latencyMs: Date.now() - startedAt,
        error: String(err?.message || err),
      };
    }
  }
}

