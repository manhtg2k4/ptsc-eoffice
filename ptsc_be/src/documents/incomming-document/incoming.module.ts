import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { IncomingController } from './incoming.controller';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { DatabaseModule } from 'src/database/database.module'; // ← import DatabaseModule
import { TypeOrmModule } from '@nestjs/typeorm';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { UsersModule } from 'src/users/users.module';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UserEntity } from 'src/users/entities/user.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { Audit } from 'src/database/schema-sql/audit.entity';
import { DataExportModule, DataExportService } from 'src/data-export';
import { ModuleRef } from '@nestjs/core';
import { OrganizationUnitSqlModule } from 'src/organization-unit/organization-unit_sql/organization-unit-sql.module';
import { CrmsourceModule } from 'src/crmsource/crmsource.module';
import { IncomingService } from './incoming.service';
import { WorkItemsModule } from 'src/work-items/work-items.module';

import { IncomingDocumentReminderService } from './incoming-reminder.service';
import { GroupUsersModule } from 'src/group-users/group-users.module';
import { NotificationModule } from 'src/notifycation/notification.module';
import { TaskModule } from 'src/task/task.module';
import { OutgoingDocumentsModule } from 'src/outgoing-documents/outgoing-documents.module';
@Module({
  imports: [
    CacheModule.register({
      // Cấu hình Redis tại đây, ví dụ:
      // store: redisStore, host: 'localhost', port: 6379, ttl: 86400
    }), // Thêm CacheModule để sử dụng caching
    forwardRef(() => BpmnModule),
    forwardRef(() => BpmnVersionModule),
    AuthorityDocumentsModule,
    forwardRef(() => SystemLogSqlModule),
    ConfigurationModule,
    forwardRef(() => FilesManagementModule),
    forwardRef(() => DatabaseModule), // ← cung cấp SQLSVRepository & MSSQLRepository
    forwardRef(() => UsersModule),
    forwardRef(() => DataExportModule),
    OrganizationUnitSqlModule,
    CrmsourceModule,
    forwardRef(() => WorkItemsModule),
    forwardRef(() => GroupUsersModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => TaskModule),
    forwardRef(() => OutgoingDocumentsModule),
    TypeOrmModule.forFeature([BpmnDesignEntity, FeatureManagementEntity, OrganizationUnitEntity, UserEntity, RoleFeatureEntity, AgencyEntity, Audit], 'mssqlConnection'), // ← để tạo token mssqlConnection_BpmnDesignRepository
  ],
  controllers: [IncomingController],
  providers: [MSSQLRepository, IncomingService, IncomingDocumentReminderService],
  exports: [IncomingService],
})

export class IncomingModule implements OnModuleInit {
  constructor(
    private readonly incomingService: IncomingService,
    private readonly moduleRef: ModuleRef,
  ) { }

  async onModuleInit() {
    try {
      // Lazy get DataExportService từ ModuleRef
      const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
      if (dataExportService) {
        // Đăng ký service
        dataExportService.registerService('incoming', this.incomingService);
      } else {
        console.warn('[IncomingModule] DataExportService not available');
      }
    } catch (error) {
      console.error('[IncomingModule] Failed to register to DataExportService:', error);
    }
  }
}
