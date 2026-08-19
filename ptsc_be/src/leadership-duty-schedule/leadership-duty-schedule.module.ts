import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadershipDutyScheduleController } from './leadership-duty-schedule.controller';
import { LeadershipDutyScheduleService } from './leadership-duty-schedule.service';
import {
  LeadershipDutyScheduleRepository,
  LeadershipDutyDetailRepository,
} from './leadership-duty-schedule.repository';
import {
  LeadershipDutySchedule,
  LeadershipDutyDetail,
} from './entity/leadership-duty-schedule.entity';
import { LeadershipDutyScheduleQueryBuilder } from './helper/leadership-duty-schedule.query-builder';
import { LeadershipDutyScheduleMapper } from './helper/leadership-duty-schedule.mapper';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { DatabaseModule } from 'src/database/database.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { TravelWorkScheduleEntity } from 'src/travel-work-schedules/entity/travel-work-schedules.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { LeadershipDutySchedulesPermissionService } from './leadership-duty-schedules-permission.service';
import { LeadershipDutySchedulesPermissionGuard } from './guard/leadership-duty-schedules-permission.guard';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    forwardRef(() => BpmnModule),
    forwardRef(() => BpmnVersionModule),
    
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([
      LeadershipDutySchedule,
      LeadershipDutyDetail,
      FeatureManagementEntity,
      TravelWorkScheduleEntity,
      UserEntity,
      
      AgencyEntity,RoleFeatureEntity,
      CrmSourceEntity,OrganizationUnitEntity, 
      ListRoleEntity
    ], 'mssqlConnection'),
    forwardRef(() => SystemLogSqlModule),
    ConfigurationModule,
    DatabaseModule,
  ],
  controllers: [LeadershipDutyScheduleController],
  providers: [
    MSSQLRepository,
    LeadershipDutyScheduleService,
    LeadershipDutyScheduleRepository,
    LeadershipDutyDetailRepository,
    LeadershipDutyScheduleQueryBuilder,
    LeadershipDutyScheduleMapper,
    LeadershipDutySchedulesPermissionService,
    LeadershipDutySchedulesPermissionGuard
  ],
  exports: [
    LeadershipDutyScheduleService,
    LeadershipDutyScheduleRepository,
    LeadershipDutyDetailRepository,
  ],
})
export class LeadershipDutyScheduleModule {}