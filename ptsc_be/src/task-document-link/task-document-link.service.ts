// src/task-document-link/task-document-link.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { TaskDocumentLinkEntity } from './entities/task-document-link.entity';
import { CreateTaskDocumentLinkDto } from './dto/create-task-document-link.dto';
import { UpdateTaskDocumentLinkDto } from './dto/update-task-document-link.dto';
import { TaskRepository } from 'src/task/repositories/task.repository';
import { TaskRecurringConfigRepository } from 'src/task/repositories/recurring-config.repository';
import { TaskRecurringConfigEntity } from 'src/task/entity/task-recurring-config.entity';

@Injectable()
export class TaskDocumentLinkService {
  constructor(
    @InjectRepository(TaskDocumentLinkEntity, 'mssqlConnection')
    private readonly taskDocumentLinkRepository: Repository<TaskDocumentLinkEntity>,
    private readonly taskRecurringConfigRepository: TaskRecurringConfigRepository,
  ) {}

  /**
   * Thêm mới link tài liệu cho công việc
   */
  async create(
    dto: CreateTaskDocumentLinkDto,
    userId: string,
    userName?: string,
  ): Promise<TaskDocumentLinkEntity | TaskDocumentLinkEntity[]> {
    const configIdSet = new Set<number>();
    if (dto.taskId) {
      const jsonConfigs = await this.taskRecurringConfigRepository
        .createQueryBuilder('config')
        .select('config.id')
        .where("JSON_VALUE(config.task_data, '$.taskId') = :taskIdStr", { taskIdStr: String(dto.taskId) })
        .getMany();

      jsonConfigs.forEach((c) => configIdSet.add(c.id));
    }

    const recurringConfigIds = Array.from(configIdSet);

    if (recurringConfigIds.length > 0) {
      const listNew: TaskDocumentLinkEntity[] = [];
      
      const mainEntity = new TaskDocumentLinkEntity();
      mainEntity.objectType = dto.objectType ?? '';
      mainEntity.documentName = dto.documentName;
      mainEntity.documentUrl = dto.documentUrl;
      mainEntity.description = dto.description ?? '';
      mainEntity.createdById = userId;
      mainEntity.createdByName = userName ?? '';
      mainEntity.taskId = dto.taskId;
      listNew.push(mainEntity);

      for (let i = 0; i < recurringConfigIds.length; i++) {
        const recEntity = new TaskDocumentLinkEntity();
        recEntity.objectType = dto.objectType ?? '';
        recEntity.documentName = dto.documentName;
        recEntity.documentUrl = dto.documentUrl;
        recEntity.description = dto.description ?? '';
        recEntity.createdById = userId;
        recEntity.createdByName = userName ?? '';
        recEntity.taskId = String(recurringConfigIds[i]);
        listNew.push(recEntity);
      }
      return await this.taskDocumentLinkRepository.save(listNew);
    } else {
      const entity = new TaskDocumentLinkEntity();
      entity.taskId = dto.taskId;
      entity.objectType = dto.objectType ?? '';
      entity.documentName = dto.documentName;
      entity.documentUrl = dto.documentUrl;
      entity.description = dto.description ?? '';
      entity.createdById = userId;
      entity.createdByName = userName ?? '';
      return await this.taskDocumentLinkRepository.save(entity);
    }
  }

