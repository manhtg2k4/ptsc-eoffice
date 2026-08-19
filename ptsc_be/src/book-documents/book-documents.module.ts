import { Module, forwardRef } from '@nestjs/common';
import { BookDocumentsService } from './book-documents.service';
import { BookDocumentsController } from './book-documents.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookDocumentEntity } from './entities/book-document.entity';
import { DocumentNumberReservationEntity } from './entities/document-number-reservation.entity';
import { ReservationSubscriberEntity } from './entities/reservation-subscriber.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { UserEntity } from '../users/entities/user.entity';
import { DocumentsModule } from 'src/documents/documents.module';
import { DataExportModule } from 'src/data-export/data-export.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { UsersModule } from 'src/users/users.module';
import { BookDocumentPermissionService } from './book-document-permission.service';
import { BookDocumentGuard } from './guards/book-document-guard';
import { GroupUsersModule } from 'src/group-users/group-users.module';
import { DocumentNumberReservationController } from './document-number-reservation.controller';
import { DocumentNumberReservationService } from './document-number-reservation.service';

import { OutgoingDocumentEntity } from '../outgoing-documents/entities/outgoing-document.entity';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => DocumentsModule),
    forwardRef(() => SystemLogSqlModule),
    TypeOrmModule.forFeature(
      [
        BookDocumentEntity,
        UserEntity,
        DocumentNumberReservationEntity,
        ReservationSubscriberEntity,
        OutgoingDocumentEntity,
      ],
      'mssqlConnection',
    ),
    DataExportModule,
    AuthorityDocumentsModule,
    UsersModule,
    forwardRef(() => GroupUsersModule),
  ],
  controllers: [BookDocumentsController, DocumentNumberReservationController],
  providers: [
    BookDocumentsService,
    BookDocumentPermissionService,
    BookDocumentGuard,
    DocumentNumberReservationService,
  ],
  exports: [BookDocumentsService, DocumentNumberReservationService],
})
export class BookDocumentsModule {}