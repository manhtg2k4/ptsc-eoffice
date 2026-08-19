import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { NewsCalendarEntity } from './entities/news-calendar.entity';
import { CreateNewsCalendarDto } from './dto/create-news-calendar.dto';
import { UpdateNewsCalendarDto } from './dto/update-news-calendar.dto';
import { NotificationService } from '../notifycation/notification.service';
import { NotificationType, NotificationKey } from 'src/notifycation/notification.enum';
import { UsersService } from '../users/users.service';
import { CronExpression } from '@nestjs/schedule';
import { SafeCron } from 'src/database/safe-cron.decorator';

@Injectable()
export class NewsCalendarService implements OnModuleInit {
  onModuleInit() {
  }
  constructor(
    @InjectRepository(NewsCalendarEntity, 'mssqlConnection')
    private readonly newsCalendarRepository: Repository<NewsCalendarEntity>,
    private readonly notificationService: NotificationService,
    private readonly usersService: UsersService,
  ) {
  }

  private parseTaggedUsers(text: string): string[] {
    if (!text) return [];

    return text
      .split(/\s+/)          // tách theo 1 hoặc nhiều space
      .map(part => part.trim())
      .filter(part => part.startsWith('@'))
      .map(part => part.slice(1));
  }


  private async sendTagNotifications(event: NewsCalendarEntity, usernames: string[], message?: string, senderId?: string) {
    const content = message || `Bạn đã được tag vào một sự kiện lịch mới: "${event.title}"`;
    try {
      for (const username of usernames) {
        const user = await this.usersService.findOneByUsername(username);
        if (user) {
          await this.notificationService.create({
            content,
            recipientId: user.id,
            senderId: senderId || 'SYSTEM',
            key: NotificationKey.NEWS_CALENDAR_TAG,
            recordId: event.id.toString(),
            link: `/news-calendar/${event.id}`,
            time: new Date(),
            type: NotificationType.EVENT_INVITATION.value,
          });
        }
      }
    } catch (e) {
      console.error('Error in sendTagNotifications:', e);
    }
  }

  async create(createNewsCalendarDto: CreateNewsCalendarDto, user?: any): Promise<NewsCalendarEntity> {
    try {
      const calendarEvent = this.newsCalendarRepository.create({
        ...createNewsCalendarDto,
        createdBy: user?.userId,
        createdByName: user?.username,
      });
      const savedEvent = (await this.newsCalendarRepository.save(calendarEvent)) as NewsCalendarEntity;

      // Xử lý gửi thông báo cho người được tag
      const taggedUsernames = this.parseTaggedUsers(createNewsCalendarDto.participants || '');
      if (taggedUsernames.length > 0) {
        await this.sendTagNotifications(savedEvent, taggedUsernames, undefined, user?.userId);
      }

      return savedEvent;
    } catch (error) {
      console.error('Error in NewsCalendarService.create:', error);
      throw new InternalServerErrorException('Có lỗi xảy ra khi tạo sự kiện lịch');
    }
  }

  private normalizeFilterParams(query: any) {
    const { filter, type, startDate, endDate, keyword, ...rest } = query;
    let normalizedType = filter?.type || type;
    if (typeof normalizedType === 'string' && normalizedType.startsWith('[') && normalizedType.endsWith(']')) {
      try {
        normalizedType = JSON.parse(normalizedType);
      } catch (e) {
        console.warn('Failed to parse type as JSON array:', normalizedType);
      }
    }

    return {
      ...rest,
      type: normalizedType,
      startDate: filter?.startDate || startDate,
      endDate: filter?.endDate || endDate,
      keyword: filter?.keyword || filter?.q || keyword,
      title: filter?.title,
      isUpcoming: filter?.isUpcoming || query.isUpcoming,
    };
  }