  /**
   * Lấy danh sách link tài liệu theo công việc
   */
  async findByTaskId(
    taskId: string,
    page: number = 1,
    limit: number = 50,
    objectType?: string,
    currentUserId?: string,
  ): Promise<{ data: (TaskDocumentLinkEntity & { isCreator: boolean })[]; total: number; page: number; limit: number }> {
    const where: FindOptionsWhere<TaskDocumentLinkEntity> = { taskId };
    
    let hasAccess = false;
    const numericTaskId = Number(taskId);
    if (currentUserId && !isNaN(numericTaskId)) {
      hasAccess = await this.checkTaskOrProjectAccess(numericTaskId, currentUserId);
    }

    if (currentUserId && !hasAccess) {
      where.createdById = currentUserId;
    }

    if (objectType) {
      where.objectType = objectType;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [data, total] = await this.taskDocumentLinkRepository.findAndCount({
      where,
      relations: ['creator'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    const mappedData = data.map((item) => {
      const isCreator = currentUserId ? item.createdById === currentUserId : false;
      return {
        id: item.id,
        taskId: item.taskId,
        objectType: item.objectType,
        documentName: item.documentName,
        documentUrl: item.documentUrl,
        description: item.description,
        createdById: item.createdById,
        createdByName: item.creator?.name || item.createdByName || '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isCreator,
      };
    });

    return { data: mappedData, total, page, limit };
  }

  /**
   * Lấy chi tiết link tài liệu theo ID
   */
  async findOne(id: number): Promise<TaskDocumentLinkEntity> {
    const entity = await this.taskDocumentLinkRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!entity) {
      throw new NotFoundException(`Không tìm thấy link tài liệu với ID ${id}.`);
    }

    const { creator, ...result } = entity;
    return {
      ...result,
      createdByName: creator?.name || entity.createdByName || '',
    };
  }

  /**
   * Cập nhật link tài liệu
   */
  async update(
    id: number,
    dto: UpdateTaskDocumentLinkDto,
  ): Promise<TaskDocumentLinkEntity> {
    const entity = await this.findOne(id);

    if (dto.documentName !== undefined) entity.documentName = dto.documentName;
    if (dto.documentUrl !== undefined) entity.documentUrl = dto.documentUrl;
    if (dto.description !== undefined) entity.description = dto.description;
    if (dto.objectType !== undefined) entity.objectType = dto.objectType;

    return await this.taskDocumentLinkRepository.save(entity);
  }

  /**
   * Xóa link tài liệu khỏi công việc
   */
  async remove(id: number): Promise<{ status: number; message: string }> {
    const entity = await this.findOne(id);
    await this.taskDocumentLinkRepository.remove(entity);

    return {
      status: 1,
      message: 'Xóa link tài liệu thành công.',
    };
  }

  /**
   * Xóa nhiều link tài liệu cùng lúc
   */
  async removeMany(ids: number[]): Promise<{ status: number; message: string; deletedCount: number }> {
    const entities = await this.taskDocumentLinkRepository.findBy({ id: In(ids) });

    if (entities.length === 0) {
      throw new NotFoundException('Không tìm thấy link tài liệu nào để xóa.');
    }

    await this.taskDocumentLinkRepository.remove(entities);

    return {
      status: 1,
      message: `Đã xóa ${entities.length} link tài liệu thành công.`,
      deletedCount: entities.length,
    };
  }

  /**
   * Kiểm tra quyền truy cập dự án hoặc công việc (bao gồm các thành viên trong công việc)
   */
  private async checkTaskOrProjectAccess(taskId: number, userId: string): Promise<boolean> {
    if (!taskId || !userId) return false;
    const query = `
      -- 1. Quyền trên dự án trực tiếp (nếu taskId là id project)
      SELECT TOP 1 1 as allow 
      FROM projects p 
      WHERE p.id = @0 AND p.createdBy = @1
      
      UNION ALL
      
      SELECT TOP 1 1 as allow 
      FROM project_members pm 
      WHERE pm.project_id = @0 AND pm.user_id = @1
      
      UNION ALL
      
      -- 2. Quyền trên dự án chứa công việc (nếu taskId là id task)
      SELECT TOP 1 1 as allow
      FROM task t
      INNER JOIN projects p ON t.project_id = p.id
      WHERE t.id = @0 AND p.createdBy = @1
      
      UNION ALL
      
      SELECT TOP 1 1 as allow
      FROM task t
      INNER JOIN project_members pm ON t.project_id = pm.project_id
      WHERE t.id = @0 AND pm.user_id = @1
      
      UNION ALL
      
      -- 3. Quyền của người tạo công việc (nếu taskId là id task)
      SELECT TOP 1 1 as allow
      FROM task t
      WHERE t.id = @0 AND t.created_by = @1
      
      UNION ALL
      
      -- 4. Quyền của thành viên trực tiếp trong task (task_users type = 1)
      SELECT TOP 1 1 as allow
      FROM task_users tu
      WHERE tu.task_id = @0 AND tu.process_id = @1 AND tu.type = 1
      
      UNION ALL
      
      -- 5. Quyền của thành viên qua phòng ban trong task (task_users type = 2)
      SELECT TOP 1 1 as allow
      FROM task_users tu
      INNER JOIN users u ON u.id = @1
      WHERE tu.task_id = @0 AND tu.process_id = u.parent AND tu.type = 2
    `;
    const result = await this.taskDocumentLinkRepository.query(query, [taskId, userId]);
    return result && result.length > 0;
  }
}
