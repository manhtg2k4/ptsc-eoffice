import { forwardRef, Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
// import { UserModule } from 'src/user/user.module';
import { UserLogHelper } from './helpers/user-log.helper';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { DatabaseModule } from 'src/database/database.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { MenuManagerEntity } from 'src/menu-manager/entities/menu-manager.entity';
import { TableConfigEntity } from 'src/table-config/table-config.entity';
import { CommonSourceEntity } from 'src/common-source/common-source.entity';
import { AuthorityDocumentEntity } from 'src/authority-documents';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { OutgoingDocumentsModule } from 'src/outgoing-documents/outgoing-documents.module';
import { IncomingModule } from './incomming-document/incoming.module';
import { UsersModule } from 'src/users/users.module';
import { TaskModule } from 'src/task/task.module'
import { MeetingRoomModule } from 'src/meeting-rooms/meeting-rooms.module';
import { AmenitiesModule } from 'src/meeting-room-amenities/amenities.module';
import { MeetingModule } from 'src/meeting/meeting.module';
import { MeetingScheduleModule } from 'src/meeting-schedule/meeting-schedule.module';
import { NewsModule } from 'src/news/news.module';
import { TopicModule } from 'src/topic/topic.module';
import { AlbumImagesModule } from 'src/album-images/album-images.module';
import { VideosModule } from 'src/videos/videos.module';
import { LeadershipDutyScheduleModule } from 'src/leadership-duty-schedule/leadership-duty-schedule.module';
import { TravelWorkScheduleModule } from 'src/travel-work-schedules/travel-work-schedules.module';
import { ProjectModule } from 'src/project/project.module';
import { ProcessTemplateModule } from 'src/process-template/process-template.module';
import { AuthorityModule } from 'src/authority-process/authority-process.module';
import { DestroyRecordsModule } from 'src/destroy-record/destroy-records.module';
import { RecordExploitationModule } from 'src/record-exploitation/record-exploitation.module';
import { ArchiveRecordModule } from 'src/archive-records/archive-record.module';
import { PassportsModule } from 'src/passports/passports.module';
import { FeedbackSuggestionsModule } from 'src/feedback-suggestions/feedback-suggestions.module';
import { PassportRequestsModule } from 'src/passport-requests/passport-requests.module';
import { ListCarsModule } from 'src/list-cars/list-cars.module';
import { ListDriversModule } from 'src/list-drivers/list-drivers.module';
import { VehicleRegistrationModule } from 'src/vehicle-registration/vehicle-registration.module';
import { BookDocumentsModule } from 'src/book-documents/book-documents.module';
import { RecordExploitationEntity } from 'src/record-exploitation/entities/record-exploitation.entity';
import { MeetingEntity } from 'src/meeting/entities/meeting.entity';
import { NotificationModule } from 'src/notifycation/notification.module';
import { FilesViewPermissionGuard } from "../files-managerment/guards/files-view-permission.guard";
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { WorkItemsModule } from 'src/work-items/work-items.module';

@Module({
  imports: [
    DatabaseModule,
    BpmnModule,
    AuthorityDocumentsModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => UsersModule),
    TaskModule,
    IncomingModule,
    forwardRef(() => WorkItemsModule),
    forwardRef(() => OutgoingDocumentsModule),
    forwardRef(() => NotificationModule),
    MeetingRoomModule,
    AmenitiesModule,
    MeetingModule,
    MeetingScheduleModule,
    forwardRef(() => NewsModule),
    TopicModule,
    AlbumImagesModule,
    VideosModule,
    LeadershipDutyScheduleModule,
    TravelWorkScheduleModule,
    ProjectModule,
    ProcessTemplateModule,
    AuthorityModule,
    FilesManagementModule,
    forwardRef(() => DestroyRecordsModule),
    forwardRef(() => RecordExploitationModule),
    forwardRef(() => ArchiveRecordModule),
    forwardRef(() => PassportsModule),
    forwardRef(() => FeedbackSuggestionsModule),
    forwardRef(() => PassportRequestsModule),
    forwardRef(() => ListCarsModule),
    forwardRef(() => ListDriversModule),
    forwardRef(() => VehicleRegistrationModule),
    forwardRef(() => BookDocumentsModule),
    TypeOrmModule.forFeature([
      FeatureManagementEntity, UserEntity, RoleFeatureEntity, MenuManagerEntity,
      TableConfigEntity, CommonSourceEntity, OrganizationUnitEntity,
      AuthorityDocumentEntity, RecordExploitationEntity, MeetingEntity
    ], 'mssqlConnection'),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, UserLogHelper, FilesViewPermissionGuard],
  exports: [DocumentsService, UserLogHelper],
})
export class DocumentsModule { }
