import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { OutgoingDocumentsService } from './outgoing-documents.service';
import { OutgoingDocumentsController } from './outgoing-documents.controller';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { DatabaseModule } from 'src/database/database.module'; // ← import DatabaseModule
import { TypeOrmModule } from '@nestjs/typeorm';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { OutgoingDocumentEntity } from './entities/outgoing-document.entity';
import { UsersModule } from 'src/users/users.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { PostStorageAiModule } from 'src/post-storage-ai/post-storage-ai.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { WorkItemsModule } from 'src/work-items/work-items.module';
import { DataExportModule, DataExportService } from 'src/data-export';
import { ModuleRef } from '@nestjs/core';
import { IncomingModule } from 'src/documents/incomming-document/incoming.module';
import { NotificationModule } from 'src/notifycation/notification.module';
import { BookDocumentEntity } from 'src/book-documents/entities/book-document.entity';
import { GroupUsersModule } from 'src/group-users/group-users.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    forwardRef(() => BpmnModule),
    BpmnVersionModule,
    forwardRef(() => FilesManagementModule),
    AuthorityDocumentsModule,
    forwardRef(() => SystemLogSqlModule),
    ConfigurationModule,
    forwardRef(() => UsersModule),
    forwardRef(() => DatabaseModule), // ← lấy SQLSVRepository và MSSQLRepository
    forwardRef(() => NotificationModule),
    forwardRef(() => GroupUsersModule),
    TypeOrmModule.forFeature([BpmnDesignEntity, BookDocumentEntity, FeatureManagementEntity, OutgoingDocumentEntity], 'mssqlConnection'), // ← cần để inject repository
    PostStorageAiModule,
    forwardRef(() => WorkItemsModule),
    forwardRef(() => DataExportModule),
    IncomingModule,
    RedisModule,
  ],
  controllers: [OutgoingDocumentsController],
  providers: [
    OutgoingDocumentsService,
  ],
  exports: [OutgoingDocumentsService],
})
export class OutgoingDocumentsModule implements OnModuleInit {
  constructor(
    private readonly outgoingService: OutgoingDocumentsService,
    private readonly moduleRef: ModuleRef,
  ) { }

  async onModuleInit() {
    try {
      // Lazy get DataExportService
      const dataExportService = this.moduleRef.get(DataExportService, { strict: false });

      if (dataExportService) {
        dataExportService.registerService('outgoing-documents', this.outgoingService);
      } else {
        console.warn('[OutgoingDocumentsModule] DataExportService not available');
      }
    } catch (error) {
      console.error('[OutgoingDocumentsModule] Failed to register:', error);
    }
  }
}
