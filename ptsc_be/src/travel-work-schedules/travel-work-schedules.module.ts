import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TravelWorkSchedulesMapper } from './helper/travel-work-schedules.mapper';
import { TravelWorkScheduleEntity } from './entity/travel-work-schedules.entity';
import { TravelWorkSchedulesController } from './travel-work-schedules.controller';
import { TravelWorkSchedulesService } from './travel-work-schedules.service';
import { TravelWorkSchedulesRepository } from './travel-work-schedules.repository';
import { TravelWorkSchedulesQueryBuilder } from './helper/travel-work-schedules-query.builder';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { FeatureManagementModule } from 'src/feature-management/feature-management.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { DatabaseModule } from 'src/database/database.module';
import { MeetingService } from 'src/meeting/meeting.service';
import { MeetingEntity } from 'src/meeting/entities/meeting.entity';
import { LeadershipDutyDetail, LeadershipDutySchedule } from 'src/leadership-duty-schedule/entity/leadership-duty-schedule.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { TravelWorkSchedulePermissionGuard } from './guards/travel-work-schedule-permission.guard';
import { TravelWorkSchedulePermissionService } from './travel-work-schedule-permission.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';

/**
 * Module: Travel Work Schedules
 * Quản lý lịch công tác
 */
@Module({
  imports: [
    forwardRef(() => DatabaseModule),
    forwardRef(() => BpmnModule),
    BpmnVersionModule,
    UsersModule,
    TypeOrmModule.forFeature(
      [TravelWorkScheduleEntity, FeatureManagementEntity,MeetingEntity,LeadershipDutyDetail, LeadershipDutySchedule,
        
        OrganizationUnitEntity,
        CrmSourceEntity,
        RoleFeatureEntity,
        AgencyEntity,
        UserEntity,
      ],
      'mssqlConnection',
    ),
    DatabaseModule,
    ConfigurationModule,
    AuthorityDocumentsModule,
  ],
  controllers: [TravelWorkSchedulesController],
  providers: [
    MSSQLRepository,
    TravelWorkSchedulesService,
    TravelWorkSchedulesMapper,
    TravelWorkSchedulesQueryBuilder,
    TravelWorkSchedulesRepository,
    TravelWorkSchedulePermissionService,
    TravelWorkSchedulePermissionGuard
  ],
  exports: [TravelWorkSchedulesService, TravelWorkSchedulePermissionService],
})
export class TravelWorkScheduleModule {}
  