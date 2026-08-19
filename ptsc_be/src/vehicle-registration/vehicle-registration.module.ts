import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { VehicleRegistrationController } from './vehicle-registration.controller';
import { VehicleRegistrationEntity } from './entities/vehicle-registration.entity';
import { CrmsourceModule } from '../crmsource/crmsource.module';
import { RecordExploitationEntity } from 'src/record-exploitation/entities/record-exploitation.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { RecordExploitationArchiveRecord } from 'src/record-exploitation/entities/record-exploitation-archive-record.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { NotificationModule } from 'src/notifycation/notification.module';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { UsersModule } from 'src/users/users.module';
import { CommentsModule } from 'src/comments/comments.module';
import { DatabaseModule } from 'src/database/database.module';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { Audit } from 'src/database/schema-sql/audit.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { ListDriverEntity } from 'src/list-drivers/entities/list-driver.entity';
import { ListCarEntity } from 'src/list-cars/entities/list-car.entity';
import { VehicleRegistrationCron } from './cron/cron-vehicle-rehistration';
import { VehicleRegistrationAssignmentEntity } from './entities/vehicle-registration-assignments.entity';
import { ModuleRef } from '@nestjs/core';
import { DataExportService } from 'src/data-export';
import { VehicleRegistrationPermissionService } from './vehicle-registration-permission.service';
import { VehicleRegistrationPermissionGuard } from './guards/vehicle-registration-permission.guard';
import { ResourceStatusSyncService } from './resource-status-sync.service';

@Module({
  imports: [
      ConfigModule.forRoot(),
      forwardRef(() => BpmnModule),
      forwardRef(() => BpmnVersionModule),
      AuthorityDocumentsModule,
      forwardRef(() => SystemLogSqlModule),
      forwardRef(() => NotificationModule),
      forwardRef(() => UsersModule),
      ConfigurationModule,
      FilesManagementModule,
      CommentsModule,
      DatabaseModule, // ← cung cấp SQLSVRepository & MSSQLRepository
    TypeOrmModule.forFeature(
      [
        RecordExploitationEntity,GroupUserEntity,Audit,
        AgencyEntity,FeatureManagementEntity,RoleFeatureEntity,
        CrmSourceEntity,OrganizationUnitEntity,UserEntity, 
        RecordExploitationArchiveRecord,VehicleRegistrationEntity,
        ListRoleEntity,ListDriverEntity,ListCarEntity,VehicleRegistrationAssignmentEntity
      ], 'mssqlConnection'),
    CrmsourceModule,
  ],
  controllers: [VehicleRegistrationController],
  providers: [MSSQLRepository, VehicleRegistrationService, VehicleRegistrationPermissionService, VehicleRegistrationPermissionGuard, ResourceStatusSyncService],
  exports: [VehicleRegistrationService, VehicleRegistrationPermissionService, ResourceStatusSyncService],
})

export class VehicleRegistrationModule implements OnModuleInit {
  constructor(
    private readonly vehicleRegistrationService: VehicleRegistrationService,
    private readonly moduleRef: ModuleRef,
  ) { }

  async onModuleInit() {
    try {
      // Lazy get DataExportService từ ModuleRef
      const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
      if (dataExportService) {
        // Đăng ký service
        dataExportService.registerService('vehicle-registration', this.vehicleRegistrationService);
      } else {
        console.warn('[IncomingModule] DataExportService not available');
      }
    } catch (error) {
      console.error('[IncomingModule] Failed to register to DataExportService:', error);
    }
  }
}
