import { Module, forwardRef } from '@nestjs/common';
import { GlobalCountService } from './global-count.service';
import { GlobalCountController } from './global-count.controller';
import { IncomingModule } from '../documents/incomming-document/incoming.module';
import { OutgoingDocumentsModule } from '../outgoing-documents/outgoing-documents.module';
import { NewsModule } from '../news/news.module';
import { MeetingModule } from '../meeting/meeting.module';
import { TaskModule } from '../task/task.module';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { DatabaseModule } from 'src/database/database.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    forwardRef(() => IncomingModule),
    forwardRef(() => OutgoingDocumentsModule),
    forwardRef(() => DocumentsModule),
    NewsModule,
    MeetingModule,
    TaskModule,
    UsersModule,
    TypeOrmModule.forFeature([FeatureManagementEntity], 'mssqlConnection'),
    DatabaseModule,
  ],
  controllers: [GlobalCountController],
  providers: [GlobalCountService],
  exports: [GlobalCountService],
})
export class GlobalCountModule {}
