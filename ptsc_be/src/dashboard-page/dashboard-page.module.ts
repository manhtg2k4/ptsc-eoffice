import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardPageController } from './dashboard-page.controller';
import { DashboardPageNormalService } from './dashboard-page-normal.service';
import { DashboardPageMediumService } from './dashboard-page-medium.service';
import { DashboardPagePremiumService } from './dashboard-page-premium.service';
import { DashboardPageCacheService } from './dashboard-page-cache.service';
import { BpmnModule } from '../bpmn/bpmn.module';
import { DatabaseModule } from '../database/database.module';
import { Audit } from '../database/schema-sql/audit.entity';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { MeetingModule } from '../meeting/meeting.module';
import { UsersModule } from '../users/users.module';
import { TaskModule } from '../task/task.module';
import { BullModule } from '@nestjs/bull';
import { DashboardCacheProcessor } from './dashboard-page-cache.processor';
import { ConfigurationModule } from '../view-config/configuration.module';

@Module({
  imports: [
    BpmnModule,
    DatabaseModule,
    MeetingModule,
    UsersModule,
    TaskModule,
    ConfigurationModule,
    TypeOrmModule.forFeature([Audit, WorkItemEntity], 'mssqlConnection'),
    BullModule.registerQueue({
      name: 'dashboard-cache',
    }),
  ],
  controllers: [DashboardPageController],
  providers: [
    DashboardPageNormalService,
    DashboardPageMediumService,
    DashboardPagePremiumService,
    DashboardPageCacheService,
    DashboardCacheProcessor,
  ],
})
export class DashboardPageModule { }

