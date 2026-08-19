// src/task-document-link/task-document-link.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskDocumentLinkService } from './task-document-link.service';
import { TaskDocumentLinkController } from './task-document-link.controller';
import { TaskDocumentLinkEntity } from './entities/task-document-link.entity';
import { OauthModule } from '../oauth/oauth.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { DatabaseModule } from 'src/database/database.module';

import { TaskModule } from 'src/task/task.module';
import { TaskDocumentLinkPermissionService } from './task-document-link-permission.service';
import { TaskDocumentLinkPermissionGuard } from './guards/task-document-link-permission.guard';
import { TaskEntity } from 'src/task/entity/task.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { SystemLogTaskSqlModule } from 'src/task/dto/system-log-service-sql.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [TaskDocumentLinkEntity, TaskEntity, UserEntity],
      'mssqlConnection',
    ),
    OauthModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => TaskModule),
    SystemLogTaskSqlModule,
  ],
  controllers: [TaskDocumentLinkController],
  providers: [
    TaskDocumentLinkService,
    TaskDocumentLinkPermissionService,
    TaskDocumentLinkPermissionGuard,
  ],
  exports: [TaskDocumentLinkService, TaskDocumentLinkPermissionService],
})
export class TaskDocumentLinkModule {}
