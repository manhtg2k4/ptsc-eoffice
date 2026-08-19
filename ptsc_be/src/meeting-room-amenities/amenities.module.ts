import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/database/database.module';
import { AmenitiesController } from './amenities.controller';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { AmenitiesService } from './amenities.service';
import { AmenitiesRepository } from './amenities.repository';
import { AmenitiesQueryBuilder } from './helpers/amenities-query.builder';
import { AmenitiesMapper } from './helpers/amenities.mapper';
import { MeetingRoomAmenityEntity } from 'src/meeting-rooms/entities/meeting-rooms-amenities.entity';
import { AmenitiesEntity } from './entities/amenities.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { AmenitiesPermissionGuard } from './guard/amenities-permission.guard';
import { AmenitiesPermissionService } from './amenities-permission.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    forwardRef(() => SystemLogSqlModule),
    AuthorityDocumentsModule,
    ConfigurationModule,
    forwardRef(() => DatabaseModule),
    forwardRef(() => BpmnModule),
    BpmnVersionModule,
    UsersModule,
    TypeOrmModule.forFeature(
      [
        OrganizationUnitEntity,
        CrmSourceEntity,
        RoleFeatureEntity,
        FeatureManagementEntity,
        AgencyEntity,
        AmenitiesEntity,
        MeetingRoomAmenityEntity,
        BpmnDesignEntity,
        FeatureManagementEntity,
        UserEntity,
      ],
      'mssqlConnection',
    ),
  ],
  controllers: [AmenitiesController],
  providers: [
    MSSQLRepository,
    AmenitiesService,
    AmenitiesRepository,
    AmenitiesQueryBuilder,
    AmenitiesMapper,
    AmenitiesPermissionGuard,
    AmenitiesPermissionService
  ],
  exports: [AmenitiesService, AmenitiesPermissionService],
})
export class AmenitiesModule {}