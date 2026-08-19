import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingService } from './meeting.service';
import { MeetingController } from './meeting.controller';

import { MeetingEntity } from './entities/meeting.entity';
import { MeetingUnitEntity } from './entities/meeting-unit.entity';
import { MeetingParticipantEntity } from './entities/meeting-participant.entity';
import { MeetingTaskEntity } from './entities/meeting-task.entity';
import { MeetingRecurrenceEntity } from './entities/meeting-recurrence.entity';
import { OnlineMeetingEntity } from './entities/online-meeting.entity';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { DatabaseModule } from 'src/database/database.module';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { UsersModule } from 'src/users/users.module';
import { MeetingRoomEntity } from 'src/meeting-rooms/entities/meeting-rooms.entity';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { WorkItemsModule } from 'src/work-items/work-items.module';
import { MeetingUnitSeatEntity } from './entities/meeting-unit-seats.entity';
import { MeetingMapper } from './helper/meeting.mapper';
import { CommentsModule } from 'src/comments/comments.module';
import { MeetingStatusCronService } from './cron/meeting.main.cron';
import { MeetingRoomModule } from 'src/meeting-rooms/meeting-rooms.module';
import { ServiceTaskModule } from 'src/service-task/service-task.module';
import { MeetingGuest } from './entities/meeting-guest.entity';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from 'src/notifycation/notification.module';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { ModuleRef } from '@nestjs/core';
import { DataExportService } from 'src/data-export';
import { MeetingPermissionGuard } from './guard/meeting-permission.guard';
import { MeetingPermissionService } from './meeting-permission.service';
import { TaskEntity } from 'src/task/entity/task.entity';
import { TravelWorkScheduleEntity } from 'src/travel-work-schedules/entity/travel-work-schedules.entity';
import { GoogleCalendarService } from './google-calendar-service';
import { GoogleCalendarSyncService } from './google-calendar-sync-service';
import { GoogleCalendarController } from './google-calendar-controller';
import { BackgroundGoogleCalendarSyncService } from './background-google-calendar-sync.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    forwardRef(() => BpmnModule),
    forwardRef(() => BpmnVersionModule),
    AuthorityDocumentsModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => ServiceTaskModule),
    forwardRef(() => NotificationModule),
    ConfigurationModule,
    FilesManagementModule,
    UsersModule,
    WorkItemsModule,
    CommentsModule,
    forwardRef(() => DatabaseModule), // ← cung cấp SQLSVRepository & MSSQLRepository
    MeetingRoomModule,
    TypeOrmModule.forFeature([
      MeetingEntity,
      MeetingUnitEntity,
      MeetingParticipantEntity,
      MeetingTaskEntity,
      MeetingRecurrenceEntity,
      OnlineMeetingEntity,
      UserEntity,
      OrganizationUnitEntity,
      CrmSourceEntity,
      RoleFeatureEntity,
      FeatureManagementEntity,
      MeetingRoomEntity,
      AgencyEntity,
      MeetingUnitSeatEntity,
      GroupUserEntity,
      MeetingGuest,
      TravelWorkScheduleEntity,
      ListRoleEntity,
      TaskEntity
    ], 'mssqlConnection'),
  ],
  controllers: [MeetingController, GoogleCalendarController],
  providers: [
    MSSQLRepository,
    MeetingService,
    MeetingMapper,
    MeetingStatusCronService,
    MeetingPermissionService,
    MeetingPermissionGuard,
    GoogleCalendarService,
    GoogleCalendarSyncService,
    BackgroundGoogleCalendarSyncService,
  ],
  exports: [MeetingService, MeetingPermissionService, GoogleCalendarService, GoogleCalendarSyncService, BackgroundGoogleCalendarSyncService],
})
export class MeetingModule implements OnModuleInit {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly moduleRef: ModuleRef,
  ) { }

  async onModuleInit() {
    try {
      // Lazy get DataExportService từ ModuleRef
      const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
      if (dataExportService) {
        // Đăng ký service
        dataExportService.registerService('meetings', this.meetingService);
      } else {
        console.warn('[IncomingModule] DataExportService not available');
      }
    } catch (error) {
      console.error('[IncomingModule] Failed to register to DataExportService:', error);
    }
  }
}