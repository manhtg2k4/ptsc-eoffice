import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackSuggestionsService } from './feedback-suggestions.service';
import { FeedbackSuggestionsReportService } from './feedback-suggestions-report.service';
import { FeedbackSuggestionsController } from './feedback-suggestions.controller';
import { FeedbackSuggestionsReportController } from './feedback-suggestions-report.controller';
import { FeedbackSuggestionEntity } from './entities/feedback-suggestion.entity';
import { FeedbackHistoryEntity } from './entities/feedback-history.entity';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { Audit } from '../database/schema-sql/audit.entity';

import { SystemLogSqlModule } from '../systemLogManagement/system-log.module';
import { NotificationModule } from '../notifycation/notification.module';
import { FeatureManagementModule } from '../feature-management/feature-management.module';
import { BpmnModule } from '../bpmn/bpmn.module';
import { DatabaseModule } from '../database/database.module';
import { GroupUsersModule } from '../group-users/group-users.module';
import { FilesManagementModule } from '../files-managerment/files-management.module';
import { CrmsourceModule } from '../crmsource/crmsource.module';

import { ModuleRef } from '@nestjs/core';
import { FeedbackPermissionService } from './feedback-permission.service';
import { FeedbackPermissionGuard } from './guards/feedback-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [FeedbackSuggestionEntity, FeedbackHistoryEntity, UserEntity, OrganizationUnitEntity, WorkItemEntity, Audit],
      'mssqlConnection',
    ),
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => FeatureManagementModule),
    forwardRef(() => BpmnModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => GroupUsersModule),
    forwardRef(() => FilesManagementModule),
    CrmsourceModule,
  ],
  controllers: [FeedbackSuggestionsController, FeedbackSuggestionsReportController],
  providers: [
    FeedbackSuggestionsService, 
    FeedbackSuggestionsReportService,
    FeedbackPermissionService,
    FeedbackPermissionGuard,
  ],
  exports: [FeedbackSuggestionsService, FeedbackSuggestionsReportService, FeedbackPermissionService],
})
export class FeedbackSuggestionsModule {
  constructor(
    private readonly feedbackSuggestionsService: FeedbackSuggestionsService,
    private readonly feedbackSuggestionsReportService: FeedbackSuggestionsReportService,
    private readonly moduleRef: ModuleRef,
  ) { }

  async onModuleInit() {
    process.nextTick(() => {
      try {
        const { DataExportService } = require('../data-export/data-export.service');
        const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
        if (dataExportService) {
          dataExportService.registerService('feedback-suggestions', this.feedbackSuggestionsService);
          dataExportService.registerService('feedback-suggestions-report', this.feedbackSuggestionsReportService);
        }
      } catch (error: any) {
        console.warn('[FeedbackSuggestionsModule] DataExportService not available:', error.message);
      }
    });
  }
}
