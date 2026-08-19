import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { ProjectRolePermissionEntity } from './entities/project-permission.entity';
import { ProjectDisbursementEntity } from './entities/project-disbursement.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { TaskEntity } from 'src/task/entity/task.entity';
import { TaskUserEntity } from 'src/task/entity/task-user.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { ModuleRef } from '@nestjs/core';
import { SystemLogTaskSqlModule } from 'src/task/dto/system-log-service-sql.module';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { CrmSourceDataEntity } from 'src/crmsource/entities/crmsource-data.entity';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationModule } from 'src/notifycation/notification.module';
import { ProcessTemplateEntity } from 'src/process-template/entities/process-template.entity';
import { ProcessTemplateTaskEntity } from 'src/process-template/entities/process-template-task.entity';
import { TaskModule } from '../task/task.module';

import { ProjectCron } from './cron/project.cron';
import { BpmnRoleGuard } from 'src/oauth/bpmn-role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        ProjectEntity,
        ProjectMemberEntity,
        ProjectRolePermissionEntity,
        ProjectDisbursementEntity,
        UserEntity,
        CrmSourceEntity,
        CrmSourceDataEntity,
        TaskEntity,
        TaskUserEntity,
        ProcessTemplateEntity,
        ProcessTemplateTaskEntity,
      ],
      'mssqlConnection',
    ),
    SystemLogTaskSqlModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => BpmnModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => TaskModule),
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectCron, BpmnRoleGuard],
  exports: [ProjectService],
})
export class ProjectModule implements OnModuleInit {
  constructor(
    private readonly projectService: ProjectService,
    private readonly moduleRef: ModuleRef,
  ) { }

  async onModuleInit() {
    // Sử dụng process.nextTick để đảm bảo tất cả module đã được khởi tạo
    process.nextTick(() => {
      try {
        // Dynamic require để tránh circular dependency tại compile time
        const { DataExportService } = require('../data-export/data-export.service');
        const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
        if (dataExportService) {
          dataExportService.registerService('project', this.projectService);
        }
      } catch (error: any) {
        console.warn('[ProjectModule] DataExportService not available:', error.message);
      }
    });
  }
}
