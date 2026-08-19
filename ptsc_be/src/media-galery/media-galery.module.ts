import { forwardRef, Module } from '@nestjs/common';
import { MediaGaleryService } from './media-galery.service';
import { MediaGaleryController } from './media-galery.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AlbumImageEntity } from 'src/album-images/entities/album-image.entity';
import { VideoEntity } from 'src/videos/entities/video.entity';
import { VideosModule } from 'src/videos/videos.module';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { AlbumLike } from 'src/album-images/entities/album-like.entity';
import { VideoLike } from 'src/videos/entities/video-like.entity';
import { MediaView } from './entities/media-view.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { MediaGaleryPermissionService } from './media-galery-permission.service';
import { MediaGaleryPermissionGuard } from './guards/media-galery-permission.guard';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from 'src/users/users.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';


@Module({
  imports: [
    TypeOrmModule.forFeature([AlbumImageEntity, VideoEntity, OrganizationUnitEntity, AlbumLike, VideoLike, MediaView], 'mssqlConnection'),
    VideosModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => UsersModule),
    AuthorityDocumentsModule,
  ],

  controllers: [MediaGaleryController],
  providers: [MediaGaleryService, MediaGaleryPermissionService, MediaGaleryPermissionGuard],
  exports: [MediaGaleryService, MediaGaleryPermissionService],

})
export class MediaGaleryModule { }
