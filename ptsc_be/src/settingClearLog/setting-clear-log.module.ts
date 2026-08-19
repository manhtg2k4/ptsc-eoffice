// src/settingClearLog/setting-clear-log.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingClearLogController } from './update-setting-log.controller';
import { SettingClearLogService } from './update-setting-log.service';
import { SystemSettingClearLog } from './setting-log.entity';
import { CronService } from 'src/settingClearLog/cron-job.service';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';

@Module({
  imports: [
    SystemLogSqlModule,
    TypeOrmModule.forFeature([SystemSettingClearLog], 'mssqlConnection'),
  ],
  controllers: [SettingClearLogController],
  providers: [SettingClearLogService, CronService],
  exports: [
    TypeOrmModule, // THÊM DÒNG NÀY luôn cho chắc
    SettingClearLogService,
    CronService,
  ],
})
export class SettingClearLogModule {}
