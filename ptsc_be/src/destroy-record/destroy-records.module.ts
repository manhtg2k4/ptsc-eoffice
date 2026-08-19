import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestroyRecordEntity } from './destroy-records.entity';
import { DestroyRecordsController } from './destroy-records.controller';
import { DestroyRecordsService } from './destroy-records.service';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { ArchivesEntity } from 'src/archives-management/entities/archives.entity';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { WorkItemsModule } from 'src/work-items/work-items.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationModule } from 'src/notifycation/notification.module';
import { UsersModule } from 'src/users/users.module';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Audit } from 'src/database/schema-sql/audit.entity';
import { forwardRef } from '@nestjs/common';
import { FeatureManagementModule } from 'src/feature-management/feature-management.module';
import { ArchiveRecord } from 'src/archive-records/entities/archive-record.entity';
import { ArchiveRecordItem } from 'src/archive-records/entities/archive-record-item.entity';
import { DestroyRecordPermissionGuard } from './guard/destroy-record-permission.guard';
import { DestroyRecordPermissionService } from './destroy-record-permission.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DestroyRecordEntity,
      ArchivesEntity,
      ArchiveRecord,
      ArchiveRecordItem,
      FeatureManagementEntity,
      OrganizationUnitEntity,
      CrmSourceEntity,
      RoleFeatureEntity,
      AgencyEntity,
      UserEntity,
      Audit
    ], 'mssqlConnection'),
    forwardRef(() => SystemLogSqlModule),
    BpmnModule,
    WorkItemsModule,
    AuthorityDocumentsModule,
    DatabaseModule,
    FeatureManagementModule,
    NotificationModule,
    forwardRef(() => UsersModule),
    FilesManagementModule,
    ConfigurationModule,
  ],
  controllers: [DestroyRecordsController],
  providers: [MSSQLRepository ,DestroyRecordsService, DestroyRecordPermissionGuard, DestroyRecordPermissionService],
  exports: [DestroyRecordsService, DestroyRecordPermissionService],
})
export class DestroyRecordsModule { }
