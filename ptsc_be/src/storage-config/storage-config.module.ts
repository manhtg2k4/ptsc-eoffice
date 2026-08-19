import { Module } from '@nestjs/common';
import { StorageConfigService } from './storage-config.service';
import { StorageConfigController } from './storage-config.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageConfigEntity } from './storage-config.entity';
import { UsersModule } from 'src/users/users.module';
import { AuthorityDocumentsModule } from 'src/authority-documents/authority-documents.module';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([StorageConfigEntity, UserEntity], 'mssqlConnection'),
    UsersModule,
    AuthorityDocumentsModule,
  ],
  controllers: [StorageConfigController],
  providers: [StorageConfigService],
  exports: [StorageConfigService],
})
export class StorageConfigModule {}