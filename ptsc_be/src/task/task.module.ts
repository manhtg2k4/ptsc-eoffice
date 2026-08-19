import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskEntity } from './entity/task.entity';
import { TaskUserEntity } from './entity/task-user.entity';
import { GroupUserEntity } from '../group-users/entities/group-users.entity';
// import { SystemLogTaskModule } from './dto/system-log.module';
import { SystemLogTaskSqlModule } from './dto/system-log-service-sql.module';
import { TaskCron } from './cron/task.cron';
import { TaskReminderService } from './task-reminder/task-reminder.service';
import { TaskNotificationEntity } from './entity/task-noti.entity';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { DatabaseModule } from 'src/database/database.module';
import { TaskRecurringConfigEntity } from './entity/task-recurring-config.entity';
import { SystemLogEntity } from 'src/systemLogManagement/system-log.entity';
import { FilesRepository } from '../files-managerment/repositories/files.repository';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { TaskRepository } from './repositories/task.repository';
import { TaskRecurringConfigRepository } from './repositories/recurring-config.repository';
import { NotificationModule } from 'src/notifycation/notification.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { DataExportModule, DataExportService } from 'src/data-export';
import { ModuleRef } from '@nestjs/core';
import { MailModule } from 'src/mail/mail.module';
import { ProjectModule } from '../project/project.module';
import { ConfigurationModule } from '../view-config/configuration.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { ProcessTemplateEntity } from '../process-template/entities/process-template.entity';
import { TaskDocumentLinkEntity } from 'src/task-document-link/entities/task-document-link.entity';

import { TaskReportService } from './task-report.service';
import { TaskReportController } from './task-report.controller';
import { TaskReportRepository } from './repositories/task-report.repository';
import { TaskPermissionService } from './task-permission.service';
import { TaskPermissionGuard } from './guards/task-permission.guard';
import { TaskAssignmentConfigEntity } from './entity/task-assignment-config.entity';
import { TaskAssignmentConfigService } from './task-assignment-config.service';
import { TaskAssignmentConfigController } from './task-assignment-config.controller';
import { TaskDelegationEntity } from './entity/task-delegation.entity';
import { TaskDelegationService } from './task-delegation.service';
import { TaskDelegationController } from './task-delegation.controller';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [TaskEntity, TaskUserEntity, TaskNotificationEntity, SystemLogEntity, GroupUserEntity, TaskRecurringConfigEntity, ProcessTemplateEntity, TaskAssignmentConfigEntity, TaskDelegationEntity, UserEntity, OrganizationUnitEntity, TaskDocumentLinkEntity],
      'mssqlConnection',
    ),
    SystemLogTaskSqlModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => BpmnModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => NotificationModule),
    AuthorityDocumentsModule,
    forwardRef(() => DataExportModule),
    MailModule,
    forwardRef(() => ProjectModule),
    ConfigurationModule,
    forwardRef(() => DocumentsModule),
    CacheModule.register(),
  ],
  controllers: [TaskController, TaskReportController, TaskAssignmentConfigController, TaskDelegationController],
  providers: [
    TaskService,
    TaskCron,
    TaskReminderService,
    FilesRepository,
    TaskRepository,
    TaskRecurringConfigRepository,
    TaskReportService,
    TaskReportRepository,
    TaskPermissionService,
    TaskPermissionGuard,
    TaskAssignmentConfigService,
    TaskDelegationService,
  ],
  exports: [TaskService, TaskPermissionService, TaskAssignmentConfigService, TaskDelegationService, TaskRecurringConfigRepository],
})
export class TaskModule implements OnModuleInit {
  constructor(
    private readonly taskService: TaskService,
    private readonly moduleRef: ModuleRef,
  ) { }

  async onModuleInit() {
    try {
      // Lazy get DataExportService từ ModuleRef
      const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
      if (dataExportService) {
        // Đăng ký service
        dataExportService.registerService('tasks', this.taskService);
        dataExportService.registerService('task-report', this.moduleRef.get(TaskReportService, { strict: false }));
        dataExportService.registerService('task-delegation', this.moduleRef.get(TaskDelegationService, { strict: false }));
      } else {
        console.warn('[IncomingModule] DataExportService not available');
      }
    } catch (error) {
      console.error('[IncomingModule] Failed to register to DataExportService:', error);
    }
  }
}