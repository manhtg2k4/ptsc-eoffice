import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsCalendarEntity } from './entities/news-calendar.entity';
import { NewsCalendarController } from './news-calendar.controller';
import { NewsCalendarService } from './news-calendar.service';

import { NotificationModule } from '../notifycation/notification.module';
import { UsersModule } from '../users/users.module';

import { SystemLogSqlModule } from '../systemLogManagement/system-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsCalendarEntity], 'mssqlConnection'),
    NotificationModule,
    UsersModule,
    SystemLogSqlModule,
  ],
  controllers: [NewsCalendarController],
  providers: [NewsCalendarService],
  exports: [NewsCalendarService],
})
export class NewsCalendarModule { }
