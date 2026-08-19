import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import axios from 'axios';
import * as https from 'https';
import Redis from 'ioredis';
import { AuthKeycloakService } from 'src/auth-keycloak/auth-keycloak.service';
import { CronJob } from 'cron';
import { ReplaySubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity, RolesByProcess, RoleItem } from 'src/users/entities/user.entity';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { KeycloakGroupMappingEntity } from './entities/keycloak-group-mapping.entity';

export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
}

export interface SyncProgress {
  stage: 'starting' | 'fetching' | 'processing' | 'completed' | 'error';
  message: string;
  current: number;
  total: number;
  percentage: number;
  currentUser?: string;
  runId?: string;
  heartbeat?: boolean;
  instanceId?: string;
  emittedAt?: string;
  direction?: 'from-keycloak' | 'to-keycloak';
  result?: {
    total: number;
    created: number;
    updated: number;
    skipped?: number;
    failed: number;
  };
}

@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);
  private readonly instanceId = process.env.HOSTNAME || process.env.POD_NAME || process.env.HOSTNAME || `pid-${process.pid}`;
  private readonly progressTtlSeconds = Number(process.env.USER_SYNC_PROGRESS_TTL_SECONDS || 3600);
  private readonly lockTtlSeconds = Number(process.env.USER_SYNC_LOCK_TTL_SECONDS || 21600);
  private readonly keycloakRequestRetries = Number(process.env.KEYCLOAK_SYNC_RETRIES || 5);
  private readonly keycloakRequestRetryDelayMs = Number(process.env.KEYCLOAK_SYNC_RETRY_DELAY_MS || 2000);
  private readonly keycloakSyncFetchBatchSize = Number(process.env.KEYCLOAK_SYNC_BATCH_SIZE || 500);
  private activeRunId: string | null = null;

  private readonly specialUsersForReset: string[] = [
  // 'bithudanguy',
  // 'tonggiamdoc',
  // 'phogiamdoctc',
  // 'chanhvptct02',
  // 'chanhvptct01',
  // 'phochanhvanphong01',
  // 'phochanhvanphong02',
  // 'vanthutc01',
  // 'banquanlyphonghop01',
  // 'truongphong01',
  // 'photruongphong01',
  // 'canbo01',
  // 'vanthuPB01',
  // 'truongphong03',
  // 'photruongphong03',
  // 'canboPB03',
  // 'canboPB04',
  // 'vanthutccntt',
  // 'photruongphongpcntt',
  // 'vanthutcmkt',
  // 'truongphongpmkt',
  // 'canbomkt',
  // 'canbopmkt',
  // 'truongphongpmkt',
  // 'doitruongDX',
  // 'doiphoDX',
  // 'taixe01',
  // 'taixe02',
  // 'taixe03',
  // 'taixe04',
  // 'taixe05',
  // 'taixe06',
  // 'taixe07',
  // 'taixe08',
  // 'taixe09',
  // 'taixe10',
  // 'chihuyVP',
  // 'nguoixuly01',
  // 'nguoixuly02',
  // 'nguoixuly03',
  // 'nguoixuly04',
  // 'nguoixuly05',
  // 'nguoixuly06'
];


  private readonly syncIntervalSeconds = parseInt(process.env.USER_SYNC_INTERVAL_SECONDS || '300', 10);

  private accessToken: string = '';
  private tokenExpiry: number = 0;
  private tokenRequestPromise: Promise<string> | null = null;

  // Cờ trạng thái đồng bộ
  private isSyncing: boolean = false;
  private shouldStopSync: boolean = false;
  
  // Agent duy trì kết nối để tránh lỗi socket hang up khi xử lý hàng loạt
  private readonly httpsAgent = new https.Agent({ 
    keepAlive: true, 
    keepAliveMsecs: 1000,
    rejectUnauthorized: false 
  });

  // --- PING MONITOR: Theo dõi kết nối Keycloak liên tục ---
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pingCount = 0;

  /**
   * Bắt đầu ping liên tục đến Keycloak mỗi 5 giây để giám sát kết nối.
   * Gọi hàm này TRƯỚC khi bắt đầu quá trình đồng bộ.
   */
  private startKeycloakPing(keycloakBaseUrl: string) {
    this.pingCount = 0;
    const pingUrl = `${keycloakBaseUrl}/realms/master/.well-known/openid-configuration`;

    this.pingInterval = setInterval(async () => {
      this.pingCount++;
      const startTime = Date.now();
      try {
        const res = await axios.get(pingUrl, {
          httpsAgent: this.httpsAgent,
          timeout: 10000, // timeout 10s cho ping
        });
        const elapsed = Date.now() - startTime;
      } catch (err) {
        const elapsed = Date.now() - startTime;
        this.logger.error(`🏓 [PING #${this.pingCount}] ❌ Keycloak KHÔNG PHẢN HỒI - ${elapsed}ms - Lỗi: ${err.message}`);
      }
    }, 5000);
  }

  /**
   * Dừng ping Keycloak. Gọi hàm này SAU khi quá trình đồng bộ hoàn tất hoặc lỗi.
   */
  private stopKeycloakPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Hủy quá trình đồng bộ đang diễn ra.
   */
  public async cancelSync(runId?: string) {
    this.shouldStopSync = true;
    const cancelledRunId = await this.setCancelFlag(runId);
    if (!cancelledRunId) {
      this.logger.warn('[Sync] Cancel requested but no active sync lock was found.');
      return null;
    }

    this.logger.warn(`[Sync] Cancel requested runId=${cancelledRunId} instance=${this.instanceId}`);
    this.emitProgress({
      stage: 'error',
      message: 'Da nhan yeu cau huy dong bo. Tien trinh se dung sau khi lo hien tai hoan tat.',
      current: 0,
      total: 0,
      percentage: 0,
    }, cancelledRunId);
    return cancelledRunId;
  }

  public progressSubject = new ReplaySubject<SyncProgress>(100);

  public normalizeRunId(runId?: string): string {
    const cleaned = String(runId || '')
      .trim()
      .replace(/[^a-zA-Z0-9._:-]/g, '')
      .slice(0, 120);
    return cleaned || 'global';
  }

  private progressChannel(runId: string): string {
    return `user-sync:progress:${this.normalizeRunId(runId)}`;
  }

  private progressLastKey(runId: string): string {
    return `user-sync:progress:last:${this.normalizeRunId(runId)}`;
  }

  private cancelKey(runId: string): string {
    return `user-sync:cancel:${this.normalizeRunId(runId)}`;
  }

  private lockKey(): string {
    return 'user-sync:lock';
  }

  private async acquireSyncLock(runId: string, direction: 'from-keycloak' | 'to-keycloak'): Promise<boolean> {
    const payload = JSON.stringify({
      runId: this.normalizeRunId(runId),
      direction,
      instanceId: this.instanceId,
      startedAt: new Date().toISOString(),
    });
    const result = await this.redis.set(this.lockKey(), payload, 'EX', this.lockTtlSeconds, 'NX');
    return result === 'OK';
  }

  private async releaseSyncLock(runId: string): Promise<void> {
    const normalizedRunId = this.normalizeRunId(runId);
    const current = await this.redis.get(this.lockKey());
    if (!current) return;

    try {
      const parsed = JSON.parse(current);
      if (parsed?.runId === normalizedRunId) {
        await this.redis.del(this.lockKey());
      }
    } catch (err) {
      this.logger.warn(`[Sync] Cannot parse lock payload while releasing runId=${normalizedRunId}: ${err.message}`);
    }
  }

  public async getCurrentSyncLock(): Promise<any | null> {
    const current = await this.redis.get(this.lockKey());
    if (!current) return null;
    try {
      return JSON.parse(current);
    } catch {
      return { raw: current };
    }
  }

  private async setCancelFlag(runId?: string): Promise<string | null> {
    let rawRunId = runId || '';
    if (!rawRunId) {
      const lock = await this.getCurrentSyncLock();
      rawRunId = lock?.runId || this.activeRunId || '';
    }
    if (!rawRunId) {
      return null;
    }
    const normalizedRunId = this.normalizeRunId(rawRunId);
    await this.redis.set(this.cancelKey(normalizedRunId), '1', 'EX', this.lockTtlSeconds);
    return normalizedRunId;
  }

  private async isCancelRequested(runId?: string): Promise<boolean> {
    if (this.shouldStopSync) return true;
    const normalizedRunId = this.normalizeRunId(runId || this.activeRunId || 'global');
    return (await this.redis.get(this.cancelKey(normalizedRunId))) === '1';
  }

  private async clearCancelFlag(runId: string): Promise<void> {
    await this.redis.del(this.cancelKey(runId));
  }

  private async publishProgress(progress: SyncProgress, runId: string): Promise<void> {
    const payload = JSON.stringify(progress);
    await this.redis.set(this.progressLastKey(runId), payload, 'EX', this.progressTtlSeconds);
    await this.redis.publish(this.progressChannel(runId), payload);
  }

  public async subscribeProgress(runId: string, onProgress: (progress: SyncProgress) => void): Promise<() => void> {
    const normalizedRunId = this.normalizeRunId(runId);
    const channel = this.progressChannel(normalizedRunId);
    const subscriber = this.redis.duplicate();
    let closed = false;

    const lastProgress = await this.redis.get(this.progressLastKey(normalizedRunId));
    if (lastProgress) {
      try {
        onProgress(JSON.parse(lastProgress));
      } catch (err) {
        this.logger.warn(`[UserSyncProgress] Cannot parse last progress runId=${normalizedRunId}: ${err.message}`);
      }
    }

    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel !== channel) return;
      try {
        onProgress(JSON.parse(message));
      } catch (err) {
        this.logger.warn(`[UserSyncProgress] Cannot parse Redis message runId=${normalizedRunId}: ${err.message}`);
      }
    });
    subscriber.on('error', (err) => {
      this.logger.error(`[UserSyncProgress] Redis subscriber error runId=${normalizedRunId}: ${err.message}`, err.stack);
    });

    await subscriber.subscribe(channel);
    this.logger.log(`[UserSyncProgress] subscribed channel=${channel} instance=${this.instanceId}`);

    return () => {
      if (closed) return;
      closed = true;
      subscriber.unsubscribe(channel).catch(() => undefined);
      subscriber.quit().catch(() => undefined);
    };
  }

  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection') // nếu dùng named connection
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(AuthConfigEntity, 'mssqlConnection')
    private readonly authConfigRepository: Repository<AuthConfigEntity>,

    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,

    @InjectRepository(KeycloakGroupMappingEntity, 'mssqlConnection')
    private readonly keycloakGroupMappingRepository: Repository<KeycloakGroupMappingEntity>,

    private readonly authKeycloakService: AuthKeycloakService,
    private schedulerRegistry: SchedulerRegistry,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    // this.setupDynamicCronJob(); // bật nếu muốn auto sync
  }

  private setupDynamicCronJob() {
    let cronExpression: string;
    if (this.syncIntervalSeconds < 60) {
      cronExpression = `*/${this.syncIntervalSeconds} * * * * *`;
    } else {
      const minutes = Math.floor(this.syncIntervalSeconds / 60);
      cronExpression = `0 */${minutes} * * * *`;
    }

    const job = new CronJob(cronExpression, async () => {
      await this.autoSyncFromKeycloak();
    });

    this.schedulerRegistry.addCronJob('user-sync-keycloak-to-mssql', job);
    job.start();
  }

  private async getAdminToken(): Promise<string> {
    // 1. Nếu đã có token và chưa hết hạn, dùng luôn
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // 2. Nếu đang có một tiến trình lấy token khác đang chạy, đợi tiến trình đó
    if (this.tokenRequestPromise) {
      return this.tokenRequestPromise;
    }

    // 3. Bắt đầu lấy token mới
    this.tokenRequestPromise = (async () => {
      try {
        const authConfig = await this.authConfigRepository.findOne({
          where: { authType: 'keycloak', isActive: true },
        });

        const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);
        if (!config.issuer && !config.baseUrl) {
          throw new HttpException('Chưa cấu hình Keycloak hợp lệ.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const tokenUrl = config.issuer
          ? `${config.issuer}/protocol/openid-connect/token`
          : `${config.baseUrl}/realms/master/protocol/openid-connect/token`;


        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', config.clientId);
        params.append('client_secret', config.clientSecret);
        if (config.scope) params.append('scope', config.scope);

        const response = await this.requestWithRetry({
          method: 'post',
          url: tokenUrl,
          data: params,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in - 30) * 1000;

        return this.accessToken;
      } catch (err) {
        this.logger.error(`❌ getAdminToken failed: ${err.message}`);
        if (err.response?.data) {
          this.logger.error(`❌ Phản hồi từ Keycloak: ${JSON.stringify(err.response.data)}`);
        }
        throw err;
      } finally {
        // Luôn giải phóng promise để các lần sau có thể lấy lại nếu token hết hạn
        this.tokenRequestPromise = null;
      }
    })();

    return this.tokenRequestPromise;
  }

  /**
   * Hàm bổ trợ thực hiện request axios với cơ chế thử lại (Retry) cho các lỗi mạng
   */
  private async requestWithRetry<T>(
    config: any,
    retries = this.keycloakRequestRetries,
    delay = this.keycloakRequestRetryDelayMs
  ): Promise<any> {
    const requestConfig = { ...config, headers: { ...(config.headers || {}) } };
    const method = String(requestConfig.method || 'get').toUpperCase();
    const requestUrl = requestConfig.url || '';
    let refreshedAdminToken = false;

    for (let i = 0; i < retries; i++) {
      const attempt = i + 1;
      try {
        return await axios({
          ...requestConfig,
          httpsAgent: this.httpsAgent,
          timeout: requestConfig.timeout || 120000,
        });
      } catch (err) {
        const status = err.response?.status || err.status;
        const code = err.code || '';
        const message = err.message || 'Unknown error';
        const hasBearerToken = typeof requestConfig.headers?.Authorization === 'string'
          && requestConfig.headers.Authorization.startsWith('Bearer ');

        if ((status === 401 || status === 403) && hasBearerToken && !refreshedAdminToken) {
          this.logger.warn(`[KeycloakRequest] Auth retry ${method} ${requestUrl} status=${status} attempt=${attempt}/${retries}`);
          this.accessToken = '';
          this.tokenExpiry = 0;
          this.tokenRequestPromise = null;
          const newToken = await this.getAdminToken();
          requestConfig.headers.Authorization = `Bearer ${newToken}`;
          refreshedAdminToken = true;
          continue;
        }

        const isNetworkError = !err.response ||
                               code === 'ECONNRESET' ||
                               code === 'ETIMEDOUT' ||
                               code === 'ECONNABORTED' ||
                               code === 'EAI_AGAIN' ||
                               message.includes('socket hang up') ||
                               status >= 500;

        if (isNetworkError && i < retries - 1) {
          const waitMs = delay * attempt;
          this.logger.warn(`[KeycloakRequest] Network retry ${attempt}/${retries} ${method} ${requestUrl} status=${status || ''} code=${code} message=${message} waitMs=${waitMs}`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }

        this.logger.error(`[KeycloakRequest] Failed ${method} ${requestUrl} status=${status || ''} code=${code} attempt=${attempt}/${retries} message=${message}`);
        throw err;
      }
    }
  }
  /**
   * Lấy danh sách người dùng từ Keycloak theo từng trang (Pagination)
   * @param first Vị trí bắt đầu lấy (index)
   * @param max Số lượng tối đa lấy trong một trang
   */
  async getUsersFromKeycloak(first = 0, max = 100): Promise<KeycloakUser[]> {
    const token = await this.getAdminToken();
    const authConfig = await this.authConfigRepository.findOne({
      where: { authType: 'keycloak', isActive: true },
    });
    const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);

    if (!config.issuer) {
      throw new HttpException('Chưa cấu hình Keycloak issuer.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const realm = config.issuer.split('/').pop();
    // URL API Keycloak lấy user kèm tham số phân trang first/max và lọc user đang active (enabled=true)
    const url = `${config.baseUrl}/admin/realms/${realm}/users?first=${first}&max=${max}&enabled=true`;
    const stringUrl = this.appendKeycloakSearchFilters(url);

    const response = await this.requestWithRetry({
      method: 'get',
      url: stringUrl,
      headers: { Authorization: `Bearer ${token}` },
    });
    

    return response.data;
  }

  // Retry and split unstable Keycloak pages instead of failing the whole sync.
  private isRetryableKeycloakReadError(err: any): boolean {
    const status = err?.response?.status || err?.status;
    const code = err?.code || '';
    const message = err?.message || '';

    return !err?.response ||
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNABORTED' ||
      code === 'EAI_AGAIN' ||
      message.includes('socket hang up') ||
      status >= 500;
  }

  private async getUsersFromKeycloakAdaptive(first = 0, max = 100): Promise<KeycloakUser[]> {
    try {
      return await this.getUsersFromKeycloak(first, max);
    } catch (err) {
      if (!this.isRetryableKeycloakReadError(err) || max <= 50) {
        throw err;
      }

      const leftSize = Math.ceil(max / 2);
      const rightSize = max - leftSize;
      const message = err?.message || 'Unknown error';
      this.logger.warn(`[KeycloakSync] split page after ${message}: first=${first} max=${max} -> ${leftSize}+${rightSize}`);

      const leftUsers = await this.getUsersFromKeycloakAdaptive(first, leftSize);
      const rightUsers = rightSize > 0
        ? await this.getUsersFromKeycloakAdaptive(first + leftSize, rightSize)
        : [];

      return leftUsers.concat(rightUsers);
    }
  }

  /**
   * Lấy tổng số lượng người dùng từ Keycloak
   */
  async getUserCountFromKeycloak(): Promise<number> {
    const token = await this.getAdminToken();
    const authConfig = await this.authConfigRepository.findOne({
      where: { authType: 'keycloak', isActive: true },
    });
    const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);
    const realm = config.issuer.split('/').pop();
    const url = `${config.baseUrl}/admin/realms/${realm}/users/count?enabled=true`;
    const stringUrl = this.appendKeycloakSearchFilters(url);

    const response = await this.requestWithRetry({
      method: 'get',
      url: stringUrl,
      headers: { Authorization: `Bearer ${token}` },
    });

    const count = parseInt(response.data, 10);
    return count;
  }

  private appendKeycloakSearchFilters(url: string): string {
    const filters = process.env.KEYCLOAK_USER_SYNC_SEARCH_FILTERS;
    if (!filters) {
      return url;
    }
    if (url.includes('?')) {
      const [base, query] = url.split('?');
      return `${base}?q=${encodeURIComponent(filters.trim())}&${query}`;
    }
    return `${url}?q=${encodeURIComponent(filters.trim())}`;
  }

  /**
   * Lấy toàn bộ danh sách người dùng từ Keycloak bằng cách lặp qua các trang
   * @param batchSize Số lượng lấy mỗi lần gọi API
   * @param onProgress Callback để cập nhật tiến độ (tránh timeout SSE)
   */
  async getAllUsersFromKeycloak(batchSize = 500, onProgress?: (count: number, total: number) => void, runId?: string): Promise<KeycloakUser[]> {
    let allUsers: KeycloakUser[] = [];
    let first = 0;
    const normalizedRunId = this.normalizeRunId(runId || this.activeRunId || 'global');

    const totalCount = await this.getUserCountFromKeycloak();

    while (first < totalCount) {
      // Kiểm tra xem có yêu cầu hủy không
      if (await this.isCancelRequested(normalizedRunId)) {
        this.logger.warn(`🛑 [Sync] Dừng lấy users từ Keycloak do có yêu cầu hủy tại vị trí ${first}.`);
        break;
      }
      // Do not ask Keycloak for more than the remaining rows on the last page.
      const pageSize = Math.min(batchSize, totalCount - first);
      this.logger.log(`[KeycloakSync] fetching page first=${first} max=${pageSize} total=${totalCount}`);
      const users = await this.getUsersFromKeycloakAdaptive(first, pageSize);
      
      if (!users || users.length === 0) {
        this.logger.warn(`⚠️ [Sync] Không nhận được thêm dữ liệu từ Keycloak tại vị trí ${first} dù chưa hết totalCount.`);
        break;
      }

      allUsers = allUsers.concat(users);

      // Gửi tiến độ về callback nếu có để duy trì kết nối SSE
      if (onProgress) {
        onProgress(allUsers.length, totalCount);
      }
      first += users.length; // Advance by the number of users actually returned
      
      // Nếu chưa hết, nghỉ 200ms giữa các lần gọi
      if (first < totalCount) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return allUsers;
  }

  // createUserInKeycloak, updateUserInKeycloak, deleteUserInKeycloak, setUserPassword giữ nguyên (không thay đổi)

  async syncFromKeycloakToMongo(): Promise<{ created: number; updated: number; failed: number; total: number }> {
    // Đổi tên method cho phù hợp: syncFromKeycloakToMSSQL
    try {
      // === LOG CẤU HÌNH KEYCLOAK ===
      const authConfig = await this.authConfigRepository.findOne({
        where: { authType: 'keycloak', isActive: true },
      });
      const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);
      const realm = config.issuer ? config.issuer.split('/').pop() : 'N/A';
      const maskedSecret = config.clientSecret
        ? config.clientSecret.substring(0, 4) + '****' + config.clientSecret.substring(config.clientSecret.length - 4)
        : 'N/A';

      this.logger.log(`🔧 ===== CẤU HÌNH KEYCLOAK =====`);
      this.logger.log(`🔧 Base URL   : ${config.baseUrl || 'N/A'}`);
      this.logger.log(`🔧 Issuer     : ${config.issuer || 'N/A'}`);
      this.logger.log(`🔧 Realm      : ${realm}`);
      this.logger.log(`🔧 Client ID  : ${config.clientId || 'N/A'}`);
      this.logger.log(`🔧 Client Secret: ${maskedSecret}`);
      this.logger.log(`🔧 Scope      : ${config.scope || 'N/A'}`);
      this.logger.log(`🔧 Search Filters (ENV): ${process.env.KEYCLOAK_USER_SYNC_SEARCH_FILTERS || 'Không có'}`);
      this.logger.log(`🔧 ================================`);

      // === LOG API URL LẤY DANH SÁCH USER ===
      const usersApiUrl = `${config.baseUrl}/admin/realms/${realm}/users?first=0&max=500&enabled=true`;
      const usersApiUrlWithFilters = this.appendKeycloakSearchFilters(usersApiUrl);
      this.logger.log(`🌐 API URL lấy danh sách user Keycloak: ${usersApiUrlWithFilters}`);

      const keycloakUsers = await this.getAllUsersFromKeycloak();

      // === LOG TỔNG SỐ USER TỪ KEYCLOAK ===
      this.logger.log(`📋 Tổng số user lấy được từ Keycloak: ${keycloakUsers.length}`);

      // === LOG DANH SÁCH USER (TÊN + USERNAME) ===
      this.logger.log(`👤 ===== DANH SÁCH USER TỪ KEYCLOAK =====`);
      keycloakUsers.forEach((u, idx) => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'N/A';
        this.logger.log(
          `👤 [${idx + 1}/${keycloakUsers.length}] ` +
          `username: "${u.username}" | ` +
          `name: "${fullName}" | ` +
          `email: "${u.email || 'N/A'}" | ` +
          `keycloakId: "${u.id}" | ` +
          `enabled: ${u.enabled}`
        );
      });
      this.logger.log(`👤 ========================================`);

      let created = 0;
      let updated = 0;
      let failed = 0;

      for (const kcUser of keycloakUsers) {
        try {
          const kcUsername = (kcUser.username || '').trim();
          const existingUser = await this.userRepository.findOne({
            where: [
              { username: kcUsername },
              { keycloakUserId: kcUser.id },
            ],
          });

          const fullName = `${kcUser.firstName || ''} ${kcUser.lastName || ''}`.trim() || kcUser.username;

          if (existingUser) {
            existingUser.keycloakUserId = kcUser.id;
            existingUser.username = kcUsername;
            existingUser.emailUser = kcUser.email || existingUser.emailUser;
            existingUser.status = kcUser.enabled ? 1 : 0;

            await this.userRepository.save(existingUser);
            updated++;
            this.logger.debug(`✏️ Updated: username="${kcUsername}" | name="${existingUser.name}" | keycloakName="${fullName}" | keycloakId="${kcUser.id}"`);
          } else {
            const newUser = this.userRepository.create({
              keycloakUserId: kcUser.id,
              username: kcUsername,
              name: fullName,
              emailUser: kcUser.email,
              status: kcUser.enabled ? 1 : 0,
              password: '',
            });

            await this.userRepository.save(newUser);
            created++;
            this.logger.debug(`✅ Created: username="${kcUsername}" | name="${fullName}" | keycloakId="${kcUser.id}"`);
          }
        } catch (err) {
          failed++;
          this.logger.error(`❌ Failed to sync user ${kcUser.username}: ${err.message}`);
        }
      }

      const result = { total: keycloakUsers.length, created, updated, failed };
      this.logger.log(`📊 Kết quả đồng bộ: total=${result.total}, created=${result.created}, updated=${result.updated}, failed=${result.failed}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ syncFromKeycloakToMongo FAILED: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`❌ Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException('Sync failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Đồng bộ từ Keycloak về MSSQL kèm theo báo cáo tiến độ (Progress Subject)
   * Đã được tối ưu hóa để xử lý hàng loạt và song song, giảm thiểu hiện tượng lag hệ thống.
   */
  async syncFromKeycloakWithProgress(runId?: string): Promise<{
    created: number;
    skipped: number;
    failed: number;
    total: number;
  }> {
    const normalizedRunId = this.normalizeRunId(runId);
    const syncRunId = `from-kc-${normalizedRunId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const syncStartedAt = Date.now();
    let lockAcquired = false;

    try {
      lockAcquired = await this.acquireSyncLock(normalizedRunId, 'from-keycloak');
      if (!lockAcquired) {
        const currentLock = await this.getCurrentSyncLock();
        const message = 'Tiến trình đồng bộ đang chạy' + (currentLock?.runId ? ' (runId=' + currentLock.runId + ')' : '') + '. Vui long doi.';
        this.logger.warn(`[KeycloakSync:${syncRunId}] lock rejected current=${JSON.stringify(currentLock)} requestedRunId=${normalizedRunId}`);
        this.emitProgress({ stage: 'error', message, current: 0, total: 0, percentage: 0 }, normalizedRunId);
        throw new BadRequestException(message);
      }

      this.isSyncing = true;
      this.shouldStopSync = false;
      this.activeRunId = normalizedRunId;
      await this.clearCancelFlag(normalizedRunId);
      this.logger.log(`[KeycloakSync:${syncRunId}] start syncFromKeycloakWithProgress runId=${normalizedRunId} instance=${this.instanceId}`);

      // --- LẤY CẤU HÌNH VÀ TOKEN NGOÀI VÒNG LẶP ĐỂ TỐI ƯU ---
      const authConfig = await this.authConfigRepository.findOne({
        where: { authType: 'keycloak', isActive: true },
      });
      const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);
      
      if (!config.issuer) {
        throw new HttpException('Chưa cấu hình Keycloak issuer.', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      
      const realm = config.issuer.split('/').pop() || 'master';
      this.logger.log(`[KeycloakSync:${syncRunId}] config resolved realm=${realm} issuer=${config.issuer} baseUrl=${config.baseUrl || ''} hasActiveDbConfig=${Boolean(authConfig)}`);
      const token = await this.getAdminToken();
      this.logger.log(`[KeycloakSync:${syncRunId}] admin token resolved`);
      
      this.logger.log(`🔧 ===== CẤU HÌNH KEYCLOAK =====`);
      this.logger.log(`🔧 Base URL   : ${config.baseUrl || 'N/A'}`);
      this.logger.log(`🔧 Issuer     : ${config.issuer || 'N/A'}`);
      this.logger.log(`🔧 Realm      : ${realm}`);
      this.logger.log(`🔧 Client ID  : ${config.clientId || 'N/A'}`);
      this.logger.log(`🔧 Scope      : ${config.scope || 'N/A'}`);
      this.logger.log(`🔧 Search Filters (ENV): ${process.env.KEYCLOAK_USER_SYNC_SEARCH_FILTERS || 'Không có'}`);
      this.logger.log(`🔧 ================================`);

      this.emitProgress({ stage: 'starting', message: 'Đang khởi tạo...', current: 0, total: 0, percentage: 0 });

      // --- BẮT ĐẦU PING ĐỂ GIÁM SÁT KẾT NỐI ---
      this.startKeycloakPing(config.baseUrl);

      // --- LẤY TOÀN BỘ DANH SÁCH USER TỪ KEYCLOAK (PHÂN TRANG) ---
      this.emitProgress({ stage: 'fetching', message: 'Đang lấy toàn bộ user từ Keycloak...', current: 0, total: 0, percentage: 5 });
      this.logger.log(`[KeycloakSync:${syncRunId}] fetching users from Keycloak batchSize=${this.keycloakSyncFetchBatchSize}`);
      const keycloakUsers = await this.getAllUsersFromKeycloak(this.keycloakSyncFetchBatchSize, (count, totalCount) => {
        const percentage = totalCount > 0
          ? Math.min(9, Math.max(5, Math.round(5 + (count / totalCount) * 4)))
          : 5;
        this.logger.log(`[KeycloakSync:${syncRunId}] fetched page users=${count}/${totalCount}`);
        this.emitProgress({
          stage: 'fetching',
          message: `Đang lấy user từ Keycloak ${count}/${totalCount}`,
          current: count,
          total: totalCount,
          percentage,
        });
      }, normalizedRunId);
      const total = keycloakUsers.length;
      this.logger.log(`[KeycloakSync:${syncRunId}] fetched users total=${total}`);

      this.emitProgress({ stage: 'processing', message: `Tìm thấy ${total} users. Bắt đầu xử lý...`, current: 0, total, percentage: 10 });

      // --- LẤY DANH SÁCH MAPPING QUYỀN TRƯỚC VÒNG LẶP ĐỂ TỐI ƯU ---
      const allRoleMappings = await this.keycloakGroupMappingRepository.find();
      let created = 0;
      let skipped = 0;
      let failed = 0;

      // --- CHIA DANH SÁCH THÀNH CÁC LÔ (BATCH) ĐỂ XỬ LÝ SONG SONG ---
      const batchSize = 10;
      for (let i = 0; i < keycloakUsers.length; i += batchSize) {
        // Kiểm tra yêu cầu hủy
        if (await this.isCancelRequested(normalizedRunId)) {
          this.logger.warn(`🛑 [Sync] Dừng xử lý người dùng do có yêu cầu hủy tại lô thứ ${Math.floor(i / batchSize) + 1}.`);
          break;
        }

        const batch = keycloakUsers.slice(i, i + batchSize);
        const batchNo = Math.floor(i / batchSize) + 1;
        const batchStart = Date.now();
        this.logger.log(`[KeycloakSync:${syncRunId}] batch ${batchNo} start index=${i} size=${batch.length} first=${batch[0]?.username || ''} last=${batch[batch.length - 1]?.username || ''}`);

        // Chạy song song các user trong cùng một lô (Sử dụng Promise.all)
        await Promise.all(batch.map(async (kcUser, index) => {
          const currentIndex = i + index;
          try {
            // --- GỌI API LẤY CHI TIẾT GROUPS VÀ ROLE MAPPINGS (ĐỂ LOG THEO YÊU CẦU) ---
            const groupsUrl = `${config.baseUrl}/admin/realms/${realm}/users/${kcUser.id}/groups`;
            const rolesUrl = `${config.baseUrl}/admin/realms/${realm}/users/${kcUser.id}/role-mappings`;

            // Gọi song song các API chi tiết của từng user để tiết kiệm thời gian
            const [groupsRes, rolesRes] = await Promise.all([
              this.requestWithRetry({
                method: 'get',
                url: groupsUrl,
                headers: { Authorization: `Bearer ${token}` },
              }).catch(e => ({ data: [], error: e })),
              this.requestWithRetry({
                method: 'get',
                url: rolesUrl,
                headers: { Authorization: `Bearer ${token}` },
              }).catch(e => ({ data: {}, error: e }))
            ]);

            if ((groupsRes as any).error || (rolesRes as any).error) {
              this.logger.warn(`[KeycloakSync:${syncRunId}] detail fetch warning user=${kcUser.username} keycloakId=${kcUser.id} groupsError=${(groupsRes as any).error?.message || ''} rolesError=${(rolesRes as any).error?.message || ''}`);
            }

            // Trích xuất thông tin Groups
            const userGroups = Array.isArray(groupsRes.data) ? groupsRes.data.map((g: any) => g.name) : [];

            // Trích xuất thông tin Roles (Realm roles và Client roles)
            const roleMappings = rolesRes.data || {};
            const resourceAccess: any = {};

            // Log cấu trúc roles để debug (chỉ log user đầu tiên hoặc nếu cần thiết)

            if (Array.isArray(roleMappings.realmMappings)) {
              resourceAccess['realm-roles'] = roleMappings.realmMappings.map((m: any) => m.name);
            }
            if (roleMappings.clientMappings) {
              Object.keys(roleMappings.clientMappings).forEach((clientId) => {
                const clientObj = roleMappings.clientMappings[clientId];
                resourceAccess[clientObj.client || clientId] = {
                  roles: Array.isArray(clientObj.mappings) ? clientObj.mappings.map((m: any) => m.name) : [],
                };
              });
            }

            // --- LOG THÔNG TIN QUYỀN (GROUPS & ROLES) ---

            // --- KIỂM TRA VÀ LƯU VÀO DATABASE MSSQL ---
            const kcUsername = (kcUser.username || '').trim();
            const keycloakUserInfo = {
              keycloakId: kcUser.id,
              username: kcUsername,
              firstName: kcUser.firstName || '',
              lastName: kcUser.lastName || '',
              email: kcUser.email || '',
              enabled: Boolean(kcUser.enabled),
            };
            const existingUser = await this.userRepository.findOne({
              where: [
                { username: kcUsername },
                { keycloakUserId: kcUser.id },
              ],
            });

            if (existingUser) {
              // Cập nhật thông tin user đã tồn tại
              const fullName = `${kcUser.firstName || ''} ${kcUser.lastName || ''}`.trim() || kcUsername;
              existingUser.emailUser = kcUser.email || existingUser.emailUser;
              existingUser.status = kcUser.enabled ? 1 : 0;
              await this.userRepository.save(existingUser);
              this.logger.log(`[KeycloakSync:${syncRunId}] user updated ${JSON.stringify({ ...keycloakUserInfo, dbUserId: existingUser.id, name: existingUser.name, keycloakName: fullName })}`);
              skipped++;
            } else {
              // Tạo mới user nếu chưa tồn tại
              const fullName = `${kcUser.firstName || ''} ${kcUser.lastName || ''}`.trim() || kcUsername;
              const newUser = this.userRepository.create({
                id: uuidv4(),
                keycloakUserId: kcUser.id,
                username: kcUsername,
                name: fullName,
                emailUser: kcUser.email || null,
                status: kcUser.enabled ? 1 : 0,
                password: '',
              });
              const savedUser = await this.userRepository.save(newUser);
              this.logger.log(`[KeycloakSync:${syncRunId}] user created ${JSON.stringify({ ...keycloakUserInfo, dbUserId: savedUser.id, name: fullName })}`);
              created++;
            }

            // --- ĐỒNG BỘ NHÓM (GROUPS) ---
            const targetUser = existingUser || (await this.userRepository.findOne({ where: { keycloakUserId: kcUser.id } }));
            if (targetUser) {
              // 1. Đồng bộ theo Nhóm từ Keycloak (logic cũ: tên nhóm Keycloak = mã nhóm App)
              if (userGroups.length > 0) {
                for (const groupCode of userGroups) {
                  const group = await this.groupUserRepository.findOne({
                    where: { code: groupCode, status: 1 },
                    relations: ['users']
                  });
                  if (group) {
                    const isMember = (group.users || []).some(u => u.id === targetUser.id);
                    if (!isMember) {
                      group.users = [...(group.users || []), targetUser];
                      group.userId = group.users.map(u => u.id);
                      await this.groupUserRepository.save(group);

                      // ✅ CẬP NHẬT ROLES_BY_PROCESS CHO USER (DYNAMIC ROLES)
                      if (group.roleType === 'dynamic' && group.roles_dynamic?.length) {
                        const mapped = this.mapRolesDynamicToRolesByProcess(
                          group.roles_dynamic,
                          group.id,
                        );
                        targetUser.rolesByProcess = this.mergeRolesByProcess(
                          targetUser.rolesByProcess || [],
                          mapped,
                        );
                        await this.userRepository.save(targetUser);
                      }

                    }
                  }
                }
              }

              // 2. Đồng bộ theo Bảng Mapping Quyền (Realm Role + Client Role -> Mã nhóm App)
              for (const mapping of allRoleMappings) {
                const targetRealmRole = (mapping.realmRole || '').trim();
                const targetClientRole = (mapping.clientRole || '').trim();

                let isMatch = false;
                let hasCriteria = false;

                // Kiểm tra Realm Role (So sánh không phân biệt hoa thường)
                if (targetRealmRole) {
                  hasCriteria = true;
                  const matched = (resourceAccess['realm-roles'] || []).some(r => r.toLowerCase() === targetRealmRole.toLowerCase());
                  if (matched) isMatch = true;
                }

                // Kiểm tra Client Role (So sánh không phân biệt hoa thường) - OR logic
                if (targetClientRole) {
                  hasCriteria = true;
                  // Nếu đã khớp Realm Role rồi thì không cần check tiếp (OR)
                  if (!isMatch) {
                    const [cId, rName] = targetClientRole.includes(':') ? targetClientRole.split(':') : [null, targetClientRole];
                    if (cId) {
                      const clientRoles = resourceAccess[cId]?.roles || [];
                      if (clientRoles.some(r => r.toLowerCase() === rName.toLowerCase())) isMatch = true;
                    } else {
                      if (Object.values(resourceAccess).some((val: any) =>
                        Array.isArray(val.roles) && val.roles.some((r: any) => r.toLowerCase() === rName.toLowerCase())
                      )) isMatch = true;
                    }
                  }
                }

                if (kcUser.username === 'nguoixlpa' && hasCriteria) {
                }

                if (hasCriteria && isMatch && mapping.groupCode) {
                  const group = await this.groupUserRepository.findOne({
                    where: { code: mapping.groupCode, status: 1 },
                    relations: ['users']
                  });
                  if (group) {
                    const isMember = (group.users || []).some(u => u.id === targetUser.id);
                    if (!isMember) {
                      group.users = [...(group.users || []), targetUser];
                      group.userId = group.users.map(u => u.id);
                      await this.groupUserRepository.save(group);

                      // ✅ CẬP NHẬT ROLES_BY_PROCESS CHO USER (DYNAMIC ROLES)
                      if (group.roleType === 'dynamic' && group.roles_dynamic?.length) {
                        const mapped = this.mapRolesDynamicToRolesByProcess(
                          group.roles_dynamic,
                          group.id,
                        );
                        targetUser.rolesByProcess = this.mergeRolesByProcess(
                          targetUser.rolesByProcess || [],
                          mapped,
                        );
                        await this.userRepository.save(targetUser);
                      }

                    } else {
                      // this.logger.debug(`    └─ 🆗 User đã thuộc nhóm ${group.name} từ trước.`);
                    }
                  } else {
                    this.logger.warn(`    └─ ⚠️ Tìm thấy Mapping cho "${targetRealmRole || '*'}"/"${targetClientRole || '*'}" nhưng trong DB không có Nhóm nào có Mã (code): "${mapping.groupCode}"`);
                  }
                }
              }
            }
          } catch (err) {
            failed++;
            this.logger.error(`[KeycloakSync:${syncRunId}] user processing failed index=${currentIndex} username=${kcUser.username} keycloakId=${kcUser.id}: ${err.message}`, err.stack);
          }
        }));

        // Gửi tiến độ (emit progress) sau khi xử lý xong mỗi lô
        this.logger.log(`[KeycloakSync:${syncRunId}] batch ${batchNo} completed elapsedMs=${Date.now() - batchStart} totals created=${created} skipped=${skipped} failed=${failed}`);
        const processedSoFar = Math.min(i + batchSize, total);
        const percentage = Math.round(10 + (processedSoFar / total) * 85);
        this.emitProgress({
          stage: 'processing',
          message: `Đang xử lý ${processedSoFar}/${total}`,
          current: processedSoFar,
          total,
          percentage,
          currentUser: keycloakUsers[processedSoFar - 1]?.username
        });
      }

      const result = { total, created, updated: 0, skipped, failed };
      this.logger.log(`[KeycloakSync:${syncRunId}] completed elapsedMs=${Date.now() - syncStartedAt} result=${JSON.stringify(result)}`);
      this.emitProgress({ stage: 'completed', message: 'Hoàn thành đồng bộ!', current: total, total, percentage: 100, result });
      // --- DỪNG PING SAU KHI ĐỒNG BỘ HOÀN TẤT ---
      this.stopKeycloakPing();
      return result;
    } catch (error) {
      // --- DỪNG PING KHI CÓ LỖI ĐỂ KHÔNG BỊ RÒ RỈ INTERVAL ---
      this.stopKeycloakPing();
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`[KeycloakSync:${syncRunId}] failed elapsedMs=${Date.now() - syncStartedAt} status=${error.response?.status || ''} message=${errorMsg}`, error.stack);
      this.logger.error(`❌ Sync failed (Lỗi đồng bộ): ${errorMsg}`);
      this.emitProgress({ stage: 'error', message: errorMsg, current: 0, total: 0, percentage: 0 }, normalizedRunId);
      throw new HttpException('Sync failed', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      this.isSyncing = false;
      this.shouldStopSync = false;
      if (this.activeRunId === normalizedRunId) {
        this.activeRunId = null;
      }
      if (lockAcquired) {
        await this.releaseSyncLock(normalizedRunId);
        await this.clearCancelFlag(normalizedRunId);
      }
    }
  }

  private emitProgress(progress: SyncProgress, runId?: string) {
    const normalizedRunId = this.normalizeRunId(runId || progress.runId || this.activeRunId || 'global');
    const payload: SyncProgress = {
      ...progress,
      runId: normalizedRunId,
      instanceId: this.instanceId,
      emittedAt: new Date().toISOString(),
    };
    this.logger.log(`[UserSyncProgress] runId=${normalizedRunId} instance=${this.instanceId} stage=${payload?.stage} percentage=${payload?.percentage} current=${payload?.current}/${payload?.total} message=${payload?.message}`);
    this.progressSubject.next(payload);
    this.publishProgress(payload, normalizedRunId).catch((err) => {
      this.logger.error(`[UserSyncProgress] Redis publish failed runId=${normalizedRunId}: ${err.message}`, err.stack);
    });
  }

  private removeRolesByGroup(
    rolesByProcess: RolesByProcess[],
    groupId: string,
  ): RolesByProcess[] {
    return rolesByProcess
      .map((rbp) => ({
        ...rbp,
        roles: rbp.roles.filter((r: any) => r.__groupId !== groupId),
      }))
      .filter((rbp) => rbp.roles.length > 0);
  }

  private mergeRolesByProcess(
    current: RolesByProcess[],
    incoming: RolesByProcess[],
  ): RolesByProcess[] {
    const resultMap = new Map<string, { name: string; roles: RoleItem[] }>();

    for (const item of current) {
      resultMap.set(item.processKey, {
        name: item.name ?? item.processKey,
        roles: [...item.roles],
      });
    }

    for (const item of incoming) {
      const existed = resultMap.get(item.processKey);

      if (existed) {
        existed.roles.push(...item.roles);
      } else {
        resultMap.set(item.processKey, {
          name: item.name ?? item.processKey,
          roles: [...item.roles],
        });
      }
    }

    return Array.from(resultMap.entries()).map(([processKey, value]) => ({
      processKey,
      name: value.name,
      roles: value.roles,
    }));
  }

  private mapRolesDynamicToRolesByProcess(
    rolesDynamic: {
      processKey: string;
      roleCode: string;
      name: string;
    }[],
    groupId: string,
  ): RolesByProcess[] {
    const map = new Map<string, RoleItem[]>();

    for (const r of rolesDynamic) {
      if (!map.has(r.processKey)) {
        map.set(r.processKey, []);
      }

      map.get(r.processKey)!.push({
        roleCode: r.roleCode,
        name: r.name,
        __groupId: groupId,
      } as any);
    }

    return Array.from(map.entries()).map(([processKey, roles]) => ({
      processKey,
      name: processKey,
      roles,
    }));
  }

  // Các method khác (syncFromMongoToKeycloak, fullSync, autoSync...) giữ nguyên logic,
  // chỉ thay this.userModel → this.userRepository và .save(), .update() → .save()

  /**
   * Đồng bộ từ MSSQL lên Keycloak kèm theo báo cáo tiến độ (Progress Subject)
   */
  async syncToKeycloakWithProgress(runId?: string): Promise<{
    created: number;
    updated: number;
    failed: number;
    total: number;
  }> {
    const normalizedRunId = this.normalizeRunId(runId);
    const syncRunId = `to-kc-${normalizedRunId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const syncStartedAt = Date.now();
    let lockAcquired = false;

    try {
      lockAcquired = await this.acquireSyncLock(normalizedRunId, 'to-keycloak');
      if (!lockAcquired) {
        const currentLock = await this.getCurrentSyncLock();
        const message = 'Tien trinh dong bo dang chay' + (currentLock?.runId ? ' (runId=' + currentLock.runId + ')' : '') + '. Vui long doi.';
        this.logger.warn(`[KeycloakSync:${syncRunId}] lock rejected current=${JSON.stringify(currentLock)} requestedRunId=${normalizedRunId}`);
        this.emitProgress({ stage: 'error', message, current: 0, total: 0, percentage: 0 }, normalizedRunId);
        throw new BadRequestException(message);
      }

      this.isSyncing = true;
      this.shouldStopSync = false;
      this.activeRunId = normalizedRunId;
      await this.clearCancelFlag(normalizedRunId);
      this.logger.log(`[KeycloakSync:${syncRunId}] start syncToKeycloakWithProgress runId=${normalizedRunId} instance=${this.instanceId}`);

      this.emitProgress({ stage: 'starting', message: 'Đang khởi tạo...', current: 0, total: 0, percentage: 0 });

      // Force lấy token MỚI mỗi lần sync (tránh dùng token cũ thiếu roles)
      this.accessToken = '';
      this.tokenExpiry = 0;

      // 1. Lấy cấu hình Keycloak
      const authConfig = await this.authConfigRepository.findOne({
        where: { authType: 'keycloak', isActive: true },
      });
      const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);

      if (!config.issuer || !config.baseUrl) {
        throw new HttpException('Chưa cấu hình Keycloak issuer hoặc baseUrl.', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      // LOG REALM HIỆN TẠI
      const realmConfig = config.issuer.split('/').pop() || 'master';

      // --- BẮT ĐẦU PING ĐỂ GIÁM SÁT KẾT NỐI ---
      this.startKeycloakPing(config.baseUrl);

      // 2. Lấy danh sách user Active từ DB
      this.emitProgress({ stage: 'fetching', message: 'Đang lấy danh sách người dùng Active từ cơ sở dữ liệu...', current: 0, total: 0, percentage: 5 });
      const users = await this.userRepository.find({
        where: { status: 1 },
        relations: ['groupUsers'],
      });
      const total = users.length;


      if (total === 0) {
        this.emitProgress({ stage: 'completed', message: 'Không có người dùng Active nào để đồng bộ.', current: 0, total: 0, percentage: 100 });
        return { total: 0, created: 0, updated: 0, failed: 0 };
      }

      // 3. LẤY TOÀN BỘ USER KEYCLOAK 1 LẦN → BUILD MAP ĐỂ MATCH CỤC BỘ
      this.emitProgress({ stage: 'fetching', message: 'Đang chuẩn bị danh sách đối chiếu từ Keycloak...', current: 0, total, percentage: 7 });
      let allKcUsers: any[] = [];
      try {
        // Tăng batchSize lên 500 và thêm callback để update progress liên tục, tránh timeout SSE
        allKcUsers = await this.getAllUsersFromKeycloak(this.keycloakSyncFetchBatchSize, (count) => {
          this.emitProgress({ 
            stage: 'fetching', 
            message: `Đang tải danh sách đối chiếu từ Keycloak (đã lấy ${count} user)...`, 
            current: 0, 
            total, 
            percentage: 7 
          });
        }, normalizedRunId);
      } catch (fetchErr) {
        this.logger.warn(`⚠️ Không thể lấy toàn bộ danh sách từ Keycloak (Lỗi: ${fetchErr.message}). Sẽ chuyển sang chế độ đối chiếu từng người một...`);
        // Không throw nữa, để allKcUsers rỗng và dùng fallback search API sau này
        allKcUsers = [];
      }

      // Build Map<username_lowercase, kcUser> để tra cứu nhanh O(1)
      const kcUserMap = new Map<string, any>();
      for (const kcUser of allKcUsers) {
        if (kcUser.username) {
          kcUserMap.set(kcUser.username.toLowerCase(), kcUser);
        }
      }

      this.emitProgress({ stage: 'processing', message: `Tìm thấy ${total} user DB + ${kcUserMap.size} user KC. Bắt đầu đồng bộ...`, current: 0, total, percentage: 10 });

      let created = 0;
      let updated = 0;
      let failed = 0;
      const startTime = Date.now();


      // 4. Xử lý THEO LÔ (Batching) + CHẠY SONG SONG trong lô để tăng tốc
      const batchSize = 10;
      for (let i = 0; i < users.length; i += batchSize) {
        // Kiểm tra yêu cầu hủy
        if (await this.isCancelRequested(normalizedRunId)) {
          this.logger.warn(`🛑 [Sync] Dừng đồng bộ lên Keycloak do có yêu cầu hủy tại lô thứ ${Math.floor(i / batchSize) + 1}.`);
          break;
        }

        const batch = users.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(total / batchSize);
        

        // Nhường quyền thực thi cho Event Loop để tránh treo connection (SSE)
        await new Promise(resolve => setImmediate(resolve));

        // Chạy song song các user trong cùng một lô (Sử dụng Promise.all)
        await Promise.all(batch.map(async (user) => {
          try {
            let targetPassword = user.password;
            let isTemporary = false;

            const isSpecialUser = this.specialUsersForReset.includes((user.username || '').toLowerCase());

            if (isSpecialUser) {
              targetPassword = process.env.KEYCLOAK_DEFAULT_PASSWORD || '@TanCang123';
              isTemporary = false;
            } else if (!targetPassword || targetPassword.startsWith('$')) {
              targetPassword = process.env.KEYCLOAK_DEFAULT_PASSWORD || '@TanCang123';
              isTemporary = true;
            }

            const syncResult = await this.syncSingleUserToKeycloakWithConfig(user, targetPassword, isTemporary, authConfig, kcUserMap);
            
            if (syncResult.created) created++;
            else if (syncResult.updated) updated++;
            else if (syncResult.failed) failed++;
          } catch (err) {
            failed++;
            const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            this.logger.error(`❌ [User Sync Failed] ${user.username}: ${errorDetail}`);
          }
        }));

        // Gửi tiến độ sau mỗi lô (hoặc mỗi khi được 10 user)
        const processedSoFar = Math.min(i + batchSize, total);
        const percentage = Math.round(10 + (processedSoFar / total) * 85);
        this.emitProgress({
          stage: 'processing',
          message: `Đang xử lý ${processedSoFar}/${total}`,
          current: processedSoFar,
          total,
          percentage,
          currentUser: batch[batch.length - 1]?.username
        });
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const result = { total, created, updated, failed };
      
      this.emitProgress({ 
        stage: 'completed', 
        message: `Hoàn thành đồng bộ! Thời gian: ${duration}s`, 
        current: total, 
        total, 
        percentage: 100, 
        result: { ...result, skipped: 0 } 
      });

      // --- DỪNG PING SAU KHI ĐỒNG BỘ HOÀN TẤT ---
      this.stopKeycloakPing();
      return result;
    } catch (error) {
      // --- DỪNG PING KHI CÓ LỖI ---
      this.stopKeycloakPing();
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`❌ Sync to Keycloak failed: ${errorMsg}`);
      this.emitProgress({ stage: 'error', message: errorMsg, current: 0, total: 0, percentage: 0 }, normalizedRunId);
      throw new HttpException('Sync to Keycloak failed', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      this.isSyncing = false;
      this.shouldStopSync = false;
      if (this.activeRunId === normalizedRunId) {
        this.activeRunId = null;
      }
      if (lockAcquired) {
        await this.releaseSyncLock(normalizedRunId);
        await this.clearCancelFlag(normalizedRunId);
      }
    }
  }

  /**
   * Helper cho việc đồng bộ 1 user lên Keycloak (dùng cho loop)
   * Dùng kcUserMap (lấy sẵn từ trước) để match cục bộ thay vì gọi API search từng user.
   */
  private async syncSingleUserToKeycloakWithConfig(
    user: UserEntity, 
    plainPassword?: string, 
    isTemporary: boolean = false,
    authConfig?: AuthConfigEntity | null,
    kcUserMap?: Map<string, any>
  ): Promise<{ created?: boolean; updated?: boolean; failed?: boolean }> {
    // if (!authConfig) {
      // Cho phép fall back nếu không có DB record
    // }
    try {
      const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);
      const realm = config.issuer.split('/').pop() || 'master';
      let token = await this.getAdminToken();
      const agent = new https.Agent({ rejectUnauthorized: false });

      // === BƯỚC 1: TÌM USER TRÊN KEYCLOAK (DÙNG MAP HOẶC FALLBACK SEARCH API) ===
      let kcUserId = user.keycloakUserId;
      const isSpecialResetUser = this.specialUsersForReset.includes((user.username || '').toLowerCase());

      let kcUser = kcUserMap?.get(user.username.toLowerCase()) || null;
      
      // FALLBACK: Nếu không có MAP đối chiếu (do bước tải 8k5 bị lỗi) thì gọi API Search trực tiếp cho user này
      if (!kcUser && (!kcUserMap || kcUserMap.size === 0)) {
        try {
          const searchUrl = `${config.baseUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(user.username)}&exact=true`;
          const searchRes = await this.requestWithRetry({
            method: 'get',
            url: searchUrl,
            headers: { Authorization: `Bearer ${token}` },
          });
          kcUser = (searchRes.data && Array.isArray(searchRes.data))
            ? searchRes.data.find((u: any) => u.username?.toLowerCase() === user.username.toLowerCase())
            : null;
        } catch (searchErr) {
          this.logger.error(`  └─ ❌ Lỗi Search API fallback cho ${user.username}: ${searchErr.message}`);
        }
      }

      const foundId = kcUser ? kcUser.id : null;
      

      if (foundId) {
        if (kcUserId !== foundId) {
          kcUserId = foundId;
          user.keycloakUserId = kcUserId;
          await this.userRepository.save(user);
        }
      } else {
        if (kcUserId) {
          this.logger.warn(`  └─ ⚠️ ID cũ ${kcUserId} của '${user.username}' không còn trên Keycloak. Sẽ tạo mới.`);
          kcUserId = null;
          user.keycloakUserId = null;
          await this.userRepository.save(user);
        }
      }

      // === BƯỚC 2: NẾU ĐÃ TỒN TẠI → RESET PASSWORD (nếu cần) VÀ BỎ QUA ===
      if (kcUserId) {
        if (isSpecialResetUser) {
          await this.resetPasswordIfSpecialUser(kcUserId, user.username, config, realm, token, agent);
        }
        // Log báo hoàn tất với user này
        return { updated: true };
      }

      // === BƯỚC 3: TẠO MỚI USER (CẦN GỌI API) ===
      const nameParts = (user.name || user.username).trim().split(' ');
      const lastName = nameParts.length > 1 ? nameParts.pop() : '';
      const firstName = nameParts.join(' ') || user.username;

      const userData: any = {
        username: user.username,
        email: user.emailUser || undefined,
        firstName,
        lastName,
        enabled: user.status === 1,
        credentials: plainPassword ? [{ type: 'password', value: plainPassword, temporary: isTemporary }] : [],
      };
      

      const createUrl = `${config.baseUrl}/admin/realms/${realm}/users`;
      
      // Retry logic cho CREATE
      const MAX_CREATE_RETRIES = 2;
      for (let attempt = 0; attempt <= MAX_CREATE_RETRIES; attempt++) {
        try {
          // Refresh token nếu cần
          token = await this.getAdminToken();
          
          const createRes = await this.requestWithRetry({
            method: 'post',
            url: createUrl,
            data: userData,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 60000,
          });

          const location = createRes.headers.location || createRes.headers['location'];
          if (location) {
            kcUserId = location.split('/').pop();
            user.keycloakUserId = kcUserId;
            await this.userRepository.save(user);
            
            // Log full cho việc tạo mới

            // Reset password cho special user ngay sau khi tạo
            if (isSpecialResetUser && kcUserId) {
              await this.resetPasswordIfSpecialUser(kcUserId, user.username, config, realm, token, agent);
            }
          }
          // Delay 100ms sau mỗi CREATE thành công
          await new Promise(resolve => setTimeout(resolve, 100));
          return { created: true };

        } catch (err) {
          const status = err.response?.status;

          if (status === 409) {
            const errBody = JSON.stringify(err.response?.data || {});
            this.logger.warn(`  └─ ⚠️ [409] ${user.username}: responseBodySize=${errBody.length}`);

            // 409 thường do TRÙNG EMAIL (không phải username). Thử tạo lại KHÔNG CÓ EMAIL.
            if (userData.email && attempt < MAX_CREATE_RETRIES) {
              this.logger.warn(`  └─ 🔄 [409→RETRY] Thử tạo '${user.username}' KHÔNG CÓ email (email cũ: ${userData.email})...`);
              delete userData.email;
              await new Promise(resolve => setTimeout(resolve, 200));
              continue; // retry vòng for
            }

            // Nếu đã thử không email rồi mà vẫn 409 → thực sự trùng username → search lấy ID
            this.logger.warn(`  └─ 🔍 [409] Đã thử không email rồi. Tìm user '${user.username}' trên KC bằng search API...`);
            try {
              const searchUrl = `${config.baseUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(user.username)}&exact=true`;
              const searchRes = await this.requestWithRetry({
                method: 'get',
                url: searchUrl,
                headers: { Authorization: `Bearer ${token}` },
              });
              const found = (searchRes.data && Array.isArray(searchRes.data))
                ? searchRes.data.find((u: any) => u.username?.toLowerCase() === user.username.toLowerCase())
                : null;
              if (found) {
                user.keycloakUserId = found.id;
                await this.userRepository.save(user);
                if (isSpecialResetUser) {
                  await this.resetPasswordIfSpecialUser(found.id, user.username, config, realm, token, agent);
                }
              } else {
                this.logger.error(`  └─ ❌ [409] Không tìm thấy '${user.username}' trên KC dù bị 409. responseBodySize=${errBody.length}`);
              }
            } catch (searchErr) {
              this.logger.error(`  └─ ❌ [409] Không thể search '${user.username}' sau 409: ${searchErr.message}`);
            }
            return { updated: true };
          }

          // 401/403: refresh token rồi retry
          if ((status === 401 || status === 403) && attempt < MAX_CREATE_RETRIES) {
            this.logger.warn(`  └─ ⚠️ [CREATE RETRY ${attempt + 1}] Bị ${status} cho '${user.username}'. Refresh token...`);
            this.accessToken = '';
            token = await this.getAdminToken();
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }

          // 500 unknown_error: thử xóa email rồi retry
          if (status === 500 && err.response?.data?.error === 'unknown_error') {
            if (userData.email && attempt < MAX_CREATE_RETRIES) {
              this.logger.warn(`  └─ ⚠️ [CREATE] Keycloak 500 cho '${user.username}' (email: ${userData.email}). Thử lại không email...`);
              delete userData.email;
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            this.logger.error(`  └─ ❌ [CREATE] Keycloak 500 "unknown_error" cho '${user.username}'. Server có thể overload.`);
          }

          throw err;
        }
      }
      return { failed: true };
    } catch (error) {
      this.logger.error(`Failed to sync user ${user.username}: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      return { failed: true };
    }
  }

  async syncFromMongoToKeycloak(): Promise<{ created: number; updated: number; failed: number; total: number }> {
    return this.syncToKeycloakWithProgress();
  }

  async fullSync(): Promise<{ keycloakToMssql: any; mssqlToKeycloak: any }> {
    try {
      const keycloakToMssql = await this.syncFromKeycloakToMongo();
      const mssqlToKeycloak = await this.syncFromMongoToKeycloak();

      return { keycloakToMssql, mssqlToKeycloak };
    } catch (error) {
      throw new HttpException('Full sync failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async autoSyncFromKeycloak() {
    try {
      await this.syncFromKeycloakToMongo(); // đổi tên nếu cần
    } catch (error) {
      this.logger.error(`⏰ Auto-sync failed: ${error.message}`);
    }
  }

  // --- MAPPING QUYỀN API ---
  async getGroupMappings(): Promise<any[]> {
    const [mappings, groups] = await Promise.all([
      this.keycloakGroupMappingRepository.find({ order: { createdAt: 'DESC' } }),
      this.groupUserRepository.find({ select: ['id', 'code', 'name'] })
    ]);

    // Tạo bản đồ code -> id để tra cứu nhanh
    const groupMap = new Map<string, { id: string; code: string; name: string }>();
    groups.forEach(g => groupMap.set(g.code, g));

    return mappings.map(m => {
      const g = groupMap.get(m.groupCode);
      return {
        ...m,
        groupCode: g
          ? { code: m.groupCode, id: g.id, name: g.name }
          : { code: m.groupCode, id: null }
      };
    });
  }
  async saveGroupMappings(mappings: any[]): Promise<any> {
    try {
      const data = Array.isArray(mappings) ? mappings : [];

      // Chuẩn hóa dữ liệu: nếu groupCode là object {code, id} thì trích xuất lấy code
      const normalizedData = data.map(m => {
        if (m && typeof m.groupCode === 'object' && m.groupCode !== null) {
          return { ...m, groupCode: m.groupCode.code };
        }
        return m;
      });

      // Lọc bỏ các hàng trống (không có mã nhóm) trước khi lưu
      const validMappings = normalizedData.filter(m => m && m.groupCode && m.groupCode.trim() !== '');

      if (validMappings.length === 0) {
        // Nếu không có mapping nào hợp lệ, chỉ cần clear bảng và trả về
        await this.keycloakGroupMappingRepository.clear();
        return [];
      }

      await this.keycloakGroupMappingRepository.clear();
      const newEntities = this.keycloakGroupMappingRepository.create(validMappings);
      return await this.keycloakGroupMappingRepository.save(newEntities);
    } catch (error) {
      throw new InternalServerErrorException(`Lỗi khi lưu mapping: ${error.message}`);
    }
  }

  // --- SYNC SINGLE USER FROM APP TO KEYCLOAK ---
  async syncSingleUserToKeycloak(userId: string, plainPassword?: string): Promise<any> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['groupUsers'],
      });
      if (!user) return null;

      const authConfig = await this.authConfigRepository.findOne({
        where: { authType: 'keycloak', isActive: true },
      });
      const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);
      
      if (!config.issuer || !config.baseUrl) return null;

      const realm = config.issuer.split('/').pop() || 'master';
      const token = await this.getAdminToken();

      const agent = new https.Agent({ rejectUnauthorized: false });

      // 1. Kiểm tra xem user đã tồn tại trên Keycloak chưa
      let kcUserId = user.keycloakUserId;
      const isSpecialResetUser = this.specialUsersForReset.includes((user.username || '').toLowerCase());

      // LUÔN LUÔN TÌM THEO USERNAME để chống lại việc ID cũ (stale ID) nằm trong DB nhưng trên Keycloak đã bị xóa
      const searchUrl = `${config.baseUrl}/admin/realms/${realm}/users?username=${user.username}&exact=true`;
      const searchRes = await this.requestWithRetry({
        method: 'get',
        url: searchUrl,
        headers: { Authorization: `Bearer ${token}` },
      });

      const foundUser = (searchRes.data && Array.isArray(searchRes.data))
        ? searchRes.data.find((u: any) => u.username?.toLowerCase() === user.username.toLowerCase())
        : null;
      
      let foundId = foundUser ? foundUser.id : null;

      if (foundId) {
        if (kcUserId !== foundId) {
          kcUserId = foundId;
          user.keycloakUserId = kcUserId;
          await this.userRepository.save(user);
        }
      } else {
        if (kcUserId) {
          this.logger.warn(`⚠️ ID cũ ${kcUserId} của '${user.username}' không còn tồn tại trên Keycloak. Sẽ tạo mới.`);
          kcUserId = null;
          user.keycloakUserId = null;
          await this.userRepository.save(user);
        }
      }

      // Nếu đã có kcUserId -> Bỏ qua tạo mới, chỉ reset pass nếu đặc biệt
      if (kcUserId) {
        // --- TRIGGER: Reset mật khẩu cho người dùng đặc biệt ---
        if (isSpecialResetUser) {
          await this.resetPasswordIfSpecialUser(kcUserId, user.username, config, realm, token, agent);
        }

        return { success: true };
      }

      // Xử lý name
      const nameParts = (user.name || user.username).trim().split(' ');
        const lastName = nameParts.length > 1 ? nameParts.pop() : '';
        const firstName = nameParts.join(' ') || user.username;

        const userData = {
          username: user.username,
          email: user.emailUser || undefined,
          firstName: firstName,
          lastName: lastName,
          enabled: user.status === 1,
        };

        // 2. Tạo mới
        const createUrl = `${config.baseUrl}/admin/realms/${realm}/users`;

        try {
          const createRes = await this.requestWithRetry({
            method: 'post',
            url: createUrl,
            data: userData,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 60000,
          });
          // Lấy ID từ header location
          const location = createRes.headers.location;
          if (location) {
            kcUserId = location.split('/').pop();
            user.keycloakUserId = kcUserId;
            await this.userRepository.save(user);
          }
        } catch (e) {
          if (e.response?.status === 409) {
            this.logger.warn(`⚠️ Xung đột (409) khi tạo user đơn lẻ ${user.username}. Đang thu hồi ID...`);
            const fallbackSearch = await this.requestWithRetry({
              method: 'get',
              url: `${config.baseUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(user.emailUser || '')}&exact=true`,
              headers: { Authorization: `Bearer ${token}` },
            });
            if (fallbackSearch.data && fallbackSearch.data.length > 0) {
              kcUserId = fallbackSearch.data[0].id;
              user.keycloakUserId = kcUserId;
              await this.userRepository.save(user);
            } else {
              throw e;
            }
          } else {
            this.logger.error(`Failed to create Keycloak user: ${e?.response?.data?.errorMessage || e.message}`);
            return { success: false, error: e.message };
          }
        }

      // Đặt mật khẩu (sử dụng mật khẩu truyền vào hoặc mật khẩu mặc định nếu tạo mới)
      const passwordToSet = plainPassword || process.env.KEYCLOAK_DEFAULT_PASSWORD;
      if (kcUserId && passwordToSet) {
        const passUrl = `${config.baseUrl}/admin/realms/${realm}/users/${kcUserId}/reset-password`;
        await this.requestWithRetry({
          method: 'put',
          url: passUrl,
          data: {
            type: 'password',
            value: passwordToSet,
            temporary: false
          },
          headers: { Authorization: `Bearer ${token}` },
        }).catch(e => this.logger.error(`Failed to set password: ${e?.response?.data?.errorMessage || e.message}`));
      }

      // Xử lý đồng bộ Group (tương đương Client Role)
      if (kcUserId) {
        const clientsUrl = `${config.baseUrl}/admin/realms/${realm}/clients?clientId=${config.clientId}`;
        const clientsRes = await this.requestWithRetry({
          method: 'get',
          url: clientsUrl,
          headers: { Authorization: `Bearer ${token}` },
        });

        if (clientsRes.data && clientsRes.data.length > 0) {
          const clientUuid = clientsRes.data[0].id;

          // 1. Lấy danh sách Role hiện tại của User cho Client này
          const mappingUrl = `${config.baseUrl}/admin/realms/${realm}/users/${kcUserId}/role-mappings/clients/${clientUuid}`;
          const currentMappingsRes = await this.requestWithRetry({
            method: 'get',
            url: mappingUrl,
            headers: { Authorization: `Bearer ${token}` },
          });
          const currentRoles = currentMappingsRes.data || [];

          // 2. Danh sách Role mong muốn từ App Groups kèm Mapping
          const allRoleMappings = await this.keycloakGroupMappingRepository.find();
          const targetRoleNamesSet = new Set<string>();

          for (const group of user.groupUsers || []) {
            if (!group.code) continue;

            // Tìm các mapping cho groupCode này
            const mappings = allRoleMappings.filter(
              (m) => m.groupCode === group.code,
            );

            if (mappings.length > 0) {
              for (const m of mappings) {
                if (m.clientRole) {
                  // Nếu mapping có clientRole (format clientId:roleName hoặc chỉ roleName)
                  const roleName = m.clientRole.includes(':')
                    ? m.clientRole.split(':')[1]
                    : m.clientRole;
                  targetRoleNamesSet.add(roleName);
                }
                // (Tùy chọn) Có thể xử lý thêm realmRole ở đây nếu cần mở rộng
              }
            } else {
              // ✅ Nếu không có mapping nào, dùng chính group.code làm tên role (User requirement)
              targetRoleNamesSet.add(group.code);
            }
          }

          const targetRoleCodes = Array.from(targetRoleNamesSet);

          // 3. Xóa các Role thừa (có trên Keycloak nhưng không còn trong App Groups)
          const rolesToRemove = currentRoles.filter(cr => !targetRoleCodes.includes(cr.name));
          if (rolesToRemove.length > 0) {
            await this.requestWithRetry({
              method: 'delete',
              url: mappingUrl,
              data: rolesToRemove,
              headers: { Authorization: `Bearer ${token}` },
            }).catch(e => this.logger.error(`Failed to remove roles: ${e?.response?.data?.errorMessage || e.message}`));
          }

          // 4. Thêm các Role thiếu (có trong App Groups nhưng chưa có trên Keycloak)
          const roleNamesToAdd = targetRoleCodes.filter(trc => !currentRoles.some(cr => cr.name === trc));

          for (const roleName of roleNamesToAdd) {
            // Tìm group tương ứng (để lấy description) - ưu tiên group gốc nếu không qua mapping
            const group = user.groupUsers.find(gu => gu.code === roleName) || 
                          user.groupUsers.find(gu => {
                            const mappings = allRoleMappings.filter(m => m.groupCode === gu.code);
                            return mappings.some(m => m.clientRole && (m.clientRole === roleName || m.clientRole.endsWith(`:${roleName}`)));
                          });

            const roleUrl = `${config.baseUrl}/admin/realms/${realm}/clients/${clientUuid}/roles/${encodeURIComponent(roleName)}`;
            let roleDef: any = null;

            try {
              const roleRes = await this.requestWithRetry({
                method: 'get',
                url: roleUrl,
                headers: { Authorization: `Bearer ${token}` },
              });
              roleDef = roleRes.data;
            } catch (e) {
              if (e.response?.status === 404) {
                // Tạo role nếu chưa tồn tại
                try {
                  await this.requestWithRetry({
                    method: 'post',
                    url: `${config.baseUrl}/admin/realms/${realm}/clients/${clientUuid}/roles`,
                    data: {
                      name: roleName,
                      description: group?.name || `Auto generated from group ${roleName}`
                    },
                    headers: { Authorization: `Bearer ${token}` },
                  });

                  const roleRes = await this.requestWithRetry({
                    method: 'get',
                    url: roleUrl,
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  roleDef = roleRes.data;
                } catch (ce) {
                  this.logger.error(`Failed to create client role ${roleName}: ${ce?.response?.data?.errorMessage || ce.message}`);
                }
              }
            }

            if (roleDef && roleDef.id) {
              await this.requestWithRetry({
                method: 'post',
                url: mappingUrl,
                data: [
                  {
                    id: roleDef.id,
                    name: roleDef.name
                  }
                ],
                headers: { Authorization: `Bearer ${token}` },
              }).catch(e => this.logger.error(`Failed to assign role ${roleName}: ${e?.response?.data?.errorMessage || e.message}`));
            }
          }
        }
      }
      return { success: true };
    } catch (e) {
      this.logger.error(`❌ syncSingleUserToKeycloak failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  /**
   * Helper: Reset mật khẩu cho các tài khoản đặc biệt thông qua ENV
   */
  private async resetPasswordIfSpecialUser(
    kcUserId: string,
    username: string,
    config: any,
    realm: string,
    token: string,
    agent: any
  ) {
    if (this.specialUsersForReset.includes(username?.toLowerCase())) {
      const defaultPassword = process.env.KEYCLOAK_DEFAULT_PASSWORD || '@TanCang123';
      const passUrl = `${config.baseUrl}/admin/realms/${realm}/users/${kcUserId}/reset-password`;
      try {
        await this.requestWithRetry({
          method: 'put',
          url: passUrl,
          data: {
            type: 'password',
            value: defaultPassword,
            temporary: false
          },
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        this.logger.error(`  └─ ❌ Lỗi khi đặt lại mật khẩu cho user ${username} (KC_ID: ${kcUserId}): ${err.message}`);
      }
    }
  }

  /**
   * PUBLIC: Đồng bộ mật khẩu mới của một user lên Keycloak.
   * Gọ bởi UsersService sau khi đổi mật khẩu thành công.
   */
  async resetKeycloakPassword(userId: string, newPlainPassword: string): Promise<{ success: boolean }> {
    try {
      // 1. Lấy thông tin user (cần keycloakUserId và username)
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'username', 'keycloakUserId'],
      });

      if (!user) {
        this.logger.warn(`[KC PASS SYNC] Không tìm thấy user ID=${userId} trong DB.`);
        return { success: false };
      }

      // 2. Lấy cấu hình Keycloak
      const authConfig = await this.authConfigRepository.findOne({
        where: { authType: 'keycloak', isActive: true },
      });
      const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);

      if (!config.baseUrl || !config.issuer) {
        this.logger.warn('[KC PASS SYNC] Keycloak chưa được cấu hình. Bỏ qua đồng bộ mật khẩu.');
        return { success: false };
      }

      const realm = config.issuer.split('/').pop() || 'master';
      const token = await this.getAdminToken();

      // 3. Tìm keycloakUserId - ưu tiên từ DB, fallback search theo username
      let kcUserId = user.keycloakUserId;
      if (!kcUserId) {
        const searchUrl = `${config.baseUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(user.username)}&exact=true`;
        const searchRes = await this.requestWithRetry({
          method: 'get',
          url: searchUrl,
          headers: { Authorization: `Bearer ${token}` },
        });
        const found = Array.isArray(searchRes.data)
          ? searchRes.data.find((u: any) => u.username?.toLowerCase() === user.username.toLowerCase())
          : null;

        if (found) {
          kcUserId = found.id;
          // Lưu lại vào DB để lần sau khỏi tìm lại
          user.keycloakUserId = kcUserId;
          await this.userRepository.save(user);
        } else {
          this.logger.warn(`[KC PASS SYNC] Không tìm thấy '${user.username}' trên Keycloak. Bỏ qua đồng bộ mật khẩu.`);
          return { success: false };
        }
      }

      // 4. Gọi API reset mật khẩu trên Keycloak
      const passUrl = `${config.baseUrl}/admin/realms/${realm}/users/${kcUserId}/reset-password`;
      await this.requestWithRetry({
        method: 'put',
        url: passUrl,
        data: {
          type: 'password',
          value: newPlainPassword,
          temporary: false,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.error(`❌ [KC PASS SYNC] Lỗi đồng bộ mật khẩu lên Keycloak cho user ID=${userId}: ${errMsg}`);
      // Không throw để tránh làm hỏng luồng đổi mật khẩu chính
      return { success: false };
    }
  }
}
