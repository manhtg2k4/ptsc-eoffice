import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingScheduleController } from './meeting-schedule.controller';
import { MeetingScheduleService } from './meeting-schedule.service';
import { UserEntity } from '../users/entities/user.entity';
import { RoleFeatureEntity } from '../role-feature/role-feature-sql/role-feature.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { DatabaseModule } from '../database/database.module';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { MeetingPermissionService } from 'src/meeting/meeting-permission.service';
import { MeetingPermissionGuard } from 'src/meeting/guard/meeting-permission.guard';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { MeetingRoomEntity } from 'src/meeting-rooms/entities/meeting-rooms.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { MeetingEntity } from 'src/meeting/entities/meeting.entity';
import { MeetingModule } from 'src/meeting/meeting.module';

@Module({
  imports: [
    forwardRef(() => DatabaseModule),
    UsersModule,
    ConfigModule.forRoot(),
    forwardRef(() => MeetingModule),
    forwardRef(() => BpmnModule),
    forwardRef(() => BpmnVersionModule),
    TypeOrmModule.forFeature([UserEntity, RoleFeatureEntity, OrganizationUnitEntity, BpmnDesignEntity,
      MeetingEntity ,
      FeatureManagementEntity,
      MeetingRoomEntity,
      AgencyEntity,
    ], 'mssqlConnection'),
  ],
  controllers: [MeetingScheduleController],
  providers: [MSSQLRepository ,MeetingScheduleService,MeetingPermissionService, MeetingPermissionGuard ],
  exports: [MeetingScheduleService],
})
export class MeetingScheduleModule {}
