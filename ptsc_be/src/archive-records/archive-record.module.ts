import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchiveRecord } from './entities/archive-record.entity';
import { ArchiveRecordItem } from './entities/archive-record-item.entity';
import { ArchiveRecordService } from './archive-record.service';
import { ArchiveRecordController } from './archive-record.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RecordDocumentEntity } from 'src/record-catalog/entities/record-document.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { ConfigModule } from '@nestjs/config';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { NotificationModule } from 'src/notifycation/notification.module';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { UsersModule } from 'src/users/users.module';
import { CommentsModule } from 'src/comments/comments.module';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { ArchiveRecordItemFile } from './entities/archive-record-item-flie.entity';
import { RecordExploitationArchiveRecord } from 'src/record-exploitation/entities/record-exploitation-archive-record.entity';
import { DocumentsModule } from 'src/documents/documents.module';
import { ArchiveAccessLog } from './entities/archive-access-logs.entity';
import { ArchiveRecordPermissionService } from './archive-record-permission.service';
import { ArchiveRecordPermissionGuard } from './guard/archive-record.guard';
import { RecordCatalogModule } from 'src/record-catalog/record-catalog.module';
import { DestroyRecordsModule } from 'src/destroy-record/destroy-records.module';

@Module({

  imports: [
    ConfigModule.forRoot(),
    forwardRef(() => BpmnModule),
    forwardRef(() => BpmnVersionModule),
    AuthorityDocumentsModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => NotificationModule),
    ConfigurationModule,
    FilesManagementModule,
    UsersModule,
    CommentsModule,
    DatabaseModule, // ← cung cấp SQLSVRepository & MSSQLRepository
    forwardRef(() => DocumentsModule),
    forwardRef(() => RecordCatalogModule),
    DestroyRecordsModule,
    TypeOrmModule.forFeature(
      [
        ArchiveRecord, ArchiveRecordItem, RecordDocumentEntity, GroupUserEntity,
        AgencyEntity, FeatureManagementEntity, RoleFeatureEntity, CrmSourceEntity,
        OrganizationUnitEntity, UserEntity, ArchiveRecordItemFile, RecordExploitationArchiveRecord,ArchiveAccessLog
      ], 'mssqlConnection',
    ),
  ],
  controllers: [ArchiveRecordController],
  providers: [MSSQLRepository, ArchiveRecordService, ArchiveRecordPermissionService, ArchiveRecordPermissionGuard],
  exports: [ArchiveRecordService, ArchiveRecordPermissionService],
})
export class ArchiveRecordModule { }
