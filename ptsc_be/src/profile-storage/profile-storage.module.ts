import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileStorageController } from './profile-storage.controller';
import { ProfileStorageService } from './profile-storage.service';
import { StorageBatchEntity } from './entities/storage-batch.entity';
import { SourceStorageEntity } from './entities/source-storage.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    TypeOrmModule.forFeature(
      [StorageBatchEntity, SourceStorageEntity, Audit],
      'mssqlConnection', // BẮT BUỘC CHỈ RÕ CONNECTION NAME
    ),
  ],
  controllers: [ProfileStorageController],
  providers: [ProfileStorageService],
  exports: [ProfileStorageService],
})
export class ProfileStorageModule {}
