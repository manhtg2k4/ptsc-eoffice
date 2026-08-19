import { forwardRef, Module } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { WorkItemsController } from './work-items.controller';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { NotificationModule } from 'src/notifycation/notification.module';
import { DatabaseModule } from 'src/database/database.module';
import { AuthorityDocumentsModule } from 'src/authority-documents/authority-documents.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { CrmsourceModule } from 'src/crmsource/crmsource.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkItemEntity } from './entities/work-item.entity';
import { DocumentFollowModule } from 'src/notifycation/document-unfollows/document-unfollow.module';
import { OutgoingDocumentsModule } from 'src/outgoing-documents/outgoing-documents.module';
import { IntergrationSignatureModule } from 'src/Intergration-signature/intergration-signature.module';
import { MeetingEntity } from 'src/meeting/entities/meeting.entity';
import { MeetingUnitEntity } from 'src/meeting/entities/meeting-unit.entity';
import { MeetingParticipantEntity } from 'src/meeting/entities/meeting-participant.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    forwardRef(() => BpmnModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => DatabaseModule),
    AuthorityDocumentsModule,
    CrmsourceModule, // Import để sử dụng CrmSourcesService
    DocumentFollowModule, // Import để sử dụng DocumentFollowService
    forwardRef(() => DocumentsModule), // Import to use UserLogHelper
    forwardRef(() => SystemLogSqlModule), // Import to use SystemLogManagementService
    TypeOrmModule.forFeature([
      WorkItemEntity,
      MeetingEntity,
      MeetingUnitEntity,
      MeetingParticipantEntity,
      UserEntity,
    ], 'mssqlConnection'),
    forwardRef(() => OutgoingDocumentsModule), // Import để sử dụng OutgoingDocumentsService
    forwardRef(() => IntergrationSignatureModule),
  ],
  controllers: [WorkItemsController],
  providers: [WorkItemsService],
  exports: [WorkItemsService],
})
export class WorkItemsModule { }
