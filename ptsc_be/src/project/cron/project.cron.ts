import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { SafeCron } from 'src/database/safe-cron.decorator';
import { ProjectService } from '../project.service';

@Injectable()
export class ProjectCron {
    private readonly logger = new Logger(ProjectCron.name);
    private isJobRunning = false;

    constructor(private readonly projectService: ProjectService) { }

    // Chạy hằng ngày lúc 2h sáng để quét và cập nhật trạng thái dự án
    @SafeCron(CronExpression.EVERY_DAY_AT_2AM)
    async handleProjectStatusUpdate() {
        if (this.isJobRunning) {
            this.logger.warn('⚠️ Cronjob cập nhật trạng thái dự án đang chạy, bỏ qua lần này');
            return;
        }

        this.isJobRunning = true;
        try {
            await this.projectService.scanAndUpdateProjectStatuses();
        } catch (error) {
            this.logger.error('❌ Lỗi Cronjob quét trạng thái dự án:', error);
        } finally {
            this.isJobRunning = false;
        }
    }
}
