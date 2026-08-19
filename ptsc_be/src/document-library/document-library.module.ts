import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentLibraryService } from './document-library.service';
import { DocumentLibraryController } from './document-library.controller';
import { DocumentLibraryEntity } from './entities/document-library.entity';
import { GroupUsersModule } from '../group-users/group-users.module';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { DatabaseModule } from '../database/database.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [DocumentLibraryEntity, UserEntity, OrganizationUnitEntity, BpmnDesignEntity],
      'mssqlConnection'
    ),
    GroupUsersModule,
    forwardRef(() => SystemLogSqlModule),
    AuthorityDocumentsModule,
    forwardRef(() => DatabaseModule),
  ],
  controllers: [DocumentLibraryController],
  providers: [DocumentLibraryService],
  exports: [DocumentLibraryService],
})
export class DocumentLibraryModule {}