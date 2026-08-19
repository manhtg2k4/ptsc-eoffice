import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskFeatureEntity } from './task.feature.entity';
import { CreateTaskFeatureDto } from './dto/create-task-feature.dto';
import { UpdateTaskFeatureDto } from './dto/update-task-feature.dto';
import { Audit } from 'src/database/schema-sql/audit.entity';

@Injectable()
export class TaskFeatureService {
  constructor(
    @InjectRepository(TaskFeatureEntity, 'mssqlConnection')
    private readonly taskFeatureRepo: Repository<TaskFeatureEntity>,
    @InjectRepository(Audit, 'mssqlConnection')
    private readonly auditRepo: Repository<Audit>,

    @Inject('BPMN_RUNTIME')
    private readonly runtime: any,
  ) {}

  private async writeAuditLog(
    actionCode: string,
    action: string,
    documentId: string,
    details: Record<string, any>,
    user?: any,
  ) {
    const userId = user?.userId || user?.id || 'system-user';
    const displayName = user?.displayName || user?.name || userId;
    const now = new Date();

    await this.auditRepo.save({
      documentId: String(documentId),
      userId: String(userId),
      createdBy: String(userId),
      displayName: String(displayName),
      actionCode,
      action,
      details: JSON.stringify(details || {}),
      typeDocument: 'TASK_FEATURE',
      createdAt: now,
      updatedAt: now,
      time: now,
      stageStatus: actionCode,
      curStatusCode: actionCode,
    });
  }

  /* ================= CREATE ================= */
  async create(dto: CreateTaskFeatureDto, user?: any) {
    const entities = dto.tasks.map(task =>
      this.taskFeatureRepo.create({
        processId: dto.processId,
        taskId: task.taskId,
        taskName: task.taskName,
        featureCode: task.feature?.code ?? null,
      }),
    );

    const saved = await this.taskFeatureRepo.save(entities);

    for (const item of saved) {
      await this.writeAuditLog(
        'TAO_LOAI_CONG_VIEC',
        'Tạo loại công việc',
        item.id,
        {
          processId: item.processId,
          taskId: item.taskId,
          taskName: item.taskName,
          featureCode: item.featureCode,
        },
        user,
      );
    }

    return saved;
  }

  /* ================= FIND ALL ================= */
  async findAll() {
    return this.taskFeatureRepo.find();
  }

  /* ================= FIND ONE ================= */
  async findOne(id: string) {
    return this.taskFeatureRepo.findOneBy({ id });
  }

  /* ================= UPDATE ================= */
  async update(id: string, dto: UpdateTaskFeatureDto, user?: any) {
    const before = await this.findOne(id);
    await this.taskFeatureRepo.update(id, {
      taskName: dto.tasks?.[0]?.taskName,
      featureCode: dto.tasks?.[0]?.feature?.code,
    });

    const after = await this.findOne(id);
    if (after) {
      await this.writeAuditLog(
        'CAP_NHAT_LOAI_CONG_VIEC',
        'Cập nhật loại công việc',
        id,
        {
          before: before
            ? {
                processId: before.processId,
                taskId: before.taskId,
                taskName: before.taskName,
                featureCode: before.featureCode,
              }
            : null,
          after: {
            processId: after.processId,
            taskId: after.taskId,
            taskName: after.taskName,
            featureCode: after.featureCode,
          },
        },
        user,
      );
    }

    return after;
  }

  /* ================= FIND BY PROCESS ================= */
  async findByProcessId(processId: string) {
    return this.taskFeatureRepo.find({
      where: { processId },
      order: { createdAt: 'ASC' },
    });
  }

  /* ================= DELETE ================= */
  async remove(id: string, user?: any) {
    const before = await this.findOne(id);
    const result = await this.taskFeatureRepo.delete(id);

    if (before && result.affected) {
      await this.writeAuditLog(
        'XOA_LOAI_CONG_VIEC',
        'Xóa loại công việc',
        id,
        {
          processId: before.processId,
          taskId: before.taskId,
          taskName: before.taskName,
          featureCode: before.featureCode,
        },
        user,
      );
    }

    return result;
  }

  /* ================= FIND BY PROCESS + TASK ================= */
  async findByProcessIdAndTaskId(
    processId: string,
    taskId: string,
  ) {
    return this.taskFeatureRepo.findOne({
      where: { processId, taskId },
    });
  }

  /* ================= COUNT TASK (GIỮ NGUYÊN) ================= */
  async countTask(userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    try {
      return await this.runtime.repo.countTask(userId);
    } catch (error) {
      console.error('Error countIncoming: ', error);
      throw new Error('Không thể lấy số lượng hồ sơ công việc chưa xử lý');
    }
  }
}
