import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { SafeCron } from 'src/database/safe-cron.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

import { TaskEntity } from '../entity/task.entity';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationType } from 'src/notifycation/notification.enum';

import { TaskUserRole } from '../entity/task.constants';

@Injectable()
export class TaskReminderService {
  private readonly logger = new Logger(TaskReminderService.name);
  private isJobRunning = false;

  constructor(
    @InjectRepository(TaskEntity, 'mssqlConnection')
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly notificationService: NotificationService,
  ) { }

  @SafeCron(CronExpression.EVERY_DAY_AT_2AM)
  async handleTaskReminder() {
    if (this.isJobRunning) return;
    this.isJobRunning = true;

    let sentCount = 0;

    try {
      const now = dayjs.utc();

      const tasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.taskUsers', 'taskUsers')
        .select([
          'task.id',
          'task.name',
          'task.endDate',
          'task.reminderTime',
          'taskUsers.processId',
          'taskUsers.type',
          'taskUsers.role',
        ])
        .where('task.status = :status', { status: 1 })
        .andWhere('task.endDate > GETUTCDATE()')
        .andWhere('task.reminderTime IS NOT NULL')
        .getMany();

      if (!tasks.length) return;

      for (const task of tasks) {
        const reminderHours = Number(
          typeof task.reminderTime === 'string'
            ? task.reminderTime.replace('h', '')
            : task.reminderTime,
        );

        if (isNaN(reminderHours)) continue;

        const endDate = dayjs.utc(task.endDate);
        if (now.isAfter(endDate)) continue;

        const remindAt = endDate.subtract(reminderHours, 'hour');
        if (now.isBefore(remindAt)) continue;

        const assignees = task.taskUsers.filter(u => u.type === 1);

        for (const u of assignees) {
          const existed =
            await this.notificationService.existsTaskReminder(
              u.processId,
              task.id.toString(),
            );

          if (existed) continue;

          const isViewer = u.role === TaskUserRole.VIEWER || u.role === 'viewer';
          const notiType: any = isViewer
            ? NotificationType.TASK_DUE_SOON_VIEWER.value
            : NotificationType.TASK_DUE_SOON_PROCESSOR.value;

          await this.notificationService.create({
            recipientId: u.processId,
            senderId: u.processId,
            title: `⏰ Công việc sắp hết hạn. Vào kiểm tra ngay.`,
            content: `Công việc: ${task.name}`,
            recordId: task.id.toString(),
            link: '', // Có thể bổ sung link nếu cần
            key: 'VIEW_TASK',
            type: notiType,
            time: new Date(),
            status: 1,
          });

          sentCount++;
        }
      }

    } catch (error) {
      this.logger.error('❌ TaskReminder cron error', error);
    } finally {
      this.isJobRunning = false;
    }
  }
}
