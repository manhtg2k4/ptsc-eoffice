import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { SafeCron } from 'src/database/safe-cron.decorator';
import { TaskService } from '../task.service';

@Injectable()
export class TaskCron {
  private readonly logger = new Logger(TaskCron.name);
  private isJobRunning = false;
  private isStartDateNotificationJobRunning = false;
  private isOverdueNotificationJobRunning = false;

  constructor(private readonly taskService: TaskService) { }

  @SafeCron(CronExpression.EVERY_DAY_AT_2AM)
  async handleRecurringTasks() {
    if (this.isJobRunning) {
      this.logger.warn('Cronjob đang chạy, bỏ qua lần này');
      return;
    }

    this.isJobRunning = true;
    try {
      await this.taskService.scanAndCreateRecurringTasks();
    } catch (error) {
      this.logger.error('Lỗi Cronjob quét công việc lặp lại:', error);
    } finally {
      this.isJobRunning = false;
    }
  }

  // @SafeCron('*/30 * * * * *')
  @SafeCron('0 0 6 * * *')
  async handleStartDateTaskNotifications() {
    if (this.isStartDateNotificationJobRunning) {
      this.logger.warn('Cronjob thông báo công việc bắt đầu trong ngày đang chạy, bỏ qua lần này');
      return;
    }

    this.isStartDateNotificationJobRunning = true;
    try {
      await this.taskService.sendStartDateTaskNotifications();
    } catch (error) {
      this.logger.error('Lỗi Cronjob thông báo công việc bắt đầu trong ngày:', error);
    } finally {
      this.isStartDateNotificationJobRunning = false;
    }
  }

  @SafeCron('0 0 8 20 * *')
  async handleOverdueTaskNotifications() {
    if (this.isOverdueNotificationJobRunning) {
      this.logger.warn('Cronjob thông báo công việc trễ hạn đang chạy, bỏ qua lần này');
      return;
    }

    this.isOverdueNotificationJobRunning = true;
    try {
      await this.taskService.sendOverdueTaskNotifications();
    } catch (error) {
      this.logger.error('Lỗi Cronjob thông báo công việc trễ hạn:', error);
    } finally {
      this.isOverdueNotificationJobRunning = false;
    }
  }
}
