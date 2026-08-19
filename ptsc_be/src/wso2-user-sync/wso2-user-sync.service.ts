// src/users/wso2-user-sync.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { STATUS } from 'src/variables/CONST_STATUS';
import axios from 'axios';
import * as https from 'https';
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';

export interface SyncProgress {
  stage: 'starting' | 'fetching' | 'processing' | 'completed' | 'error';
  message: string;
  current: number;
  total: number;
  percentage: number;
  currentUser?: string;
  result?: { total: number; created: number; updated: number; failed: number };
}``

@Injectable()
export class Wso2UserSyncService {
  private readonly logger = new Logger(Wso2UserSyncService.name);
  // private readonly bearerToken = process.env.WSO2_BEARER_TOKEN || '';
  private readonly countPerPage = parseInt(process.env.WSO2_COUNT_PER_PAGE || '51', 10);

  public progressSubject = new Subject<SyncProgress>();

  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AuthConfigEntity, 'mssqlConnection')
    private readonly authConfigRepo: Repository<AuthConfigEntity>,
  ) { }

  private mapWso2RolesToRolesByProcess(wso2Roles: any[]): any[] {
    return wso2Roles.map(role => ({
      processKey: role.audienceValue || 'unknown',
      name: role.audienceDisplay || role.display || 'Unknown',
      roles: [{
        roleCode: role.value,
        name: role.display,
      }],
    }));
  }


  // === HÀM CHÍNH: CHỈ CHẠY KHI GỌI API ===

  async syncFromWso2WithProgress(): Promise<{
    created: number;
    updated: number;
    failed: number;
    total: number;
    skipped?: number;
  }> {
    let created = 0, updated = 0, failed = 0, skipped = 0;

    try {
      this.emitProgress({ stage: 'starting', message: 'Khởi tạo...', current: 0, total: 0, percentage: 0 });
      this.emitProgress({ stage: 'fetching', message: 'Lấy dữ liệu từ WSO2...', current: 0, total: 0, percentage: 5 });


      const wso2DataList = await this.getAllUsersFromWso2();
      const total = wso2DataList.length;

      if (total === 0) {
        this.emitProgress({ stage: 'completed', message: 'Không có user nào để đồng bộ', current: 0, total: 0, percentage: 100 });
        return { total: 0, created: 0, updated: 0, failed: 0, skipped: 0 };
      }

      this.emitProgress({
        stage: 'processing',
        message: `Tìm thấy ${total} users. Đang xử lý...`,
        current: 0,
        total,
        percentage: 10,
      });
      for (let i = 0; i < wso2DataList.length; i++) {
        const data = wso2DataList[i];
        const resource = data.Resources?.[0];
        if (!resource) {
          skipped++;
          continue;
        }

        const wUser = resource;
        const username = wUser.userName;
        const fullName = `${wUser.name?.givenName || ''} ${wUser.name?.familyName || ''}`.trim() || username;

        // === LẤY EMAIL: MẢNG STRING ===
        let email: string | null = null;
        if (Array.isArray(wUser.emails) && wUser.emails.length > 0) {
          email = wUser.emails[0]; // Lấy email đầu tiên
        }

        // Fallback nếu không có email
        const finalEmail = email || `${username}@lifetex.vn`;

        try {
          // Tìm theo wso2UserId hoặc username
          const existingUser = await this.userRepository.findOne({
            where: [{ wso2UserId: wUser.id }, { username }],
          });

          if (existingUser) {
            // CẬP NHẬT
            existingUser.wso2UserId = wUser.id;
            existingUser.username = username;
            existingUser.name = fullName; // Giả định UserEntity có cột 'name'
            existingUser.emailUser = finalEmail;
            existingUser.status = STATUS.ACTIVED;
            existingUser.rolesByProcess = this.mapWso2RolesToRolesByProcess(wUser.roles || []) as any;

            await this.userRepository.save(existingUser);
            updated++;
          } else {
            // KIỂM TRA TRÙNG
            if (!username) {
              skipped++;
              continue;
            }

            const [existsByUsername, existsByEmail] = await Promise.all([
              this.userRepository.findOne({ where: { username } }),
              this.userRepository.findOne({ where: { emailUser: finalEmail } }),
            ]);

            if (existsByUsername || existsByEmail) {
              skipped++;
              this.logger.warn(`Bỏ qua trùng: ${username} / ${finalEmail}`);
              continue;
            }

            // TẠO MỚI
            const newUser = this.userRepository.create({
              id: uuidv4(),
              wso2UserId: wUser.id,
              username,
              name: fullName,
              emailUser: finalEmail,
              status: STATUS.ACTIVED,
              rolesByProcess: this.mapWso2RolesToRolesByProcess(wUser.roles || []) as any,
              password: null, // Cần có giá trị, không thể là null
              createdAt: new Date(),
            });

            try {
              await this.userRepository.save(newUser);
              created++;
            } catch (saveErr: any) {
              if (saveErr.name === 'QueryFailedError' && saveErr.message.includes('duplicate key')) {
                skipped++;
              } else {
                throw saveErr;
              }
            }
          }

          // PROGRESS
          const percentage = Math.round(10 + (i + 1) / total * 85);
          this.emitProgress({
            stage: 'processing',
            message: `Xử lý ${i + 1}/${total}`,
            current: i + 1,
            total,
            percentage,
            currentUser: username,
          });
        } catch (err: any) {
          failed++;
          this.logger.error(`Lỗi user ${username}: ${err.message}`);
        }
      }

      const result = { total, created, updated, failed, skipped };
      this.emitProgress({
        stage: 'completed',
        message: 'Đồng bộ thành công!',
        current: total,
        total,
        percentage: 100,
        result,
      });
      return result;
    } catch (error: any) {
      this.emitProgress({ stage: 'error', message: error.message, current: 0, total: 0, percentage: 0 });

      throw new HttpException('Sync failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }



  /**
   * Lấy danh sách ID trước → Gọi API chi tiết từng user
   */
  private async getAllUsersFromWso2(): Promise<any[]> {
    const allUsers: any[] = [];
    let startIndex = 1; // WSO2 bắt đầu từ 1

    const basicAuth = Buffer.from('admin:admin').toString('base64');
    const authHeader = `Basic ${basicAuth}`;

    // === LẤY CONFIG TỪ DB ===
    const authConfig = await this.authConfigRepo.findOne({
      where: { isActive: true },
      order: { id: 'DESC' },
    });

    if (!authConfig?.config?.authUrl) {
      throw new Error('Không tìm thấy cấu hình SSO active hoặc thiếu authUrl');
    }

    const urlObj = new URL(authConfig.config.authUrl);
    const baseUrl = urlObj.origin; // https://lifesso.lifetex.vn:9445
    const scim2UsersUrl = `${baseUrl}/scim2/Users`;

    // === BƯỚC 1: Lấy danh sách ID ===
    const userIds: string[] = [];

    while (true) {
      const listUrl = new URL(scim2UsersUrl);
      listUrl.searchParams.append('count', this.countPerPage.toString());
      listUrl.searchParams.append('startIndex', startIndex.toString());
      listUrl.searchParams.append('attributes', 'id');

      try {
        const response = await axios.get(listUrl.toString(), {
          headers: { Authorization: authHeader, Accept: 'application/scim+json' },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          timeout: 30000,
        });

        const data = response.data;
        if (!data.Resources || data.Resources.length === 0) break;

        const ids = data.Resources.map((r: any) => r.id).filter(Boolean);
        userIds.push(...ids);

        if (data.Resources.length < this.countPerPage) break;
        startIndex += this.countPerPage;
      } catch (error: any) {
        this.logger.error(`Lỗi lấy danh sách ID: ${error.message}`);
        throw error;
      }
    }


    // === BƯỚC 2: Lấy chi tiết từng user theo filter=id eq "..." ===
    for (let i = 0; i < userIds.length; i++) {
      const id = userIds[i];
      const detailUrl = `${scim2UsersUrl}?filter=id eq "${id}"`;

      try {
        const response = await axios.get(detailUrl, {
          headers: { Authorization: authHeader, Accept: 'application/scim+json' },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          timeout: 30000,
        });

        const data = response.data;
        if (data.Resources && data.Resources[0]) {
          allUsers.push(data); // Giữ nguyên cấu trúc { Resources: [...] }
        }

        // Progress
        this.emitProgress({
          stage: 'fetching',
          message: `Lấy chi tiết ${i + 1}/${userIds.length}`,
          current: i + 1,
          total: userIds.length,
          percentage: Math.round(5 + (i + 1) / userIds.length * 5),
        });
      } catch (error: any) {
        this.logger.error(`Lỗi lấy chi tiết user ${id}: ${error.message}`);
      }
    }

    return allUsers;
  }

  // Trong Wso2UserSyncService
  private lastEmittedPercentage = 0;
  private lastEmittedStage = '';

  private emitProgress(progress: SyncProgress) {
    const stageChanged = progress.stage !== this.lastEmittedStage;
    const percentageDiff = Math.abs(progress.percentage - this.lastEmittedPercentage);

    // Chỉ gửi khi:
    // - Stage thay đổi
    // - Hoặc % tăng ít nhất 1%
    if (stageChanged || percentageDiff >= 1) {
      this.progressSubject.next(progress);
      this.lastEmittedStage = progress.stage;
      this.lastEmittedPercentage = progress.percentage;
    }
  }
}