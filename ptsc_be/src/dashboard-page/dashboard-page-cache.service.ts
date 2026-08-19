import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { CACHE_DASHBOARD } from '../variable/CONST_STATUS';

@Injectable()
export class DashboardPageCacheService {
  private readonly logger = new Logger(DashboardPageCacheService.name);

  constructor(
    @InjectQueue('dashboard-cache') private readonly dashboardQueue: Queue,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async getCachedData<T>(
    cacheKey: string,
    fetchDbFn: () => Promise<T>,
    jobName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jobData: any = {},
    softTtl = 300,
    retryCount = 0,
  ): Promise<T> {
    if (!CACHE_DASHBOARD) {
      this.logger.log(`[Cache Bypass] Key: ${cacheKey}. Fetching directly from DB.`);
      return fetchDbFn();
    }

    try {
      const cachedStr = await this.redis.get(cacheKey);

      if (!cachedStr) {
        if (retryCount >= 5) {
          this.logger.warn(`[Cache Miss Retry Limit] Key: ${cacheKey}. Falling back directly to DB.`);
          return fetchDbFn();
        }
        const lockKey = `lock:miss:${cacheKey}`;
        const isLocked = await this.redis.set(lockKey, '1', 'PX', 15000, 'NX');

        if (isLocked) {
          try {
            this.logger.log(`[Cache Miss Lock Acquired] Key: ${cacheKey}. Querying DB.`);
            const data = await fetchDbFn();
            await this.redis.set(
              cacheKey,
              JSON.stringify({
                data,
                lastRefresh: Math.floor(Date.now() / 1000),
              }),
              'EX',
              86400, // Hard TTL: 1 ngày
            );
            return data;
          } finally {
            await this.redis.del(lockKey);
          }
        } else {
          this.logger.log(`[Cache Miss Lock Busy] Key: ${cacheKey}. Waiting for owner to warm cache (retry ${retryCount + 1}).`);
          await new Promise(resolve => setTimeout(resolve, 150));
          return this.getCachedData(cacheKey, fetchDbFn, jobName, jobData, softTtl, retryCount + 1);
        }
      }

      const cached = JSON.parse(cachedStr);
      const now = Math.floor(Date.now() / 1000);
      const age = now - cached.lastRefresh;

      if (age >= softTtl) {
        this.logger.log(`[Cache Stale] Key: ${cacheKey}. Triggering background job: ${jobName}.`);
        await this.dashboardQueue.add(
          jobName,
          jobData,
          {
            jobId: `${jobName}:${cacheKey}`,
            removeOnComplete: true,
            removeOnFail: true,
          },
        ).catch(err => {
          this.logger.error(`Failed to enqueue background job ${jobName}: ${err.message}`, err.stack);
        });
      } else {
        this.logger.log(`[Cache Hit] Key: ${cacheKey}. Returning cached data.`);
      }

      return cached.data;
    } catch (error) {
      this.logger.error(`[Cache Error] Key: ${cacheKey}. Error processing cache: ${error.message}. Fallback to DB.`, error.stack);
      return fetchDbFn();
    }
  }
}
