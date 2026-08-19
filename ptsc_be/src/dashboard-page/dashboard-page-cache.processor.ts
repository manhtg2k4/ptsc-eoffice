import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Logger } from '@nestjs/common';
import { DashboardPagePremiumService } from './dashboard-page-premium.service';
import { DashboardPageMediumService } from './dashboard-page-medium.service';
import { DashboardPageNormalService } from './dashboard-page-normal.service';
import Redis from 'ioredis';

@Processor('dashboard-cache')
export class DashboardCacheProcessor {
  private readonly logger = new Logger(DashboardCacheProcessor.name);

  constructor(
    private readonly premiumService: DashboardPagePremiumService,
    private readonly mediumService: DashboardPageMediumService,
    private readonly normalService: DashboardPageNormalService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @Process('refresh-premium-notifications-text')
  async handleRefresh(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    const lockKey = `lock:dash:premium:notificationsText:${userId}`;
    const cacheKey = `dash:premium:notificationsText:${userId}`;

    // Acquire lock (expires in 30 seconds to prevent deadlocks)
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for user ${userId}, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium notifications text cache for user: ${userId}`);
      const data = await this.premiumService.getPremiumNotificationTextFromDb(userId);
      
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400, // Hard TTL: 1 ngày
      );
      this.logger.log(`Successfully refreshed cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error refreshing cache for user ${userId}: ${error.message}`, error.stack);
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-stats')
  async handleRefreshStats(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    const lockKey = `lock:dash:premium:stats:${userId}`;
    const cacheKey = `dash:premium:stats:${userId}`;

    // Acquire lock (expires in 30 seconds to prevent deadlocks)
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for user ${userId} stats, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium stats cache for user: ${userId}`);
      const data = await this.premiumService.getStatsPremiumFromDb(userId);
      
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400, // Hard TTL: 1 ngày
      );
      this.logger.log(`Successfully refreshed stats cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error refreshing stats cache for user ${userId}: ${error.message}`, error.stack);
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-department-performance')
  async handleRefreshDeptPerf(job: Job) {
    const lockKey = `lock:dash:premium:departmentPerformance`;
    const cacheKey = `dash:premium:departmentPerformance`;

    // Acquire lock (expires in 30 seconds to prevent deadlocks)
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for departmentPerformance, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium department performance cache`);
      const data = await this.premiumService.getDepartmentPerformanceFromDb();
      
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400, // Hard TTL: 1 ngày
      );
      this.logger.log(`Successfully refreshed department performance cache`);
    } catch (error) {
      this.logger.error(`Error refreshing department performance cache: ${error.message}`, error.stack);
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-workload-projects')
  async handleRefreshWorkloadProjects(job: Job) {
    const lockKey = `lock:dash:premium:workloadProjects`;
    const cacheKey = `dash:premium:workloadProjects`;

    // Acquire lock (expires in 30 seconds to prevent deadlocks)
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for workloadProjects, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium workload projects cache`);
      const data = await this.premiumService.getWorkloadProjectsFromDb();
      
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400, // Hard TTL: 1 ngày
      );
      this.logger.log(`Successfully refreshed workload projects cache`);
    } catch (error) {
      this.logger.error(`Error refreshing workload projects cache: ${error.message}`, error.stack);
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-ceo-approvals')
  async handleRefreshCeoApprovals(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    const lockKey = `lock:dash:premium:ceoApprovals:${userId}`;
    const cacheKey = `dash:premium:ceoApprovals:${userId}`;

    // Acquire lock (expires in 30 seconds to prevent deadlocks)
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for ceoApprovals user ${userId}, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium CEO approvals cache for user: ${userId}`);
      const data = await this.premiumService.getCeoApprovalsFromDb(userId);
      
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400, // Hard TTL: 1 ngày
      );
      this.logger.log(`Successfully refreshed CEO approvals cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error refreshing CEO approvals cache for user ${userId}: ${error.message}`, error.stack);
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-documents')
  async handleRefreshDocuments(job: Job) {
    const lockKey = `lock:dash:premium:documents`;
    const cacheKey = `dash:premium:documents`;

    // Acquire lock (expires in 30 seconds to prevent deadlocks)
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for documents, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium documents cache`);
      const data = await this.premiumService.getPremiumDocumentsFromDb();
      
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400, // Hard TTL: 1 ngày
      );
      this.logger.log(`Successfully refreshed documents cache`);
    } catch (error) {
      this.logger.error(`Error refreshing documents cache: ${error.message}`, error.stack);
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-department-tasks')
  async handleRefreshDeptTasks(job: Job) {
    const lockKey = `lock:dash:premium:departmentTasks`;
    const cacheKey = `dash:premium:departmentTasks`;

    // Acquire lock (expires in 30 seconds to prevent deadlocks)
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for departmentTasks, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium department tasks cache`);
      const data = await this.premiumService.getPremiumDepartmentTasksFromDb();
      
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400, // Hard TTL: 1 ngày
      );
      this.logger.log(`Successfully refreshed department tasks cache`);
    } catch (error) {
      this.logger.error(`Error refreshing department tasks cache: ${error.message}`, error.stack);
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-utilities')
  async handleRefreshUtilities(job: Job) {
    const lockKey = `lock:dash:premium:utilities`;
    const cacheKey = `dash:premium:utilities`;

    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for utilities, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium utilities cache`);
      const data = await this.premiumService.getPremiumUtilitiesFromDb();
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400,
      );
      this.logger.log(`Successfully refreshed utilities cache`);
    } catch (error) {
      this.logger.error(`Error refreshing utilities cache: ${error.message}`, error.stack);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-hr-stats')
  async handleRefreshHRStats(job: Job) {
    const lockKey = `lock:dash:premium:hrStats`;
    const cacheKey = `dash:premium:hrStats`;

    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for hrStats, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium hr stats cache`);
      const data = await this.premiumService.getPremiumHRStatsFromDb();
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400,
      );
      this.logger.log(`Successfully refreshed hr stats cache`);
    } catch (error) {
      this.logger.error(`Error refreshing hr stats cache: ${error.message}`, error.stack);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-meetings')
  async handleRefreshMeetings(job: Job<{ userId: string; limit?: number }>) {
    const { userId, limit } = job.data;
    const lockKey = `lock:dash:premium:meetings:${userId}`;
    const cacheKey = `dash:premium:meetings:${userId}`;

    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for meetings user ${userId}, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium meetings cache for user: ${userId}`);
      const data = await this.premiumService.getPremiumMeetingsFromDb(userId, limit ?? 5);
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400,
      );
      this.logger.log(`Successfully refreshed meetings cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error refreshing meetings cache for user ${userId}: ${error.message}`, error.stack);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-news')
  async handleRefreshNews(job: Job) {
    const lockKey = `lock:dash:premium:news`;
    const cacheKey = `dash:premium:news`;

    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for news, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium news cache`);
      const data = await this.premiumService.getPremiumNewsFromDb();
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400,
      );
      this.logger.log(`Successfully refreshed news cache`);
    } catch (error) {
      this.logger.error(`Error refreshing news cache: ${error.message}`, error.stack);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-premium-events')
  async handleRefreshEvents(job: Job) {
    const lockKey = `lock:dash:premium:events`;
    const cacheKey = `dash:premium:events`;

    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for events, skip refresh`);
      return;
    }

    try {
      this.logger.log(`Refreshing premium events cache`);
      const data = await this.premiumService.getPremiumEventsFromDb();
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          data,
          lastRefresh: Math.floor(Date.now() / 1000),
        }),
        'EX',
        86400,
      );
      this.logger.log(`Successfully refreshed events cache`);
    } catch (error) {
      this.logger.error(`Error refreshing events cache: ${error.message}`, error.stack);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // =========================================================
  // MEDIUM DASHBOARD — Background refresh handlers
  // =========================================================

  private async refreshMediumCache(
    lockKey: string,
    cacheKey: string,
    fetchFn: () => Promise<unknown>,
    logLabel: string,
  ) {
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for ${logLabel}, skip refresh`);
      return;
    }
    try {
      this.logger.log(`[BG Refresh] ${logLabel}`);
      const data = await fetchFn();
      await this.redis.set(
        cacheKey,
        JSON.stringify({ data, lastRefresh: Math.floor(Date.now() / 1000) }),
        'EX',
        86400,
      );
      this.logger.log(`[BG Refresh Done] ${logLabel}`);
    } catch (error) {
      this.logger.error(`[BG Refresh Error] ${logLabel}: ${error.message}`, error.stack);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-medium-stats')
  async handleRefreshMediumStats(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:stats:${userId}`,
      `dash:medium:stats:${userId}`,
      () => this.mediumService.getStatsMediumFromDb(userId),
      `medium stats [${userId}]`,
    );
  }

  @Process('refresh-medium-alerts')
  async handleRefreshMediumAlerts(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:alerts:${userId}`,
      `dash:medium:alerts:${userId}`,
      () => this.mediumService.getMediumAlertsFromDb(userId),
      `medium alerts [${userId}]`,
    );
  }

  @Process('refresh-medium-employee-status')
  async handleRefreshMediumEmployeeStatus(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:employeeStatus:${userId}`,
      `dash:medium:employeeStatus:${userId}`,
      () => this.mediumService.getMediumEmployeeStatusFromDb(userId),
      `medium employeeStatus [${userId}]`,
    );
  }

  @Process('refresh-medium-approvals')
  async handleRefreshMediumApprovals(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:approvals:${userId}`,
      `dash:medium:approvals:${userId}`,
      () => this.mediumService.getMediumApprovalsOverviewFromDb(userId),
      `medium approvals [${userId}]`,
    );
  }

  @Process('refresh-medium-documents')
  async handleRefreshMediumDocuments(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:documents:${userId}`,
      `dash:medium:documents:${userId}`,
      () => this.mediumService.getMediumDocumentsFromDb(userId),
      `medium documents [${userId}]`,
    );
  }

  @Process('refresh-medium-heatmap')
  async handleRefreshMediumHeatmap(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:heatmap:${userId}`,
      `dash:medium:heatmap:${userId}`,
      () => this.mediumService.getMediumHeatmapFromDb(userId),
      `medium heatmap [${userId}]`,
    );
  }

  @Process('refresh-medium-projects')
  async handleRefreshMediumProjects(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:projects:${userId}`,
      `dash:medium:projects:${userId}`,
      () => this.mediumService.getMediumProjectsFromDb(userId),
      `medium projects [${userId}]`,
    );
  }

  @Process('refresh-medium-meetings')
  async handleRefreshMediumMeetings(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:meetings:${userId}`,
      `dash:medium:meetings:${userId}`,
      () => this.mediumService.getMediumMeetingsFromDb(userId),
      `medium meetings [${userId}]`,
    );
  }

  @Process('refresh-medium-upcoming-events')
  async handleRefreshMediumUpcomingEvents() {
    await this.refreshMediumCache(
      'lock:dash:medium:upcomingEvents',
      'dash:medium:upcomingEvents',
      () => this.mediumService.getMediumUpcomingEventsFromDb(),
      'medium upcomingEvents',
    );
  }

  @Process('refresh-medium-utility-requests')
  async handleRefreshMediumUtilityRequests(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshMediumCache(
      `lock:dash:medium:utilityRequests:${userId}`,
      `dash:medium:utilityRequests:${userId}`,
      () => this.mediumService.getMediumUtilityRequestsFromDb(userId),
      `medium utilityRequests [${userId}]`,
    );
  }

  @Process('refresh-medium-news')
  async handleRefreshMediumNews() {
    await this.refreshMediumCache(
      'lock:dash:medium:news',
      'dash:medium:news',
      () => this.mediumService.getMediumNewsFromDb(),
      'medium news',
    );
  }

  // =========================================================
  // NORMAL DASHBOARD — Background refresh handlers
  // =========================================================

  private async refreshNormalCache(
    lockKey: string,
    cacheKey: string,
    fetchFn: () => Promise<unknown>,
    logLabel: string,
  ) {
    const lock = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX');
    if (!lock) {
      this.logger.debug(`Lock already acquired for ${logLabel}, skip refresh`);
      return;
    }
    try {
      this.logger.log(`[BG Refresh] ${logLabel}`);
      const data = await fetchFn();
      await this.redis.set(
        cacheKey,
        JSON.stringify({ data, lastRefresh: Math.floor(Date.now() / 1000) }),
        'EX',
        86400,
      );
      this.logger.log(`[BG Refresh Done] ${logLabel}`);
    } catch (error) {
      this.logger.error(`[BG Refresh Error] ${logLabel}: ${error.message}`, error.stack);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  @Process('refresh-normal-stats')
  async handleRefreshNormalStats(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshNormalCache(
      `lock:dash:normal:stats:${userId}`,
      `dash:normal:stats:${userId}`,
      () => this.normalService.getStatsNormalFromDb(userId),
      `normal stats [${userId}]`,
    );
  }

  @Process('refresh-normal-task-overview')
  async handleRefreshNormalTaskOverview(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshNormalCache(
      `lock:dash:normal:taskOverview:${userId}`,
      `dash:normal:taskOverview:${userId}`,
      () => this.normalService.getNormalTaskOverviewFromDb(userId),
      `normal taskOverview [${userId}]`,
    );
  }

  @Process('refresh-normal-projects')
  async handleRefreshNormalProjects(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshNormalCache(
      `lock:dash:normal:projects:${userId}`,
      `dash:normal:projects:${userId}`,
      () => this.normalService.getNormalProjectsFromDb(userId),
      `normal projects [${userId}]`,
    );
  }

  @Process('refresh-normal-quick-actions')
  async handleRefreshNormalQuickActions(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshNormalCache(
      `lock:dash:normal:quickActions:${userId}`,
      `dash:normal:quickActions:${userId}`,
      () => this.normalService.getNormalQuickActionsFromDb(userId),
      `normal quickActions [${userId}]`,
    );
  }

  @Process('refresh-normal-meetings')
  async handleRefreshNormalMeetings(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    await this.refreshNormalCache(
      `lock:dash:normal:meetings:${userId}`,
      `dash:normal:meetings:${userId}`,
      () => this.normalService.getNormalMeetingsFromDb(userId),
      `normal meetings [${userId}]`,
    );
  }

  @Process('refresh-normal-events')
  async handleRefreshNormalEvents() {
    await this.refreshNormalCache(
      'lock:dash:normal:events',
      'dash:normal:events',
      () => this.normalService.getNormalEventsFromDb(),
      'normal events',
    );
  }

  @Process('refresh-normal-news')
  async handleRefreshNormalNews() {
    await this.refreshNormalCache(
      'lock:dash:normal:news',
      'dash:normal:news',
      () => this.normalService.getNormalNewsFromDb(),
      'normal news',
    );
  }
}







