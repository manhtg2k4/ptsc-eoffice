import { Controller, Post, Get, Query, HttpCode, HttpStatus, Param, Sse, MessageEvent, Body, UseGuards, Logger, Req } from '@nestjs/common';
import { UserSyncService } from './user-sync.service';
import { SaveBatchGroupMappingDto } from './dto/keycloak-group-mapping.dto';
import { Observable, Subscription } from 'rxjs';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('User Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('user-sync')
export class UserSyncController {
  private readonly logger = new Logger(UserSyncController.name);

  constructor(private readonly userSyncService: UserSyncService) { }

  /**
   * SSE /user-sync/progress
   * Real-time progress updates
   */
  @Sse('progress')
  syncProgress(@Req() req: any, @Query('runId') runId?: string): Observable<MessageEvent> {
    return new Observable((observer) => {
      const requestId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const normalizedRunId = this.userSyncService.normalizeRunId(runId);
      const userId = req?.user?.userId || req?.user?.user || 'unknown';
      const clientIp = req?.ip || req?.socket?.remoteAddress || req?.headers?.['x-forwarded-for'] || 'unknown';
      this.logger.log('[UserSyncSSE:' + requestId + '] client connected runId=' + normalizedRunId + ' user=' + userId + ' ip=' + clientIp);

      let closed = false;
      let cleanupProgressSubscription: (() => void) | null = null;
      let localSubscription: Subscription | null = null;
      let lastSentKey = '';
      let lastProgress: any = {
        stage: 'fetching',
        message: 'Dang duy tri ket noi dong bo...',
        current: 0,
        total: 0,
        percentage: 0,
        runId: normalizedRunId,
      };

      const pushProgress = (progress: any, source: 'redis' | 'local') => {
        const progressRunId = this.userSyncService.normalizeRunId(progress?.runId);
        if (progressRunId !== normalizedRunId) return;

        const eventKey = [
          progressRunId,
          progress?.emittedAt || '',
          progress?.stage || '',
          progress?.percentage ?? '',
          progress?.current ?? '',
          progress?.total ?? '',
          progress?.message || '',
        ].join('|');
        if (eventKey === lastSentKey) return;
        lastSentKey = eventKey;

        lastProgress = progress;
        this.logger.log('[UserSyncSSE:' + requestId + '] push source=' + source + ' runId=' + normalizedRunId + ' stage=' + progress?.stage + ' percentage=' + progress?.percentage + ' current=' + progress?.current + '/' + progress?.total + ' message=' + progress?.message + ' sourceInstance=' + (progress?.instanceId || ''));
        observer.next({ data: progress } as MessageEvent);
      };

      localSubscription = this.userSyncService.progressSubject.subscribe({
        next: (progress) => pushProgress(progress, 'local'),
        error: (err) => this.logger.error('[UserSyncSSE:' + requestId + '] local stream error runId=' + normalizedRunId + ': ' + (err?.message || err), err?.stack),
      });

      const heartbeatInterval = setInterval(() => {
        const heartbeatProgress = {
          ...lastProgress,
          message: lastProgress?.message || 'Dang duy tri ket noi dong bo...',
          heartbeat: true,
          runId: normalizedRunId,
        };
        this.logger.log('[UserSyncSSE:' + requestId + '] heartbeat runId=' + normalizedRunId + ' stage=' + heartbeatProgress?.stage + ' percentage=' + heartbeatProgress?.percentage + ' current=' + heartbeatProgress?.current + '/' + heartbeatProgress?.total);
        observer.next({ data: heartbeatProgress } as MessageEvent);
      }, 15000);

      this.userSyncService.subscribeProgress(normalizedRunId, (progress) => {
        pushProgress(progress, 'redis');
      }).then((cleanup) => {
        if (closed) {
          cleanup();
          return;
        }
        cleanupProgressSubscription = cleanup;
      }).catch((err) => {
        this.logger.error('[UserSyncSSE:' + requestId + '] redis subscribe error runId=' + normalizedRunId + ': ' + (err?.message || err), err?.stack);
      });

      return () => {
        closed = true;
        clearInterval(heartbeatInterval);
        localSubscription?.unsubscribe();
        cleanupProgressSubscription?.();
        this.logger.log('[UserSyncSSE:' + requestId + '] client disconnected runId=' + normalizedRunId);
      };
    });
  }
  /**
   * POST /user-sync/from-keycloak-async
   * Start sync với progress tracking (không đợi kết quả)
   */
  @Post('from-keycloak-async')
  @HttpCode(HttpStatus.OK)
  async syncFromKeycloakAsync(@Body() body: any) {
    const runId = this.userSyncService.normalizeRunId(body?.runId);
    this.logger.log('[UserSyncAsync] start from-keycloak runId=' + runId);
    this.userSyncService.syncFromKeycloakWithProgress(runId).catch((err) => {
      this.logger.error('[UserSyncAsync] from-keycloak failed runId=' + runId + ': ' + (err?.message || err), err?.stack);
    });

    return {
      success: true,
      runId,
      message: 'Sync started. Listen to /api/user-sync/progress?runId=' + encodeURIComponent(runId) + ' for real-time updates.',
    };
  }

  /**
   * POST /user-sync/to-keycloak-async
   * Bắt đầu đồng bộ từ ứng dụng lên Keycloak (Async)
   */
  @Post('to-keycloak-async')
  @HttpCode(HttpStatus.OK)
  async syncToKeycloakAsync(@Body() body: any) {
    const runId = this.userSyncService.normalizeRunId(body?.runId);
    this.logger.log('[UserSyncAsync] start to-keycloak runId=' + runId);
    this.userSyncService.syncToKeycloakWithProgress(runId).catch((err) => {
      this.logger.error('[UserSyncAsync] to-keycloak failed runId=' + runId + ': ' + (err?.message || err), err?.stack);
    });

    return {
      success: true,
      runId,
      message: 'Sync to Keycloak started. Listen to /api/user-sync/progress?runId=' + encodeURIComponent(runId) + ' for real-time updates.',
    };
  }

  /**
   * GET /user-sync/keycloak-users
   * Lấy danh sách user từ Keycloak
   */
  @Get('keycloak-users')
  async getKeycloakUsers(@Query('max') max?: number) {
    const maxUsers = max ? parseInt(max.toString(), 10) : 100;
    return this.userSyncService.getUsersFromKeycloak(maxUsers);
  }

  /**
   * POST /user-sync/from-keycloak
   * Đồng bộ từ Keycloak → MongoDB
   */
  @Post('from-keycloak')
  @HttpCode(HttpStatus.OK)
  async syncFromKeycloak() {
    const result = await this.userSyncService.syncFromKeycloakToMongo();
    return {
      success: true,
      message: 'Sync from Keycloak to MongoDB completed',
      result,
    };
  }

  /**
   * POST /user-sync/to-keycloak
   * Đồng bộ từ MongoDB → Keycloak
   */
  @Post('to-keycloak')
  @HttpCode(HttpStatus.OK)
  async syncToKeycloak() {
    const result = await this.userSyncService.syncFromMongoToKeycloak();
    return {
      success: true,
      message: 'Sync from MongoDB to Keycloak completed',
      result,
    };
  }

  /**
   * POST /user-sync/full
   * Đồng bộ 2 chiều (Keycloak ⇄ MongoDB)
   */
  @Post('full')
  @HttpCode(HttpStatus.OK)
  async fullSync() {
    const result = await this.userSyncService.fullSync();
    return {
      success: true,
      message: 'Full bi-directional sync completed',
      result,
    };
  }

  /**
   * POST /user-sync/sync-one/:username
   * Đồng bộ 1 user cụ thể từ Keycloak → MongoDB
   */
  @Post('sync-one/:username')
  @HttpCode(HttpStatus.OK)
  async syncOneUser(@Param('username') username: string) {
    try {
      // Lấy tất cả user từ Keycloak
      const keycloakUsers = await this.userSyncService.getUsersFromKeycloak(1000);

      // Tìm user theo username
      const kcUser = keycloakUsers.find(u => u.username === username);

      if (!kcUser) {
        return {
          success: false,
          message: `User ${username} not found in Keycloak`,
        };
      }

      // Đồng bộ user này sang MongoDB
      const existingUser = await this.userSyncService['userModel'].findOne({
        $or: [
          { username: kcUser.username },
          { keycloakUserId: kcUser.id },
        ],
      });

      if (existingUser) {
        existingUser.keycloakUserId = kcUser.id;
        existingUser.username = kcUser.username;
        existingUser.emailUser = kcUser.email || existingUser.emailUser;
        existingUser.name = kcUser.firstName || existingUser.name;
        existingUser.name = kcUser.lastName || existingUser.name;
        existingUser.status = kcUser.enabled ? 1 : 0;
        await existingUser.save();

        return {
          success: true,
          message: `User ${username} updated successfully`,
          user: existingUser,
        };
      } else {
        const newUser = new this.userSyncService['userModel']({
          keycloakUserId: kcUser.id,
          username: kcUser.username,
          name: `${kcUser.firstName || ''} ${kcUser.lastName || ''}`.trim() || kcUser.username,
          emailUser: kcUser.email,
          firstName: kcUser.firstName,
          lastName: kcUser.lastName,
          status: kcUser.enabled ? 1 : 0,
          password: '',
        });
        await newUser.save();

        return {
          success: true,
          message: `User ${username} created successfully`,
          user: newUser,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync user: ${error.message}`,
      };
    }
  }

  /**
   * GET /user-sync/status
   * Kiểm tra trạng thái kết nối với Keycloak
   */
  @Get('status')
  async checkStatus() {
    try {
      await this.userSyncService.getUsersFromKeycloak(1);
      return {
        success: true,
        message: 'Connected to Keycloak successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Cannot connect to Keycloak',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // --- KEYCLOAK GROUP MAPPING API ---

  @Get('group-mapping')
  async getGroupMappings() {
    return this.userSyncService.getGroupMappings();
  }

  @Post('group-mapping/save-batch')
  @HttpCode(HttpStatus.OK)
  async saveGroupMappings(@Body() body: any) {
    // Chấp nhận cả trường hợp gửi mảng trực tiếp [] hoặc gửi object { mappings: [] }
    const mappings = Array.isArray(body) ? body : (body?.mappings || []);
    const result = await this.userSyncService.saveGroupMappings(mappings);
    return {
      success: true,
      message: 'Lưu mapping thành công',
      result,
    };
  }

  /**
   * POST /user-sync/cancel-sync
   * Hủy quá trình đồng bộ đang diễn ra
   */
  @Post('cancel-sync')
  @HttpCode(HttpStatus.OK)
  async cancelSync(@Body() body: any, @Query('runId') runId?: string) {
    const cancelledRunId = await this.userSyncService.cancelSync(body?.runId || runId);
    return {
      success: true,
      runId: cancelledRunId,
      message: 'Request to cancel sync received. Process will stop shortly.',
    };
  }
}
