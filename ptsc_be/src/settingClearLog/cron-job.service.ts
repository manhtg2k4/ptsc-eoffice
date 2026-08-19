import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { SafeCron } from 'src/database/safe-cron.decorator';
import { SystemSettingClearLog } from 'src/settingClearLog/setting-log.entity';
import { LessThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemLogEntity } from 'src/systemLogManagement/system-log.entity';

@Injectable()
export class CronService {
  constructor(
    @InjectRepository(SystemLogEntity, 'mssqlConnection')
    private readonly systemLogRepo: Repository<SystemLogEntity>,

    @InjectRepository(SystemSettingClearLog, 'mssqlConnection')
    private readonly settingClearLogRepo: Repository<SystemSettingClearLog>,
  ) {}
  private readonly logger = new Logger(CronService.name);

  /**
   * Cron job này sẽ chạy vào lúc 2:00 sáng mỗi ngày.
   * Cron Expression: '0 2 * * *'
   * - 0: Phút thứ 0
   * - 2: 2 giờ sáng
   * - *: Mỗi ngày trong tháng
   * - *: Mỗi tháng
   * - *: Mỗi ngày trong tuần
   *
   * Bạn cũng có thể dùng CronExpression.EVERY_DAY_AT_2AM cho dễ đọc.
   */
    @SafeCron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'Asia/Ho_Chi_Minh' })
  // @Cron('*/1 * * * *')
  async handleCron() {

    const setting = await this.settingClearLogRepo.findOneBy({});
    if (!setting) {
      this.logger.warn('Không tìm thấy cài đặt dọn dẹp log. Bỏ qua.');
      return;
    }

    const { timeSave, autoClean } = setting;

    try {
      if (autoClean) {
        await this.systemLogRepo.clear();
      } else if (timeSave > 0) {
        const now = new Date();
        const deleteBeforeDate = new Date(
          now.getTime() - timeSave * 24 * 60 * 60 * 1000,
        );
        await this.systemLogRepo.delete({
          timestamp: LessThan(deleteBeforeDate),
        });
      } else {
      }
    } catch (error) {
      this.logger.error(
        'Lỗi trong quá trình chạy cron job dọn dẹp log:',
        error.stack,
      );
    }
  }
}
