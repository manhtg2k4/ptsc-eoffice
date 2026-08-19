// src/files-management/files-management.module.ts

import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
// import { UserEntity } from 'src/users/entities/user.entity';
import { FilesManagementController } from './files-management.controller';
import { FilesManagementService } from './files-management-mssql.service';
import { NotificationModule } from 'src/notifycation/notification.module';
import { AuthModule } from 'src/auth-sso/auth-sso.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './file.entity';
import { FileRelationEntity } from './file-relation.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { FilesRepository } from './repositories/files.repository';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { WorkItemsModule } from 'src/work-items/work-items.module';
import { SystemLogTaskSqlModule } from 'src/task/dto/system-log-service-sql.module';
import { UsersModule } from 'src/users/users.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { WopiTokenService } from 'src/wopi/wopi-token.service';
import { MinioConfigModule } from 'src/utils/config-minio.util';

@Module({
  imports: [
    MinioConfigModule,
    forwardRef(() => DatabaseModule),
    // MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TypeOrmModule.forFeature([FileEntity, FileRelationEntity, UserEntity], 'mssqlConnection'),
    NotificationModule, // Import NotificationModule
    AuthModule, // Thêm AuthModule để cung cấp JwtService
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => WorkItemsModule),
    SystemLogTaskSqlModule,
    forwardRef(() => UsersModule),
    AuthorityDocumentsModule,
  ],
  controllers: [FilesManagementController],
  providers: [FilesManagementService, FilesRepository, WopiTokenService],
  exports: [FilesManagementService, FilesRepository]
})
export class FilesManagementModule { }