  async findAll(query: any): Promise<{ items: NewsCalendarEntity[]; total: number; page: number; limit: number }> {
    try {
      const normalizedQuery = this.normalizeFilterParams(query);
      const page = Math.max(1, parseInt(normalizedQuery.page) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(normalizedQuery.limit) || 10));
      const skip = (page - 1) * limit;

      const { startDate, endDate, type, keyword, title, isImportant, isUpcoming } = normalizedQuery;

      const queryBuilder = this.newsCalendarRepository
        .createQueryBuilder('nc')
        .where('nc.status = :status', { status: 1 }) // Chỉ lấy bản ghi đang hoạt động
        .orderBy('nc.startTime', 'ASC');

      if (isImportant !== undefined) {
        // Xử lý cả trường hợp gửi string 'true'/'false' từ query params
        const important = isImportant === 'true' || isImportant === true;
        queryBuilder.andWhere('nc.isImportant = :isImportant', { isImportant: important });
      }

      if (isUpcoming === 'true' || isUpcoming === true) {
        queryBuilder.andWhere('nc.startTime >= :now', { now: new Date() });
      }

      if (type) {
        if (Array.isArray(type) && type.length > 0) {
          queryBuilder.andWhere('nc.type IN (:...type)', { type });
        } else if (typeof type === 'string' && type.includes(',')) {
          const typeArray = type.split(',').map(t => t.trim()).filter(Boolean);
          if (typeArray.length > 0) {
            queryBuilder.andWhere('nc.type IN (:...typeArray)', { typeArray });
          }
        } else {
          queryBuilder.andWhere('nc.type COLLATE Latin1_General_CI_AI LIKE :type', {
            type: `%${type}%`,
          });
        }
      }

      if (keyword) {
        queryBuilder.andWhere(
          '(nc.title COLLATE Latin1_General_CI_AI LIKE :keyword OR nc.description COLLATE Latin1_General_CI_AI LIKE :keyword OR nc.location COLLATE Latin1_General_CI_AI LIKE :keyword OR nc.participants COLLATE Latin1_General_CI_AI LIKE :keyword)',
          { keyword: `%${keyword}%` },
        );
      }

      if (title) {
        queryBuilder.andWhere('nc.title COLLATE Latin1_General_CI_AI LIKE :title', {
          title: `%${title}%`,
        });
      }

      // Lọc theo khoảng thời gian
      if (startDate) {
        queryBuilder.andWhere('nc.startTime >= :startDate', { startDate: new Date(startDate) });
      }

      if (endDate) {
        queryBuilder.andWhere('nc.endTime <= :endDate', { endDate: new Date(endDate) });
      }

      // Áp dụng limit nếu được truyền lên hoặc khi lọc isUpcoming
      if (query.limit || isUpcoming === 'true' || isUpcoming === true) {
        queryBuilder.skip(skip).take(limit);
      }

      const [items, total] = await queryBuilder.getManyAndCount();

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error in NewsCalendarService.findAll:', error);
      throw new InternalServerErrorException('Có lỗi xảy ra khi lấy danh sách sự kiện lịch');
    }
  }

  async findOne(id: number): Promise<NewsCalendarEntity> {
    try {
      const event = await this.newsCalendarRepository.findOne({
        where: { id, status: 1 } // Chỉ lấy bản ghi đang hoạt động
      });
      if (!event) {
        throw new NotFoundException(`Không tìm thấy sự kiện với ID: ${id} hoặc sự kiện đã bị xóa`);
      }
      return event;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error in NewsCalendarService.findOne:', error);
      throw new InternalServerErrorException('Có lỗi xảy ra khi lấy chi tiết sự kiện lịch');
    }
  }

  async update(id: number, updateNewsCalendarDto: UpdateNewsCalendarDto, user?: any): Promise<NewsCalendarEntity> {
    try {
      const event = await this.findOne(id);

      const oldTaggedUsernames = this.parseTaggedUsers(event.participants || '');
      const newTaggedUsernames = this.parseTaggedUsers(updateNewsCalendarDto.participants || '');

      const updatedEvent = Object.assign(event, updateNewsCalendarDto);
      const savedEvent = (await this.newsCalendarRepository.save(updatedEvent)) as NewsCalendarEntity;

      // Chỉ gửi thông báo cho những người mới được tag thêm
      const incrementalTaggedUsers = newTaggedUsernames.filter(u => !oldTaggedUsernames.includes(u));
      if (incrementalTaggedUsers.length > 0) {
        await this.sendTagNotifications(savedEvent, incrementalTaggedUsers, undefined, user?.userId);
      }

      return savedEvent;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error in NewsCalendarService.update:', error);
      throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật sự kiện lịch');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const event = await this.findOne(id);
      // Xóa mềm: chuyển trạng thái sang 3
      event.status = 3;
      await this.newsCalendarRepository.save(event);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error in NewsCalendarService.remove:', error);
      throw new InternalServerErrorException('Có lỗi xảy ra khi xóa sự kiện lịch');
    }
  }

  async removeMany(ids: number[]): Promise<{ message: string; deletedCount: number }> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('Danh sách ID không được để trống');
      }

      const result = await this.newsCalendarRepository
        .createQueryBuilder()
        .update(NewsCalendarEntity)
        .set({ status: 3 })
        .where('id IN (:...ids)', { ids })
        .andWhere('status != 3')
        .execute();

      return {
        message: 'Xóa nhiều sự kiện lịch thành công',
        deletedCount: result.affected || 0,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error in NewsCalendarService.removeMany:', error);
      throw new InternalServerErrorException('Có lỗi xảy ra khi xóa nhiều sự kiện lịch');
    }
  }

  /**
   * Cron Job chạy mỗi phút dssmột lần để kiểm tra sự kiện sắp kết thúc (1-2 ngày tới)
   */
  @SafeCron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleUpcomingEventNotifications() {
    try {

      const now = new Date();
      const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      // Tìm các sự kiện đang hoạt động (status=1) và có endTime trong vòng 2 ngày tới (tính từ hiện tại)
      const upcomingEvents = await this.newsCalendarRepository.find({
        where: {
          status: 1,
          endTime: Between(now, inTwoDays),
        },
      });


      for (const event of upcomingEvents) {
        if (event.participants) {
          const taggedUsernames = this.parseTaggedUsers(event.participants);
          if (taggedUsernames.length > 0) {
            const message = `Sự kiện "${event.title}" sắp đến ngày kết thúc vào ngày ${event.endTime.toLocaleDateString('vi-VN')}. Hãy chú ý!`;
            await this.sendTagNotifications(event, taggedUsernames, message, 'SYSTEM');
          }
        }
      }
    } catch (error) {
      console.error('Error in handleUpcomingEventNotifications cron job:', error);
    }
  }
}
