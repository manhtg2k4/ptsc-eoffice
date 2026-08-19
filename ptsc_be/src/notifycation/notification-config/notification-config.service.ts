import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Raw } from 'typeorm';
import { NotificationConfigEntity } from './notification-config.entity';
import { EnumGroup, ModuleType, NotificationType } from '../notification.enum';
import { NotificationConfigResponseDto } from './dto/notification-config-response.dto';
import { UpdateNotificationConfigItemDto } from './dto/update-config-groups.dto';

@Injectable()
export class NotificationConfigService {
  constructor(
    @InjectRepository(NotificationConfigEntity, 'mssqlConnection')
    private readonly repo: Repository<NotificationConfigEntity>,
  ) { }

  private initializingUsers = new Set<string>();

  async checkAndInitDataForUser(userId: string): Promise<void> {
    if (!userId || this.initializingUsers.has(userId)) {
      return;
    }

    this.initializingUsers.add(userId);
    try {
      const existingConfigs = await this.repo.find({ where: { userId }, select: ['code'] });
      const typeKeys = Object.keys(NotificationType) as (keyof typeof NotificationType)[];

      if (existingConfigs.length >= typeKeys.length) {
        return;
      }

      const existingCodes = existingConfigs.map(c => c.code);
      const newConfigs: NotificationConfigEntity[] = [];

      for (const key of typeKeys) {
        const item = NotificationType[key];
        if (!existingCodes.includes(item.value)) {
          const newConfig = new NotificationConfigEntity();
          newConfig.userId = userId;
          newConfig.code = item.value;
          newConfig.name = item.name;
          newConfig.groups = item.defaultGroups ? [...item.defaultGroups] : [];

          // Xác định module dựa trên tiền tố của code
          if (item.value.startsWith('OUTGOING_DOC')) {
            newConfig.module = ModuleType.VIEW_OUTCOMING_DOC;
          } else if (item.value.startsWith('INCOMING_DOC')) {
            newConfig.module = ModuleType.VIEW_INCOMING_DOC;
          } else if (item.value.startsWith('TASK') || item.value.startsWith('PROJECT')
            || item.value.includes('ADDED_TO_NEW_TASK') || item.value.includes('ADDED_TO_NEW_PROJECT')
            || item.value.includes('REMOVED_FROM_TASK') || item.value.includes('REMOVED_FROM_PROJECT')
          ) {
            newConfig.module = ModuleType.VIEW_TASK;
          } else if (item.value.startsWith('MEETING')) {
            newConfig.module = ModuleType.VIEW_MEETING_ROOM;
          } else if (item.value.startsWith('PASSPORT') || item.value.startsWith('FEEDBACK') || item.value.startsWith('CAR_BOOKING')) {
            newConfig.module = ModuleType.VIEW_UTILITY;
          } else if (item.value.startsWith('NEWS') || item.value.startsWith('EVENT')) {
            newConfig.module = ModuleType.VIEW_NEWS;
          } else if (item.value.startsWith('ARCHIVE_RECORD')) {
            newConfig.module = ModuleType.VIEW_RECORD_EXPLOITATION;
          }
          newConfigs.push(newConfig);
        }
      }

      if (newConfigs.length > 0) {
        for (const config of newConfigs) {
          try {
            await this.repo.save(config);
          } catch {
            // Bỏ qua lỗi trùng UNIQUE key ('UQ_notifications_type_code_userId') do race condition gây ra khi nhiều request/socket kết nối đồng thời
          }
        }
        console.log(`[NotificationConfig] Đã tự động tạo/bổ sung cấu hình cho user: ${userId}`);
      }
    } catch (error) {
      console.error(`[NotificationConfig] Lỗi tự động tạo/bổ sung cấu hình cho user ${userId}:`, error);
    } finally {
      this.initializingUsers.delete(userId);
    }
  }

  async findEntityById(id: number, userId: string): Promise<NotificationConfigEntity> {
    const config = await this.repo.findOneBy({ id, userId });
    if (!config) {
      throw new NotFoundException(`NotificationConfig with ID ${id} for user ${userId} not found`);
    }
    return config;
  }

  async findById(id: number, userId: string): Promise<NotificationConfigResponseDto> {
    const config = await this.findEntityById(id, userId);
    return NotificationConfigResponseDto.fromEntity(config);
  }

  async findByCode(code: string, userId: string): Promise<NotificationConfigResponseDto> {
    const config = await this.repo.findOneBy({ code, userId });
    if (!config) {
      throw new NotFoundException(`NotificationConfig with code ${code} for user ${userId} not found`);
    }
    return NotificationConfigResponseDto.fromEntity(config);
  }

  async updateGroups(id: number, groups: EnumGroup[], userId: string): Promise<NotificationConfigResponseDto> {
    const config = await this.findEntityById(id, userId);
    config.groups = groups || [];
    const saved = await this.repo.save(config);
    return NotificationConfigResponseDto.fromEntity(saved);
  }

  async updateBulk(items: UpdateNotificationConfigItemDto[], userId: string): Promise<NotificationConfigResponseDto[]> {
    const promises = items.map(async (item) => {
      const config = await this.findEntityById(item.id, userId);
      config.groups = item.groups || [];
      const saved = await this.repo.save(config);
      return NotificationConfigResponseDto.fromEntity(saved);
    });
    return Promise.all(promises);
  }

  async paging(
    userId: string,
    page: number,
    limit: number,
    search?: string,
    module?: string,
    group?: string,
  ): Promise<{
    data: NotificationConfigResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    const where: FindOptionsWhere<NotificationConfigEntity> = { userId };
    if (search) {
      where.name = Raw(
        (alias) => `${alias} COLLATE SQL_Latin1_General_CP1_CI_AI LIKE :search`,
        { search: `%${search}%` }
      );
    }
    if (module) {
      where.module = module as ModuleType;
    }
    if (group) {
      where.groups = Raw(
        (alias) => `${alias} COLLATE SQL_Latin1_General_CP1_CI_AI LIKE :group`,
        { group: `%${group}%` }
      );
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      take,
      skip,
      order: {
        id: 'ASC',
      },
    });

    return {
      data: data.map((item) => NotificationConfigResponseDto.fromEntity(item)),
      total,
      page: page || 1,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async getByGroup(userId: string): Promise<{
    items: {
      groupCode: string;
      list: NotificationConfigResponseDto[];
    }[];
  }> {
    // Tự động gieo cấu hình mặc định cho user nếu chưa có
    await this.checkAndInitDataForUser(userId);

    const list = await this.repo.find({ where: { userId } });
    const processList: NotificationConfigResponseDto[] = [];
    const receiveList: NotificationConfigResponseDto[] = [];
    const ungroupedList: NotificationConfigResponseDto[] = [];

    for (const item of list) {
      if (item.groups && Array.isArray(item.groups)) {
        const dto = NotificationConfigResponseDto.fromEntity(item);
        if (item.groups.includes(EnumGroup.PROCESS)) {
          processList.push(dto);
        }
        if (item.groups.includes(EnumGroup.RECEIVE)) {
          receiveList.push(dto);
        }
        if (item.groups.includes(EnumGroup.UNGROUPED)) {
          ungroupedList.push(dto);
        }
      }
    }

    return {
      items: [
        {
          groupCode: EnumGroup.PROCESS,
          list: processList,
        },
        {
          groupCode: EnumGroup.RECEIVE,
          list: receiveList,
        },
        {
          groupCode: EnumGroup.UNGROUPED,
          list: ungroupedList,
        },
      ],
    };
  }
}
