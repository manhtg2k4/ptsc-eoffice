// src/database/query-executor.ts
import { Injectable, Logger } from '@nestjs/common';
import * as sql from 'mssql';
import { getMssqlPool } from './mssql.pool';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueryExecutor {
  private readonly logger = new Logger('QueryExecutor');

  constructor(private configService: ConfigService) {}

  async executeWithRetry<T>(
    queryFn: (pool: sql.ConnectionPool) => Promise<T>,
    operationName: string = 'Query',
    maxRetries: number = 3,
  ): Promise<T> {
    let lastError: Error | undefined = undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const pool = await getMssqlPool(this.configService);
        const result = await queryFn(pool);
        
        if (attempt > 1) {
          this.logger.log(`[${operationName}] ✓ Success on attempt ${attempt}`);
        }
        return result;
      } catch (error: any) {
        lastError = error;
        
        const isFailoverError = this.isFailoverError(error);
        
        this.logger.warn(
          `[${operationName}] ✗ Attempt ${attempt}/${maxRetries} failed: ${error.message}` +
          (isFailoverError ? ' (FAILOVER ERROR)' : ''),
        );

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          this.logger.warn(`[${operationName}] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `[${operationName}] ✗ Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    );
    throw lastError || new Error(`[${operationName}] Failed after ${maxRetries} attempts`);
  }

  private isFailoverError(error: any): boolean {
    const failoverErrors = [
      'ETIMEOUT',
      'ECONNREFUSED',
      'ECONNRESET',
      'timeout',
      'Connection lost',
      'Connection closed',
      'Connection refused',
    ];

    return failoverErrors.some(errMsg =>
      error.message?.toLowerCase().includes(errMsg.toLowerCase()),
    );
  }
}