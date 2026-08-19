import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivesManagementController } from './archives-management.controller';
import { ArchivesManagementService } from './archives-management.service';
import { ArchivesEntity } from './entities/archives.entity';
import { ArchivesDocumentIndexEntity } from './entities/archives-document-index.entity';
import { SourceStorageEntity } from '../profile-storage/entities/source-storage.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [ArchivesEntity, ArchivesDocumentIndexEntity, SourceStorageEntity],
      'mssqlConnection',
    ),
  ],
  controllers: [ArchivesManagementController],
  providers: [ArchivesManagementService],
  exports: [ArchivesManagementService],
})
export class ArchivesManagementModule {}
