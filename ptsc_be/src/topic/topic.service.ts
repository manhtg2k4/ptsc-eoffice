import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { TopicEntity } from './entities/topic.entity';
import { ListTopicDto } from './dto/list-topic.dto';

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(TopicEntity, 'mssqlConnection')
    private readonly topicRepo: Repository<TopicEntity>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
  ) { }

  async create(createTopicDto: CreateTopicDto) {
    // Check trùng href
    const existingTopic = await this.topicRepo.findOne({ where: { href: createTopicDto.href } });
    if (existingTopic) {
      throw new BadRequestException('Mã chủ đề đã tồn tại trong hệ thống');
    }

    // Nếu không có displayOrder, tự động gán vào vị trí cuối cùng
    if (createTopicDto.displayOrder === undefined || createTopicDto.displayOrder === null) {
      const { nextDisplayOrder } = await this.getNextDisplayOrder();
      createTopicDto.displayOrder = nextDisplayOrder;
    }

    const topic = this.topicRepo.create(createTopicDto as Partial<TopicEntity>);
    return await this.topicRepo.save(topic);
  }

  async findAll(userIdOrParams?: string | ListTopicDto, queryParams?: ListTopicDto) {
    // Handle both signatures: findAll(queryParams) and findAll(userId, queryParams)
    const params = typeof userIdOrParams === 'string' ? queryParams : userIdOrParams;

    const { page = 1, limit = 10, filter, isExport } = params || {};
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    // Ưu tiên lấy từ top-level params, nếu không có thì lấy từ object filter
    const searchName = params?.name || filter?.name;
    const filterStatus = params?.status !== undefined ? params.status : filter?.status;
    const searchHref = params?.href || filter?.href;
    const filterRequiresApproval = params?.requiresApproval !== undefined ? params.requiresApproval : filter?.requiresApproval;

    const qb = this.topicRepo.createQueryBuilder('topic');

    // Logic tìm kiếm theo name (không phân biệt hoa thường, loại bỏ khoảng trắng)
    if (searchName) {
      qb.andWhere('topic.name LIKE :name', { name: `%${String(searchName).trim()}%` });
    }

    if (searchHref) {
      qb.andWhere('topic.href LIKE :href', { href: `%${String(searchHref).trim()}%` });
    }

    if (filterRequiresApproval !== undefined && filterRequiresApproval !== null && String(filterRequiresApproval) !== '') {
      const isRequired = String(filterRequiresApproval).toLowerCase() === 'true';
      qb.andWhere('topic.requiresApproval = :requiresApproval', { requiresApproval: isRequired });
    }

    // Logic lọc theo status (hỗ trợ cả mảng và giá trị đơn lẻ)
    if (filterStatus !== undefined && filterStatus !== null && String(filterStatus) !== '') {
      if (Array.isArray(filterStatus)) {
        const statusNumbers = filterStatus.map(s => Number(s)).filter(s => !isNaN(s));
        if (statusNumbers.length > 0) {
          qb.andWhere('topic.status IN (:...status)', { status: statusNumbers });
        }
      } else {
        const sNum = Number(filterStatus);
        if (!isNaN(sNum)) {
          qb.andWhere('topic.status = :status', { status: sNum });
        }
      }
    }

    // Filter only active topics by default (Hoạt động = 1)
    // qb.andWhere('topic.status = :activeStatus', { activeStatus: 1 });

    const [data, total] = await qb
      .orderBy('topic.displayOrder', 'ASC')
      .addOrderBy('topic.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    // Format fields
    const formattedData = data.map(topic => {
      const statusConfig = this.getStatusConfig(topic.status);
      return {
        ...topic,
        requiresApproval: topic.requiresApproval ? 'Có' : 'Không',
        // displayOrder: 'Hoạt động',
        // Nếu isExport = true → trả về text thuần, ngược lại → HTML badge
        status: isExport === 'true' ? statusConfig.label : statusConfig.badge,
      };
    });

    return { data: formattedData, total, page: pageNum, limit: limitNum };
  }

  private getStatusConfig(statusValue: number) {
    const statusMap = {
      1: {
        label: 'Hoạt động',
        bg: '#D0FFDE',
        color: '#00BD39',
      },
      2: {
        label: 'Không hoạt động',
        bg: '#FFDCD9',
        color: '#F44336',
      },
    };

    const config = statusMap[statusValue] || { label: 'Không xác định', bg: '#ccc', color: '#666' };

    const badge = `<div style="width: 149px;text-align: center ;height: 30px; padding: 5px; border-radius: 15px; font-size: 0.875rem; width: 100%; background-color: ${config.bg}; color: ${config.color};">${config.label}</div>`;

    return {
      label: config.label,
      badge,
    };
  }

  async findOne(id: number | string) {
    const t = await this.topicRepo.findOne({ where: { id: String(id) } });
    if (!t) throw new NotFoundException('Không tìm thấy chủ đề');
    return t;
  }

  async getNextDisplayOrder() {
    const result = await this.topicRepo
      .createQueryBuilder('topic')
      .select('MAX(topic.displayOrder)', 'maxOrder')
      .getRawOne();

    const nextOrder = (result?.maxOrder ?? 0) + 1;

    return {
      nextDisplayOrder: nextOrder,
    };
  }

  async getAllDisplayOrders() {
    const topics = await this.topicRepo.find({
      select: ['id', 'name', 'displayOrder'],
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });

    return topics.map(topic => ({
      id: topic.id,
      name: topic.name,
      displayOrder: topic.displayOrder,
    }));
  }

  async update(id: number | string, updateTopicDto: UpdateTopicDto) {
    return this.dataSource.transaction(async (manager) => {
      const topicRepo = manager.getRepository(TopicEntity);
      const topic = await topicRepo.findOne({ where: { id: String(id) } });
      if (!topic) {
        throw new NotFoundException('Không tìm thấy chủ đề');
      }

      // Check trùng href (nếu updateTopicDto có href và khác với href hiện tại)
      if (updateTopicDto.href && updateTopicDto.href !== topic.href) {
        const existingTopic = await topicRepo.findOne({ where: { href: updateTopicDto.href } });
        if (existingTopic) {
          throw new BadRequestException('Mã chủ đề đã tồn tại trong hệ thống');
        }
      }

      const oldOrder = topic.displayOrder;
      const hasOrderChange =
        updateTopicDto.displayOrder !== undefined &&
        updateTopicDto.displayOrder !== null &&
        updateTopicDto.displayOrder !== oldOrder;

      if (hasOrderChange) {
        const newOrder = Number(updateTopicDto.displayOrder);

        if (!Number.isInteger(newOrder) || newOrder < 0) {
          throw new BadRequestException('Thứ tự hiển thị không hợp lệ');
        }

        if (oldOrder < newOrder) {
          // Kéo topic xuống dưới: dồn các topic giữa oldOrder và newOrder lên 1 bậc
          await topicRepo
            .createQueryBuilder()
            .update(TopicEntity)
            .set({ displayOrder: () => 'display_order - 1' })
            .where('id != :id', { id: String(id) })
            .andWhere('display_order > :oldOrder', { oldOrder })
            .andWhere('display_order <= :newOrder', { newOrder })
            .execute();
        } else {
          // Kéo topic lên trên: đẩy các topic từ newOrder đến oldOrder - 1 xuống 1 bậc
          await topicRepo
            .createQueryBuilder()
            .update(TopicEntity)
            .set({ displayOrder: () => 'display_order + 1' })
            .where('id != :id', { id: String(id) })
            .andWhere('display_order >= :newOrder', { newOrder })
            .andWhere('display_order < :oldOrder', { oldOrder })
            .execute();
        }

        topic.displayOrder = newOrder;
      }

      Object.assign(topic, updateTopicDto);
      if (hasOrderChange) {
        topic.displayOrder = Number(updateTopicDto.displayOrder);
      }
      return topicRepo.save(topic);
    });
  }

  async remove(id: string) {
    const topic = await this.findOne(id);
    const removedOrder = topic.displayOrder;

    await this.topicRepo.remove(topic);

    // Chỉ giảm displayOrder của những bản ghi thực sự đứng sau bản ghi vừa xóa
    if (removedOrder !== undefined && removedOrder !== null) {
      await this.topicRepo
        .createQueryBuilder()
        .update(TopicEntity)
        .set({ displayOrder: () => 'display_order - 1' })
        .where('display_order > :removedOrder', { removedOrder })
        .execute();
    }

    return { success: true };
  }

  async removeMany(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Danh sách ids không hợp lệ');
    }

    const topics = await this.topicRepo.find({ where: { id: In(ids) } });
    if (!topics || topics.length === 0) {
      throw new NotFoundException('Không tìm thấy chủ đề nào với các id đã cung cấp');
    }

    // Lấy danh sách các thứ tự bị xóa, sắp xếp giảm dần
    const deletedOrders = topics
      .map(t => t.displayOrder)
      .filter(o => o !== undefined && o !== null)
      .sort((a, b) => b - a);

    await this.topicRepo.remove(topics);

    // Duyệt qua từng vị trí bị xóa và dồn hàng lên (chỉ ảnh hưởng các bản ghi đứng sau vị trí đó)
    for (const order of deletedOrders) {
      await this.topicRepo
        .createQueryBuilder()
        .update(TopicEntity)
        .set({ displayOrder: () => 'display_order - 1' })
        .where('display_order > :order', { order })
        .execute();
    }

    return { success: true, deleted: topics.length };
  }
}
