import { forwardRef, Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'

import { RecordExploitationEntity } from 'src/record-exploitation/entities/record-exploitation.entity'
import { RecordExploitationArchiveRecord } from 'src/record-exploitation/entities/record-exploitation-archive-record.entity'
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity'
import { AgencyEntity } from 'src/orgationies/agencies.entity'
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity'
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity'
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity'
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity'
import { UserEntity } from 'src/users/entities/user.entity'

import { Audit } from 'src/database/schema-sql/audit.entity'
import { MSSQLRepository } from 'src/database/sqlRepo.mssql'

import { ListRoleEntity } from 'src/list-role/entities/list-role.entity'
import { ListDriverEntity } from 'src/list-drivers/entities/list-driver.entity'
import { ListCarEntity } from 'src/list-cars/entities/list-car.entity'

import { VehicleRegistrationEntity } from '../entities/vehicle-registration.entity'
import { VehicleRegistrationCron } from './cron-vehicle-rehistration'

import { BpmnModule } from 'src/bpmn/bpmn.module'
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module'
import { AuthorityDocumentsModule } from 'src/authority-documents'
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module'
import { NotificationModule } from 'src/notifycation/notification.module'
import { ConfigurationModule } from 'src/view-config/configuration.module'
import { FilesManagementModule } from 'src/files-managerment/files-management.module'
import { UsersModule } from 'src/users/users.module'
import { CommentsModule } from 'src/comments/comments.module'
import { DatabaseModule } from 'src/database/database.module'
import { CrmsourceModule } from 'src/crmsource/crmsource.module'
import { VehicleRegistrationService } from '../vehicle-registration.service'
import { VehicleRegistrationModule } from '../vehicle-registration.module'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),

    forwardRef(() => BpmnModule),
    forwardRef(() => BpmnVersionModule),
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => UsersModule),
    forwardRef(() => VehicleRegistrationModule),
    AuthorityDocumentsModule,
    ConfigurationModule,
    FilesManagementModule,
    CommentsModule,
    DatabaseModule,
    CrmsourceModule,

    TypeOrmModule.forFeature(
      [
        RecordExploitationEntity,
        GroupUserEntity,
        Audit,
        AgencyEntity,
        FeatureManagementEntity,
        RoleFeatureEntity,
        CrmSourceEntity,
        OrganizationUnitEntity,
        UserEntity,
        RecordExploitationArchiveRecord,
        VehicleRegistrationEntity,
        ListRoleEntity,
        ListDriverEntity,
        ListCarEntity
      ],
      'mssqlConnection'
    ),
  ],

  providers: [
    MSSQLRepository,
    VehicleRegistrationCron
  ],

  exports: [
    VehicleRegistrationCron
  ],
})
export class VehicleCronModule { }