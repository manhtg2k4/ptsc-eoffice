import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlbumImagesService } from './album-images.service';
import { AlbumImagesController } from './album-images.controller';
import { AlbumImageEntity } from './entities/album-image.entity';
import { AlbumLike } from './entities/album-like.entity';
import { DatabaseModule } from '../database/database.module';
import { FilesManagementModule } from '../files-managerment/files-management.module';
import { TopicEntity } from '../topic/entities/topic.entity';
import { AlbumGateway } from './album.gateway';
import { OauthModule } from '../oauth/oauth.module';
import { UserEntity } from 'src/users/entities/user.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { UsersModule } from 'src/users/users.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlbumImageEntity, TopicEntity, AlbumLike, UserEntity], 'mssqlConnection'),
    OauthModule,
    forwardRef(() => DatabaseModule), // ← cung cấp SQLSVRepository để lấy thông tin user
    forwardRef(() => FilesManagementModule), // ← cung cấp FilesManagementService để lưu metadata vào bảng files
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => UsersModule),
    AuthorityDocumentsModule,
  ],
  controllers: [AlbumImagesController],
  providers: [AlbumImagesService, AlbumGateway],
  exports: [AlbumImagesService],
})
export class AlbumImagesModule { }
